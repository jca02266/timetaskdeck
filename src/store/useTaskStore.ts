import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type TaskStatus = 'pending' | 'completed' | 'paused';

export interface Task {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    duration: number; // Accumulated duration in milliseconds
    status: TaskStatus;
    recurringTaskId?: string; // Links back to the recurring task template
    scheduledTime?: string; // HH:mm format
    scheduledDate?: string; // YYYY-MM-DD format
}

export interface TaskLogEntry {
    id: string;
    taskId: string;
    name: string;
    startTime: number;
    endTime: number;
    duration: number; // Duration of this specific session
    status: TaskStatus;
}

interface TaskState {
    currentTask: Task | null;
    taskStack: Task[];
    backlog: Task[];
    history: Task[];
    recurringTasks: Task[];
    taskLog: TaskLogEntry[];

    // Actions
    startTask: (name: string, recurringTaskId?: string) => void;
    stopTask: () => void;
    completeTask: () => void;
    interruptTask: (name: string) => void;
    addToBacklog: (name: string) => void;
    pickFromBacklog: (taskId: string) => void;
    reopenTask: (taskId: string) => void;
    updateCurrentTaskName: (name: string) => void;
    switchTask: (taskId: string) => void;
    updateTaskName: (taskId: string, newName: string) => void;
    deleteTask: (taskId: string) => void;
    reorderBacklog: (fromIndex: number, toIndex: number) => void;
    sendCurrentToBack: () => void;

    // Recurring Task Actions
    addRecurringTask: (name: string) => void;
    updateRecurringTask: (id: string, name: string) => void;
    deleteRecurringTask: (id: string) => void;
    reorderRecurringTasks: (fromIndex: number, toIndex: number) => void;
    toggleRecurringTaskCheck: (id: string) => void;
    startRecurringTask: (id: string) => void;
    copyToRecurring: (taskId: string) => void;

    // Timer Control
    togglePause: () => void;
    updateTaskSchedule: (taskId: string, date?: string, time?: string) => void;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            currentTask: null,
            taskStack: [],
            backlog: [],
            history: [],
            recurringTasks: [],
            taskLog: [],

            startTask: (name, recurringTaskId) => {
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    name,
                    startTime: Date.now(),
                    duration: 0,
                    status: 'pending',
                    recurringTaskId
                };

                set((state) => {
                    let newStack = state.taskStack;
                    let newLog = [...state.taskLog];

                    if (state.currentTask) {
                        // Auto-interrupt: Log session
                        const now = Date.now();
                        const sessionDuration = now - state.currentTask.startTime;
                        newLog.unshift({
                            id: crypto.randomUUID(),
                            taskId: state.currentTask.id,
                            name: state.currentTask.name,
                            startTime: state.currentTask.startTime,
                            endTime: now,
                            duration: sessionDuration,
                            status: 'interrupted' as TaskStatus
                        });

                        // Push current task to stack
                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + sessionDuration,
                            status: 'paused' as TaskStatus
                        };
                        newStack = [...state.taskStack, pausedTask];
                    }

                    return {
                        currentTask: newTask,
                        taskStack: newStack,
                        taskLog: newLog
                    };
                });
            },

            stopTask: () => {
                set((state) => {
                    if (!state.currentTask) return {};

                    const now = Date.now();
                    const sessionDuration = now - state.currentTask.startTime;

                    const logEntry: TaskLogEntry = {
                        id: crypto.randomUUID(),
                        taskId: state.currentTask.id,
                        name: state.currentTask.name,
                        startTime: state.currentTask.startTime,
                        endTime: now,
                        duration: sessionDuration,
                        status: 'paused'
                    };

                    const stoppedTask = {
                        ...state.currentTask,
                        endTime: now,
                        duration: state.currentTask.duration + sessionDuration,
                        status: 'paused' as TaskStatus
                    };

                    return {
                        currentTask: null,
                        backlog: [stoppedTask, ...state.backlog],
                        taskLog: [logEntry, ...state.taskLog]
                    };
                });
            },

            completeTask: () => {
                set((state) => {
                    if (!state.currentTask) return {};

                    const now = Date.now();
                    const sessionDuration = now - state.currentTask.startTime;

                    const logEntry: TaskLogEntry = {
                        id: crypto.randomUUID(),
                        taskId: state.currentTask.id,
                        name: state.currentTask.name,
                        startTime: state.currentTask.startTime,
                        endTime: now,
                        duration: sessionDuration,
                        status: 'completed'
                    };

                    const completedTask = {
                        ...state.currentTask,
                        endTime: now,
                        duration: state.currentTask.duration + sessionDuration,
                        status: 'completed' as TaskStatus
                    };

                    // Auto-complete linked recurring task
                    let newRecurringTasks = state.recurringTasks;
                    if (state.currentTask.recurringTaskId) {
                        const recurringIndex = state.recurringTasks.findIndex(t => t.id === state.currentTask!.recurringTaskId);
                        if (recurringIndex !== -1) {
                            newRecurringTasks = [...state.recurringTasks];
                            newRecurringTasks[recurringIndex] = {
                                ...newRecurringTasks[recurringIndex],
                                status: 'completed'
                            };
                        }
                    }

                    const nextTask = state.taskStack.length > 0 ? state.taskStack[state.taskStack.length - 1] : null;
                    const newStack = state.taskStack.slice(0, -1);

                    const resumedTask = nextTask ? {
                        ...nextTask,
                        startTime: Date.now()
                    } : null;

                    return {
                        currentTask: resumedTask,
                        taskStack: newStack,
                        history: [completedTask, ...state.history],
                        taskLog: [logEntry, ...state.taskLog],
                        recurringTasks: newRecurringTasks
                    };
                });
            },

            interruptTask: (name) => {
                set((state) => {
                    let newStack = state.taskStack;
                    let newLog = [...state.taskLog];

                    if (state.currentTask) {
                        const now = Date.now();
                        const sessionDuration = now - state.currentTask.startTime;

                        newLog.unshift({
                            id: crypto.randomUUID(),
                            taskId: state.currentTask.id,
                            name: state.currentTask.name,
                            startTime: state.currentTask.startTime,
                            endTime: now,
                            duration: sessionDuration,
                            status: 'interrupted' as TaskStatus
                        });

                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + sessionDuration,
                        };
                        newStack = [...state.taskStack, pausedTask];
                    }

                    const interruptTask: Task = {
                        id: crypto.randomUUID(),
                        name,
                        startTime: Date.now(),
                        duration: 0,
                        status: 'pending'
                    };

                    return {
                        currentTask: interruptTask,
                        taskStack: newStack,
                        taskLog: newLog
                    };
                });
            },

            addToBacklog: (name) => {
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    name,
                    startTime: 0,
                    duration: 0,
                    status: 'pending'
                };
                set((state) => ({ backlog: [newTask, ...state.backlog] }));
            },

            pickFromBacklog: (taskId) => {
                set((state) => {
                    const taskIndex = state.backlog.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) return {};

                    // If there is a current task, we should probably pause/log it first?
                    // The current implementation of pickFromBacklog replaces currentTask.
                    // Let's assume standard behavior: Pause current if exists.
                    let newStack = state.taskStack;
                    let newLog = [...state.taskLog];

                    if (state.currentTask) {
                        const now = Date.now();
                        const sessionDuration = now - state.currentTask.startTime;

                        newLog.unshift({
                            id: crypto.randomUUID(),
                            taskId: state.currentTask.id,
                            name: state.currentTask.name,
                            startTime: state.currentTask.startTime,
                            endTime: now,
                            duration: sessionDuration,
                            status: 'interrupted' as TaskStatus
                        });

                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + sessionDuration,
                            status: 'paused' as TaskStatus
                        };
                        newStack = [...state.taskStack, pausedTask];
                    }

                    const taskToStart = state.backlog[taskIndex];
                    const newBacklog = [...state.backlog];
                    newBacklog.splice(taskIndex, 1);

                    return {
                        currentTask: {
                            ...taskToStart,
                            startTime: Date.now(),
                        },
                        backlog: newBacklog,
                        taskStack: newStack,
                        taskLog: newLog
                    };
                });
            },

            reopenTask: (taskId) => {
                set((state) => {
                    const taskIndex = state.history.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) return {};

                    const taskToReopen = state.history[taskIndex];
                    const newHistory = [...state.history];
                    newHistory.splice(taskIndex, 1);

                    let newStack = state.taskStack;
                    let newLog = [...state.taskLog];

                    if (state.currentTask) {
                        const now = Date.now();
                        const sessionDuration = now - state.currentTask.startTime;

                        newLog.unshift({
                            id: crypto.randomUUID(),
                            taskId: state.currentTask.id,
                            name: state.currentTask.name,
                            startTime: state.currentTask.startTime,
                            endTime: now,
                            duration: sessionDuration,
                            status: 'interrupted' as TaskStatus
                        });

                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + sessionDuration,
                            status: 'paused' as TaskStatus
                        };
                        newStack = [...state.taskStack, pausedTask];
                    }

                    const reopenedTask = {
                        ...taskToReopen,
                        startTime: Date.now(),
                        status: 'pending' as TaskStatus,
                        endTime: undefined
                    };

                    return {
                        currentTask: reopenedTask,
                        taskStack: newStack,
                        history: newHistory,
                        taskLog: newLog
                    };
                });
            },

            updateCurrentTaskName: (name) => {
                set((state) => {
                    if (!state.currentTask) return {};
                    return { currentTask: { ...state.currentTask, name } };
                });
            },

            switchTask: (taskId) => {
                set((state) => {
                    const taskIndex = state.taskStack.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) return {};

                    const taskToResume = state.taskStack[taskIndex];
                    let newStack = [...state.taskStack];
                    newStack.splice(taskIndex, 1);

                    let newLog = [...state.taskLog];

                    if (state.currentTask) {
                        const now = Date.now();
                        const sessionDuration = now - state.currentTask.startTime;

                        newLog.unshift({
                            id: crypto.randomUUID(),
                            taskId: state.currentTask.id,
                            name: state.currentTask.name,
                            startTime: state.currentTask.startTime,
                            endTime: now,
                            duration: sessionDuration,
                            status: 'interrupted' as TaskStatus
                        });

                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + sessionDuration,
                            status: 'paused' as TaskStatus
                        };
                        newStack.push(pausedTask);
                    }

                    return {
                        currentTask: {
                            ...taskToResume,
                            startTime: Date.now(),
                            status: 'pending'
                        },
                        taskStack: newStack,
                        taskLog: newLog
                    };
                });
            },

            updateTaskName: (taskId, newName) => {
                set((state) => {
                    if (state.currentTask && state.currentTask.id === taskId) {
                        return { currentTask: { ...state.currentTask, name: newName } };
                    }

                    const backlogIndex = state.backlog.findIndex(t => t.id === taskId);
                    if (backlogIndex !== -1) {
                        const newBacklog = [...state.backlog];
                        newBacklog[backlogIndex] = { ...newBacklog[backlogIndex], name: newName };
                        return { backlog: newBacklog };
                    }

                    const historyIndex = state.history.findIndex(t => t.id === taskId);
                    if (historyIndex !== -1) {
                        const newHistory = [...state.history];
                        newHistory[historyIndex] = { ...newHistory[historyIndex], name: newName };
                        return { history: newHistory };
                    }

                    const stackIndex = state.taskStack.findIndex(t => t.id === taskId);
                    if (stackIndex !== -1) {
                        const newStack = [...state.taskStack];
                        newStack[stackIndex] = { ...newStack[stackIndex], name: newName };
                        return { taskStack: newStack };
                    }

                    // Check recurring tasks
                    const recurringIndex = state.recurringTasks.findIndex(t => t.id === taskId);
                    if (recurringIndex !== -1) {
                        const newRecurring = [...state.recurringTasks];
                        newRecurring[recurringIndex] = { ...newRecurring[recurringIndex], name: newName };
                        return { recurringTasks: newRecurring };
                    }

                    return {};
                });
            },

            deleteTask: (taskId) => {
                set((state) => {
                    // Always filter out logs for the deleted task
                    const updates: Partial<TaskState> = {
                        taskLog: state.taskLog.filter(t => t.taskId !== taskId)
                    };

                    if (state.backlog.some(t => t.id === taskId)) {
                        updates.backlog = state.backlog.filter(t => t.id !== taskId);
                    } else if (state.history.some(t => t.id === taskId)) {
                        updates.history = state.history.filter(t => t.id !== taskId);
                    } else if (state.taskStack.some(t => t.id === taskId)) {
                        updates.taskStack = state.taskStack.filter(t => t.id !== taskId);
                    } else if (state.currentTask && state.currentTask.id === taskId) {
                        updates.currentTask = null;
                    } else if (state.recurringTasks.some(t => t.id === taskId)) {
                        updates.recurringTasks = state.recurringTasks.filter(t => t.id !== taskId);
                    }

                    return updates;
                });
            },

            reorderBacklog: (fromIndex, toIndex) => {
                set((state) => {
                    const newBacklog = [...state.backlog];
                    const [movedItem] = newBacklog.splice(fromIndex, 1);
                    newBacklog.splice(toIndex, 0, movedItem);
                    return { backlog: newBacklog };
                });
            },

            sendCurrentToBack: () => {
                set((state) => {
                    if (!state.currentTask) return {};

                    const now = Date.now();
                    const sessionDuration = now - state.currentTask.startTime;

                    const logEntry: TaskLogEntry = {
                        id: crypto.randomUUID(),
                        taskId: state.currentTask.id,
                        name: state.currentTask.name,
                        startTime: state.currentTask.startTime,
                        endTime: now,
                        duration: sessionDuration,
                        status: 'interrupted' as TaskStatus
                    };

                    const pausedTask = {
                        ...state.currentTask,
                        duration: state.currentTask.duration + sessionDuration,
                        status: 'paused' as TaskStatus
                    };

                    const newStack = [pausedTask, ...state.taskStack];

                    let nextTask = null;
                    if (newStack.length > 1) {
                        nextTask = newStack.pop();
                    } else {
                        nextTask = null;
                    }

                    return {
                        currentTask: nextTask ? {
                            ...nextTask,
                            startTime: Date.now(),
                            status: 'pending'
                        } : null,
                        taskStack: newStack,
                        taskLog: [logEntry, ...state.taskLog]
                    };
                });
            },

            addRecurringTask: (name) => {
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    name,
                    startTime: 0,
                    duration: 0,
                    status: 'pending', // Default unchecked
                    scheduledTime: ''
                };
                set((state) => ({ recurringTasks: [newTask, ...state.recurringTasks] }));
            },

            updateRecurringTask: (id, name) => {
                set((state) => {
                    const index = state.recurringTasks.findIndex(t => t.id === id);
                    if (index === -1) return {};
                    const newRecurring = [...state.recurringTasks];
                    newRecurring[index] = { ...newRecurring[index], name };
                    return { recurringTasks: newRecurring };
                });
            },

            deleteRecurringTask: (id) => {
                set((state) => ({
                    recurringTasks: state.recurringTasks.filter(t => t.id !== id)
                }));
            },

            reorderRecurringTasks: (fromIndex, toIndex) => {
                set((state) => {
                    const newRecurring = [...state.recurringTasks];
                    const [movedItem] = newRecurring.splice(fromIndex, 1);
                    newRecurring.splice(toIndex, 0, movedItem);
                    return { recurringTasks: newRecurring };
                });
            },

            toggleRecurringTaskCheck: (id) => {
                set((state) => {
                    const index = state.recurringTasks.findIndex(t => t.id === id);
                    if (index === -1) return {};
                    const newRecurring = [...state.recurringTasks];
                    const task = newRecurring[index];
                    // Toggle between 'pending' (unchecked) and 'completed' (checked)
                    newRecurring[index] = {
                        ...task,
                        status: task.status === 'completed' ? 'pending' : 'completed'
                    };
                    return { recurringTasks: newRecurring };
                });
            },

            startRecurringTask: (id) => {
                const state = get();
                const task = state.recurringTasks.find(t => t.id === id);
                if (!task) return;

                // Call startTask with the name AND recurringTaskId
                state.startTask(task.name, id);
            },

            copyToRecurring: (taskId) => {
                const state = get();
                const task = state.backlog.find(t => t.id === taskId) ||
                    state.history.find(t => t.id === taskId) ||
                    state.taskStack.find(t => t.id === taskId) ||
                    (state.currentTask && state.currentTask.id === taskId ? state.currentTask : undefined);

                if (task) {
                    state.addRecurringTask(task.name);
                }
            },

            togglePause: () => {
                set((state) => {
                    if (!state.currentTask) return {};

                    const isPaused = state.currentTask.status === 'paused';

                    if (isPaused) {
                        // Resume
                        return {
                            currentTask: {
                                ...state.currentTask,
                                status: 'pending',
                                startTime: Date.now()
                            }
                        };
                    } else {
                        // Pause
                        const now = Date.now();
                        const sessionDuration = now - state.currentTask.startTime;

                        const logEntry: TaskLogEntry = {
                            id: crypto.randomUUID(),
                            taskId: state.currentTask.id,
                            name: state.currentTask.name,
                            startTime: state.currentTask.startTime,
                            endTime: now,
                            duration: sessionDuration,
                            status: 'paused'
                        };

                        return {
                            currentTask: {
                                ...state.currentTask,
                                status: 'paused',
                                duration: state.currentTask.duration + sessionDuration
                            },
                            taskLog: [logEntry, ...state.taskLog]
                        };
                    }
                });
            },

            updateTaskSchedule: (taskId, date, time) => {
                set((state) => {
                    const updateTask = (task: Task) => {
                        let newTime = time !== undefined ? time : task.scheduledTime;
                        let newDate = date !== undefined ? date : task.scheduledDate;

                        // Default time logic: if date is set (or already set) but time is empty, default to 08:30
                        if (newDate && !newTime) {
                            newTime = '08:30';
                        }

                        return { ...task, scheduledDate: newDate, scheduledTime: newTime };
                    };

                    const recurringIndex = state.recurringTasks.findIndex(t => t.id === taskId);
                    if (recurringIndex !== -1) {
                        const newRecurring = [...state.recurringTasks];
                        newRecurring[recurringIndex] = updateTask(newRecurring[recurringIndex]);
                        return { recurringTasks: newRecurring };
                    }

                    const backlogIndex = state.backlog.findIndex(t => t.id === taskId);
                    if (backlogIndex !== -1) {
                        const newBacklog = [...state.backlog];
                        newBacklog[backlogIndex] = updateTask(newBacklog[backlogIndex]);
                        return { backlog: newBacklog };
                    }

                    return {};
                });
            }
        }),
        {
            name: 'timetask-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
