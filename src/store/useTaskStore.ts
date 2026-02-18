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
}

interface TaskState {
    currentTask: Task | null;
    taskStack: Task[];
    backlog: Task[];
    history: Task[];

    // Actions
    startTask: (name: string) => void;
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
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            currentTask: null,
            taskStack: [],
            backlog: [],
            history: [],

            startTask: (name) => {
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    name,
                    startTime: Date.now(),
                    duration: 0,
                    status: 'pending',
                };

                // If there's a current task, pause it and push to stack? 
                // Requirement says "Interrupt" pushes to stack. 
                // "Start Task" usually implies starting fresh or finishing previous. 
                // If "currentTask" exists, let's assume we stop it or user should have stopped it.
                // But for safety, if there is a running task, we'll auto-pause it (interrupt behavior) 
                // OR we can enforce user to stop it. 
                // Based on "Start Task button" requirement: "Press start -> records start time".
                // Let's assume startTask is for the *initial* start or starting from idle.

                set((state) => {
                    let newStack = state.taskStack;

                    if (state.currentTask) {
                        // Auto-interrupt: Push current task to stack
                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + (Date.now() - state.currentTask.startTime),
                            status: 'paused' as TaskStatus
                        };
                        newStack = [...state.taskStack, pausedTask];
                    }

                    return {
                        currentTask: newTask,
                        taskStack: newStack
                    };
                });
            },

            stopTask: () => {
                set((state) => {
                    if (!state.currentTask) return {};
                    // "Pause/Stop" -> Moves to Stack or Backlog? 
                    // Requirement: "Stop task -> records end time... next task input" 
                    // "Interrupt -> Pauses current... starts new"
                    // "Stop" sounds like "I'm done for now" or "Pause".
                    // The requirements say: "Task End Action: Stop or Complete".
                    // Stop: "Task remains in list (easy to resume)". 
                    // So let's push to Backlog (or kept as 'paused' current? No, next task input is needed).
                    // Let's push to Backlog with status 'paused'.

                    const stoppedTask = {
                        ...state.currentTask,
                        endTime: Date.now(),
                        duration: state.currentTask.duration + (Date.now() - state.currentTask.startTime),
                        status: 'paused' as TaskStatus
                    };

                    return {
                        currentTask: null,
                        // Put at top of backlog for easy access? Or separate "Paused" list?
                        // "Stack" is for interrupts. "Backlog" is for stock.
                        // Let's put in Backlog.
                        backlog: [stoppedTask, ...state.backlog]
                    };
                });
            },

            completeTask: () => {
                set((state) => {
                    if (!state.currentTask) return {};
                    const completedTask = {
                        ...state.currentTask,
                        endTime: Date.now(),
                        duration: state.currentTask.duration + (Date.now() - state.currentTask.startTime),
                        status: 'completed' as TaskStatus
                    };

                    // Requirement: "Resume: Completing an interrupt... automatic resume"
                    // If stack has items, pop and resume.
                    const nextTask = state.taskStack.length > 0 ? state.taskStack[state.taskStack.length - 1] : null;
                    const newStack = state.taskStack.slice(0, -1);

                    // Resume logic for next task
                    const resumedTask = nextTask ? {
                        ...nextTask,
                        startTime: Date.now() // Reset start time for the new segment
                    } : null;

                    return {
                        currentTask: resumedTask,
                        taskStack: newStack,
                        history: [completedTask, ...state.history]
                    };
                });
            },

            interruptTask: (name) => {
                set((state) => {
                    // Pause current task
                    let newStack = state.taskStack;
                    if (state.currentTask) {
                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + (Date.now() - state.currentTask.startTime),
                            // startTime will be updated when resumed
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
                        taskStack: newStack
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

                    const taskToStart = state.backlog[taskIndex];
                    const newBacklog = [...state.backlog];
                    newBacklog.splice(taskIndex, 1);

                    // If current task exists, what do? Assume user stopped or this is a fresh start.
                    // If user picks from backlog while running, maybe implicit Stop?
                    // Let's assume this is called when idle.

                    return {
                        currentTask: {
                            ...taskToStart,
                            startTime: Date.now(), // update start time
                        },
                        backlog: newBacklog
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
                    if (state.currentTask) {
                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + (Date.now() - state.currentTask.startTime),
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
                        history: newHistory
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

                    // If there is a current task, pause it and add to stack
                    if (state.currentTask) {
                        const pausedTask = {
                            ...state.currentTask,
                            duration: state.currentTask.duration + (Date.now() - state.currentTask.startTime),
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
                        taskStack: newStack
                    };
                });
            },

            updateTaskName: (taskId, newName) => {
                set((state) => {
                    // Check current task
                    if (state.currentTask && state.currentTask.id === taskId) {
                        return { currentTask: { ...state.currentTask, name: newName } };
                    }

                    // Check backlog
                    const backlogIndex = state.backlog.findIndex(t => t.id === taskId);
                    if (backlogIndex !== -1) {
                        const newBacklog = [...state.backlog];
                        newBacklog[backlogIndex] = { ...newBacklog[backlogIndex], name: newName };
                        return { backlog: newBacklog };
                    }

                    // Check history
                    const historyIndex = state.history.findIndex(t => t.id === taskId);
                    if (historyIndex !== -1) {
                        const newHistory = [...state.history];
                        newHistory[historyIndex] = { ...newHistory[historyIndex], name: newName };
                        return { history: newHistory };
                    }

                    // Check stack
                    const stackIndex = state.taskStack.findIndex(t => t.id === taskId);
                    if (stackIndex !== -1) {
                        const newStack = [...state.taskStack];
                        newStack[stackIndex] = { ...newStack[stackIndex], name: newName };
                        return { taskStack: newStack };
                    }

                    return {};
                });
            },

            deleteTask: (taskId) => {
                set((state) => {
                    // Remove from backlog
                    const inBacklog = state.backlog.some(t => t.id === taskId);
                    if (inBacklog) {
                        return { backlog: state.backlog.filter(t => t.id !== taskId) };
                    }

                    // Remove from history
                    const inHistory = state.history.some(t => t.id === taskId);
                    if (inHistory) {
                        return { history: state.history.filter(t => t.id !== taskId) };
                    }

                    // Remove from stack
                    const inStack = state.taskStack.some(t => t.id === taskId);
                    if (inStack) {
                        return { taskStack: state.taskStack.filter(t => t.id !== taskId) };
                    }

                    // Logic for current task? Usually we don't delete the running task this way, but if needed:
                    if (state.currentTask && state.currentTask.id === taskId) {
                        // If deleting current, maybe stop it? Or just null it?
                        // Let's assume for now we don't delete the active task via this specific UI action (since it's for lists)
                        // But for completeness:
                        return { currentTask: null };
                    }

                    return {};
                });
            },

            reorderBacklog: (fromIndex, toIndex) => {
                set((state) => {
                    const newBacklog = [...state.backlog];
                    const [movedItem] = newBacklog.splice(fromIndex, 1);
                    newBacklog.splice(toIndex, 0, movedItem);
                    return { backlog: newBacklog };
                });
            }
        }),
        {
            name: 'timetask-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
