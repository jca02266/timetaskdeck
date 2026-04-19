/**
 * Unit tests for useTaskStore session calculation guards.
 *
 * These tests verify that:
 * 1. Normal task flows (start, stop, complete, pause, resume) produce correct log entries.
 * 2. Stale tasks (startTime=0, status='paused') do NOT produce invalid log entries
 *    when operated on by any method.
 * 3. The settleStaleTasks action correctly handles day-boundary crossing.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTaskStore, Task, TaskLogEntry } from '@/store/useTaskStore';

// Mock localStorage for Zustand persist
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
    };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Helper: create a task object
function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: overrides.id ?? crypto.randomUUID(),
        name: overrides.name ?? 'Test Task',
        startTime: overrides.startTime ?? Date.now(),
        duration: overrides.duration ?? 0,
        status: overrides.status ?? 'pending',
        backlogId: overrides.backlogId ?? 'main',
        ...overrides,
    };
}

// Helper: set store state directly
function setState(partial: Record<string, unknown>) {
    useTaskStore.setState(partial);
}

// Helper: get store state
function getState() {
    return useTaskStore.getState();
}

describe('useTaskStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        localStorageMock.clear();
        useTaskStore.setState({
            currentTask: null,
            taskStack: [],
            backlogTasks: [],
            backlogCategories: [{ id: 'main', name: 'Main Backlog', allocatedMinutes: 0 }],
            history: [],
            recurringTasks: [],
            taskLog: [],
            dayStartHour: 5,
        });
    });

    // ===================================================================
    // Normal Flow Tests — Verify core functionality is not broken
    // ===================================================================

    describe('Normal flow: startTask', () => {
        it('should start a new task when no current task exists', () => {
            getState().startTask('Task A');
            const state = getState();
            expect(state.currentTask).not.toBeNull();
            expect(state.currentTask!.name).toBe('Task A');
            expect(state.currentTask!.status).toBe('pending');
            expect(state.currentTask!.startTime).toBeGreaterThan(0);
            expect(state.taskLog).toHaveLength(0);
        });

        it('should interrupt running task and push to stack when starting new task', () => {
            getState().startTask('Task A');
            const taskA = getState().currentTask!;
            const taskAStart = taskA.startTime;

            // Start a new task while Task A is running
            getState().startTask('Task B');
            const state = getState();

            expect(state.currentTask!.name).toBe('Task B');
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Task A');
            expect(state.taskStack[0].status).toBe('paused');

            // Should have created a log entry for the interrupted session
            expect(state.taskLog).toHaveLength(1);
            expect(state.taskLog[0].name).toBe('Task A');
            expect(state.taskLog[0].startTime).toBe(taskAStart);
            expect(state.taskLog[0].status).toBe('interrupted');
            expect(state.taskLog[0].duration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Normal flow: stopTask', () => {
        it('should stop current task and log its session', () => {
            getState().startTask('Task A');
            const startTime = getState().currentTask!.startTime;

            getState().stopTask();
            const state = getState();

            expect(state.currentTask).toBeNull();
            expect(state.backlogTasks).toHaveLength(1);
            expect(state.backlogTasks[0].name).toBe('Task A');
            expect(state.taskLog).toHaveLength(1);
            expect(state.taskLog[0].startTime).toBe(startTime);
        });
    });

    describe('Normal flow: completeTask', () => {
        it('should complete current task and log its session', () => {
            getState().startTask('Task A');
            const startTime = getState().currentTask!.startTime;

            getState().completeTask();
            const state = getState();

            expect(state.currentTask).toBeNull();
            expect(state.history).toHaveLength(1);
            expect(state.history[0].name).toBe('Task A');
            expect(state.taskLog).toHaveLength(1);
            expect(state.taskLog[0].startTime).toBe(startTime);
            expect(state.taskLog[0].status).toBe('completed');
        });
    });

    describe('Normal flow: togglePause', () => {
        it('should pause a running task and create log entry', () => {
            getState().startTask('Task A');
            const startTime = getState().currentTask!.startTime;

            getState().togglePause();
            const state = getState();

            expect(state.currentTask!.status).toBe('paused');
            expect(state.taskLog).toHaveLength(1);
            expect(state.taskLog[0].startTime).toBe(startTime);
            expect(state.taskLog[0].status).toBe('paused');
        });

        it('should resume a paused task with new startTime', () => {
            getState().startTask('Task A');
            getState().togglePause(); // pause

            const beforeResume = Date.now();
            getState().togglePause(); // resume
            const state = getState();

            expect(state.currentTask!.status).toBe('pending');
            expect(state.currentTask!.startTime).toBeGreaterThanOrEqual(beforeResume);
            // Log should still only have the pause entry
            expect(state.taskLog).toHaveLength(1);
        });
    });

    describe('Normal flow: switchTask', () => {
        it('should swap current task with stack task and log the interrupted session', () => {
            getState().startTask('Task A');
            getState().startTask('Task B'); // Task A goes to stack

            const taskBStart = getState().currentTask!.startTime;

            // Switch back to Task A
            const taskAId = getState().taskStack[0].id;
            getState().switchTask(taskAId);
            const state = getState();

            expect(state.currentTask!.name).toBe('Task A');
            expect(state.currentTask!.status).toBe('pending');
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Task B');

            // Should have 2 log entries: Task A interrupted (by Task B start) + Task B interrupted (by switch)
            expect(state.taskLog).toHaveLength(2);
            expect(state.taskLog[0].name).toBe('Task B');
            expect(state.taskLog[0].startTime).toBe(taskBStart);
        });
    });

    // ===================================================================
    // Stale Task (startTime=0) Guard Tests
    // ===================================================================

    describe('Stale task guards: startTime=0 safety', () => {
        // Setup: a settled stale task with startTime=0, status='paused'
        function setupStaleCurrentTask() {
            const staleTask = makeTask({
                name: 'Stale Task',
                startTime: 0,
                status: 'paused',
                duration: 3600000, // 1 hour accumulated
            });
            setState({ currentTask: staleTask });
            return staleTask;
        }

        it('startTask: should NOT create invalid log entry for stale current task', () => {
            const staleTask = setupStaleCurrentTask();
            getState().startTask('New Task');
            const state = getState();

            expect(state.currentTask!.name).toBe('New Task');
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Stale Task');
            expect(state.taskStack[0].status).toBe('paused');

            // No log entry should be created for the stale task
            expect(state.taskLog).toHaveLength(0);
            // Duration should be preserved (not inflated)
            expect(state.taskStack[0].duration).toBe(3600000);
        });

        it('stopTask: should NOT create invalid log entry for stale current task', () => {
            setupStaleCurrentTask();
            getState().stopTask();
            const state = getState();

            expect(state.currentTask).toBeNull();
            expect(state.backlogTasks).toHaveLength(1);
            expect(state.backlogTasks[0].name).toBe('Stale Task');

            // No log entry should be created with epoch-length duration
            expect(state.taskLog).toHaveLength(0);
            // Duration should be preserved
            expect(state.backlogTasks[0].duration).toBe(3600000);
        });

        it('completeTask: should NOT create invalid log entry for stale current task', () => {
            setupStaleCurrentTask();
            getState().completeTask();
            const state = getState();

            expect(state.currentTask).toBeNull();
            expect(state.history).toHaveLength(1);
            expect(state.history[0].name).toBe('Stale Task');

            // No log entry with huge duration
            expect(state.taskLog).toHaveLength(0);
            expect(state.history[0].duration).toBe(3600000);
        });

        it('interruptTask: should NOT create invalid log for stale current task', () => {
            setupStaleCurrentTask();
            getState().interruptTask('Interrupt Task');
            const state = getState();

            expect(state.currentTask!.name).toBe('Interrupt Task');
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Stale Task');

            // No log for stale task
            expect(state.taskLog).toHaveLength(0);
            expect(state.taskStack[0].duration).toBe(3600000);
        });

        it('pickFromBacklog: should NOT create invalid log for stale current task', () => {
            setupStaleCurrentTask();
            const backlogTask = makeTask({ name: 'Backlog Task' });
            setState({ backlogTasks: [backlogTask] });

            getState().pickFromBacklog(backlogTask.id);
            const state = getState();

            expect(state.currentTask!.name).toBe('Backlog Task');
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Stale Task');

            // No log for stale task
            expect(state.taskLog).toHaveLength(0);
            expect(state.taskStack[0].duration).toBe(3600000);
        });

        it('switchTask: should NOT create invalid log for stale current task', () => {
            setupStaleCurrentTask();
            const stackTask = makeTask({ name: 'Stack Task', status: 'paused' });
            setState({ taskStack: [stackTask] });

            getState().switchTask(stackTask.id);
            const state = getState();

            expect(state.currentTask!.name).toBe('Stack Task');
            expect(state.currentTask!.status).toBe('pending');
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Stale Task');

            // No log for stale task
            expect(state.taskLog).toHaveLength(0);
        });

        it('sendCurrentToBack: should NOT create invalid log for stale current task', () => {
            setupStaleCurrentTask();
            const stackTask = makeTask({ name: 'Stack Task', status: 'paused' });
            setState({ taskStack: [stackTask] });

            getState().sendCurrentToBack();
            const state = getState();

            // Stack Task should become current (popped from stack)
            expect(state.currentTask!.name).toBe('Stack Task');
            // Stale Task should be at front of stack
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Stale Task');

            // No log for stale task
            expect(state.taskLog).toHaveLength(0);
        });

        it('togglePause (pause path): should NOT create log for stale task with startTime=0', () => {
            // stale task is already paused, but test the edge case
            // where status might have been changed externally
            const staleTask = makeTask({
                name: 'Stale Task',
                startTime: 0,
                status: 'pending', // pending but startTime=0 edge case
                duration: 3600000,
            });
            setState({ currentTask: staleTask });

            getState().togglePause(); // should pause without creating bad log
            const state = getState();

            expect(state.currentTask!.status).toBe('paused');
            expect(state.taskLog).toHaveLength(0);
        });

        it('togglePause (resume path): should set new startTime when resuming stale task', () => {
            setupStaleCurrentTask();
            const beforeResume = Date.now();

            getState().togglePause(); // resume
            const state = getState();

            expect(state.currentTask!.status).toBe('pending');
            expect(state.currentTask!.startTime).toBeGreaterThanOrEqual(beforeResume);
            // No log entry created during resume
            expect(state.taskLog).toHaveLength(0);
        });

        it('reopenTask: should NOT create invalid log for stale current task', () => {
            setupStaleCurrentTask();
            const historyTask = makeTask({
                name: 'History Task',
                status: 'completed',
                endTime: Date.now(),
            });
            setState({ history: [historyTask] });

            getState().reopenTask(historyTask.id);
            const state = getState();

            expect(state.currentTask!.name).toBe('History Task');
            expect(state.taskStack).toHaveLength(1);
            expect(state.taskStack[0].name).toBe('Stale Task');

            // No log for stale task
            expect(state.taskLog).toHaveLength(0);
        });
    });

    // ===================================================================
    // settleStaleTasks Tests
    // ===================================================================

    describe('settleStaleTasks', () => {
        it('should not modify current task if it belongs to today', () => {
            getState().startTask('Today Task');
            const beforeSettle = getState().currentTask!;

            getState().settleStaleTasks();
            const state = getState();

            expect(state.currentTask!.id).toBe(beforeSettle.id);
            expect(state.currentTask!.status).toBe('pending');
            expect(state.currentTask!.startTime).toBe(beforeSettle.startTime);
            expect(state.taskLog).toHaveLength(0);
        });

        it('should settle a stale task from previous day', () => {
            // Simulate a task started at 15:00 on 2 days ago
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setHours(15, 0, 0, 0);

            const staleTask = makeTask({
                name: 'Old Task',
                startTime: twoDaysAgo.getTime(),
                status: 'pending',
                duration: 0,
            });
            setState({ currentTask: staleTask });

            getState().settleStaleTasks();
            const state = getState();

            // Task should be paused with startTime=0
            expect(state.currentTask).not.toBeNull();
            expect(state.currentTask!.status).toBe('paused');
            expect(state.currentTask!.startTime).toBe(0);

            // A log entry should have been created ending at dayStartHour boundary
            expect(state.taskLog).toHaveLength(1);
            const logEntry = state.taskLog[0];
            expect(logEntry.name).toBe('Old Task');
            expect(logEntry.startTime).toBe(twoDaysAgo.getTime());
            expect(logEntry.status).toBe('paused');

            // endTime should be at dayStartHour (5:00) of the next day after the task's logical date
            const endDate = new Date(logEntry.endTime);
            expect(endDate.getHours()).toBe(5);
            expect(endDate.getMinutes()).toBe(0);
        });

        it('should reset startTime for stale tasks in taskStack', () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setHours(15, 0, 0, 0);

            const stackTask = makeTask({
                name: 'Stack Task',
                startTime: twoDaysAgo.getTime(),
                status: 'paused',
            });
            setState({ taskStack: [stackTask] });

            const beforeSettle = Date.now();
            getState().settleStaleTasks();
            const state = getState();

            expect(state.taskStack[0].startTime).toBeGreaterThanOrEqual(beforeSettle);
        });

        it('should not affect paused current task (only pending)', () => {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setHours(15, 0, 0, 0);

            const pausedOldTask = makeTask({
                name: 'Already Paused',
                startTime: twoDaysAgo.getTime(),
                status: 'paused',
                duration: 1000,
            });
            setState({ currentTask: pausedOldTask });

            getState().settleStaleTasks();
            const state = getState();

            // Should not create any log entries since the task was already paused
            expect(state.taskLog).toHaveLength(0);
            // Task should remain unchanged
            expect(state.currentTask!.status).toBe('paused');
        });

        it('settled task can be fully resumed and then stopped correctly', () => {
            // Full integration: settle → resume → work → stop
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setHours(15, 0, 0, 0);

            const staleTask = makeTask({
                name: 'Stale Task',
                startTime: twoDaysAgo.getTime(),
                status: 'pending',
                duration: 0,
            });
            setState({ currentTask: staleTask });

            // Step 1: Settle
            getState().settleStaleTasks();
            expect(getState().currentTask!.startTime).toBe(0);
            expect(getState().currentTask!.status).toBe('paused');
            expect(getState().taskLog).toHaveLength(1); // day-boundary log

            // Step 2: Resume
            getState().togglePause();
            const resumeTime = getState().currentTask!.startTime;
            expect(resumeTime).toBeGreaterThan(0);
            expect(getState().currentTask!.status).toBe('pending');
            expect(getState().taskLog).toHaveLength(1); // still 1 (no new log on resume)

            // Step 3: Stop
            getState().stopTask();
            const state = getState();
            expect(state.currentTask).toBeNull();
            expect(state.backlogTasks).toHaveLength(1);
            expect(state.taskLog).toHaveLength(2); // day-boundary + stop session
            expect(state.taskLog[0].startTime).toBe(resumeTime); // new session
            expect(state.taskLog[0].duration).toBeGreaterThanOrEqual(0);
            expect(state.taskLog[0].duration).toBeLessThan(10000); // should be small, not epoch-length
        });
    });
});
