import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemoStore } from './useMemoStore';

export type TaskStatus = 'pending' | 'completed' | 'paused' | 'interrupted';

export interface BacklogCategory {
    id: string;
    name: string;
    allocatedMinutes: number;
    isMinimized?: boolean;
}

export interface ColorDefinition {
    id: string;
    colorCode: string;
    name: string;
}

export const DEFAULT_COLORS: ColorDefinition[] = [
    { id: 'color-1', colorCode: 'bg-slate-500', name: 'Default' },
    { id: 'color-2', colorCode: 'bg-red-500', name: 'Urgent' },
    { id: 'color-3', colorCode: 'bg-orange-500', name: 'Orange' },
    { id: 'color-4', colorCode: 'bg-yellow-500', name: 'Yellow' },
    { id: 'color-5', colorCode: 'bg-green-500', name: 'Green' },
    { id: 'color-6', colorCode: 'bg-blue-500', name: 'Blue' },
    { id: 'color-7', colorCode: 'bg-purple-500', name: 'Purple' },
    { id: 'color-8', colorCode: 'bg-pink-500', name: 'Pink' },
];

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
    backlogId?: string;
    colorId?: string;
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
    backlogTasks: Task[]; // Replaces old `backlog`
    backlogCategories: BacklogCategory[];
    colors: ColorDefinition[];
    history: Task[];
    recurringTasks: Task[];
    taskLog: TaskLogEntry[];
    isRecurringMinimized: boolean;
    isHistoryMinimized: boolean;

    // Actions
    startTask: (name: string, recurringTaskId?: string) => void;
    stopTask: () => void;
    completeTask: () => void;
    interruptTask: (name: string) => void;

    // Backlog Operations
    addToBacklog: (name: string, backlogId?: string) => void;
    pickFromBacklog: (taskId: string) => void;
    moveBacklogTask: (taskId: string, targetBacklogId: string, targetIndexInCategory: number) => void;
    moveHistoryToBacklog: (taskId: string, targetBacklogId: string) => void;

    // Category / Color Operations
    addBacklogCategory: (name?: string) => string;
    updateBacklogCategory: (id: string, updates: Partial<BacklogCategory>) => void;
    deleteBacklogCategory: (id: string) => void;
    toggleBacklogMinimized: (id: string) => void;
    reorderBacklogCategories: (startIndex: number, endIndex: number) => void;

    updateColorName: (id: string, name: string) => void;
    updateTaskColorId: (taskId: string, colorId?: string) => void;
    updateTaskBacklogId: (taskId: string, backlogId: string) => void;

    reopenTask: (taskId: string) => void;
    updateCurrentTaskName: (name: string) => void;
    switchTask: (taskId: string) => void;
    updateTaskName: (taskId: string, newName: string) => void;
    deleteTask: (taskId: string) => void;
    sendCurrentToBack: () => void;

    // Recurring Task Actions
    addRecurringTask: (name: string) => void;
    updateRecurringTask: (id: string, name: string) => void;
    deleteRecurringTask: (id: string) => void;
    reorderRecurringTasks: (fromIndex: number, toIndex: number) => void;
    toggleRecurringTaskCheck: (id: string) => void;
    clearAllRecurringTasksChecks: () => void;
    startRecurringTask: (id: string) => void;
    copyToRecurring: (taskId: string) => void;

    // Timer Control
    togglePause: () => void;
    updateTaskSchedule: (taskId: string, date?: string, time?: string) => void;
    resumeFromStack: () => void;
    reorderBacklogTasks: (startIndex: number, endIndex: number) => void;
    moveTaskToLocation: (taskId: string, location: 'current' | 'stack' | 'backlog', backlogId?: string) => void;
    importState: (data: any) => void;
    reorderAllTasks: (newTasks: Task[]) => void;
    setPaused: (isPaused: boolean) => void;
    toggleRecurringMinimized: () => void;
    toggleHistoryMinimized: () => void;
    frontPanelId: string | null;
    bringToFront: (id: string) => void;
    draggedTaskId: string | null;
    setDraggedTaskId: (id: string | null) => void;

    // Memo Feature State
    activeMemoTaskId: string | null;
    isMemoMinimized: boolean;
    openMemo: (taskId: string) => void;
    closeMemo: () => void;
    toggleMemoMinimized: () => void;
    getTaskById: (taskId: string) => Task | undefined;

    // Modal Global States
    isTaskTableOpen: boolean;
    isLogOpen: boolean;
    isColorSettingsOpen: boolean;
    setIsTaskTableOpen: (open: boolean) => void;
    setIsLogOpen: (open: boolean) => void;
    setIsColorSettingsOpen: (open: boolean) => void;

    addManualTaskLogEntry: (taskId: string, name: string, startTime: number, endTime: number, duration: number, status: TaskStatus) => void;
    updateTaskLogs: (logs: TaskLogEntry[]) => void;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set, get) => ({
            currentTask: null,
            taskStack: [],
            backlogTasks: [],
            backlogCategories: [{ id: 'main', name: 'Main Backlog', allocatedMinutes: 0 }],
            colors: DEFAULT_COLORS,
            history: [],
            recurringTasks: [],
            taskLog: [],
            isRecurringMinimized: typeof window !== 'undefined' ? localStorage.getItem('timetask-ui-recurring-minimized') === 'true' : false,
            isHistoryMinimized: typeof window !== 'undefined' ? localStorage.getItem('timetask-ui-history-minimized') === 'true' : false,
            frontPanelId: null,
            draggedTaskId: null,

            // Memo Initialization
            activeMemoTaskId: null,
            isMemoMinimized: typeof window !== 'undefined' ? localStorage.getItem('timetask-ui-memo-minimized') === 'true' : false,

            // Modal Global States Initialization
            isTaskTableOpen: false,
            isLogOpen: false,
            isColorSettingsOpen: false,

            setIsTaskTableOpen: (open) => set({ isTaskTableOpen: open }),
            setIsLogOpen: (open) => set({ isLogOpen: open }),
            setIsColorSettingsOpen: (open) => set({ isColorSettingsOpen: open }),

            openMemo: (taskId: string) => {
                set({ activeMemoTaskId: taskId, isMemoMinimized: false });
                get().bringToFront('memo-panel');
            },

            closeMemo: () => {
                set({ activeMemoTaskId: null });
            },

            toggleMemoMinimized: () => {
                set((state) => {
                    const newValue = !state.isMemoMinimized;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('timetask-ui-memo-minimized', String(newValue));
                    }
                    return { isMemoMinimized: newValue };
                });
            },

            getTaskById: (taskId: string) => {
                const state = get();
                if (state.currentTask?.id === taskId) return state.currentTask;
                const inStack = state.taskStack.find(t => t.id === taskId);
                if (inStack) return inStack;
                const inBacklog = state.backlogTasks.find(t => t.id === taskId);
                if (inBacklog) return inBacklog;
                const inHistory = state.history.find(t => t.id === taskId);
                if (inHistory) return inHistory;
                return undefined;
            },

            bringToFront: (id: string) => {
                set({ frontPanelId: id });
            },

            setDraggedTaskId: (id: string | null) => {
                set({ draggedTaskId: id });
            },

            startTask: (name, recurringTaskId) => {
                const state = get();

                // Parse multi-line input
                const lines = name.split('\n');
                const taskName = lines[0].trim();
                const memoContent = lines.slice(1).join('\n').trim();

                const defaultBacklogId = state.backlogCategories.length > 0 ? state.backlogCategories[0].id : 'main';
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    name: taskName, // Use parsed name
                    startTime: Date.now(),
                    duration: 0,
                    status: 'pending',
                    recurringTaskId,
                    backlogId: defaultBacklogId
                };

                // Save memo if present
                if (memoContent) {
                    useMemoStore.getState().setMemo(newTask.id, memoContent);
                }

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

                    const nextTask = state.taskStack.length > 0 ? state.taskStack[state.taskStack.length - 1] : null;
                    const newStack = state.taskStack.slice(0, -1);

                    const resumedTask = nextTask ? {
                        ...nextTask,
                        startTime: Date.now(),
                        status: 'pending' as TaskStatus
                    } : null;

                    return {
                        currentTask: resumedTask,
                        taskStack: newStack,
                        backlogTasks: [stoppedTask, ...state.backlogTasks],
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

            resumeFromStack: () => {
                set((state) => {
                    if (state.currentTask || state.taskStack.length === 0) return {};

                    const nextTask = state.taskStack[state.taskStack.length - 1];
                    const newStack = state.taskStack.slice(0, -1);

                    return {
                        currentTask: {
                            ...nextTask,
                            startTime: Date.now(),
                            status: 'pending' as TaskStatus
                        },
                        taskStack: newStack
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

                    const defaultBacklogId = state.backlogCategories.length > 0 ? state.backlogCategories[0].id : 'main';
                    const interruptTask: Task = {
                        id: crypto.randomUUID(),
                        name,
                        startTime: Date.now(),
                        duration: 0,
                        status: 'pending',
                        backlogId: defaultBacklogId
                    };

                    return {
                        currentTask: interruptTask,
                        taskStack: newStack,
                        taskLog: newLog
                    };
                });
            },

            addToBacklog: (name, backlogId) => {
                const state = get();
                // Default to first category if none provided
                const targetBacklogId = backlogId || (state.backlogCategories.length > 0 ? state.backlogCategories[0].id : 'main');
                const newTask: Task = {
                    id: crypto.randomUUID(),
                    name,
                    startTime: 0,
                    duration: 0,
                    status: 'pending',
                    backlogId: targetBacklogId
                };
                set((state) => ({ backlogTasks: [newTask, ...state.backlogTasks] }));
            },

            pickFromBacklog: (taskId) => {
                set((state) => {
                    const taskIndex = state.backlogTasks.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) return {};

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

                    const taskToStart = state.backlogTasks[taskIndex];
                    const newBacklogTasks = [...state.backlogTasks];
                    newBacklogTasks.splice(taskIndex, 1);

                    return {
                        currentTask: {
                            ...taskToStart,
                            startTime: Date.now(),
                        },
                        backlogTasks: newBacklogTasks,
                        taskStack: newStack,
                        taskLog: newLog
                    };
                });
            },

            moveBacklogTask: (taskId, targetBacklogId, targetIndexInCategory) => {
                set((state) => {
                    const taskIndex = state.backlogTasks.findIndex(t => t.id === taskId);
                    if (taskIndex === -1) return {};

                    const newBacklogTasks = [...state.backlogTasks];
                    const [movedItem] = newBacklogTasks.splice(taskIndex, 1);
                    movedItem.backlogId = targetBacklogId;

                    // Now insert it at the correct index within its category
                    // Find all items belonging to targetBacklogId
                    let itemsCount = 0;
                    let insertPos = newBacklogTasks.length; // Default to end
                    for (let i = 0; i < newBacklogTasks.length; i++) {
                        if (newBacklogTasks[i].backlogId === targetBacklogId) {
                            if (itemsCount === targetIndexInCategory) {
                                insertPos = i;
                                break;
                            }
                            itemsCount++;
                        }
                    }

                    // If targetIndexInCategory is greater than or equal to existing items, 
                    // we need to place it after the last item of that category.
                    if (itemsCount > 0 && itemsCount <= targetIndexInCategory) {
                        for (let i = newBacklogTasks.length - 1; i >= 0; i--) {
                            if (newBacklogTasks[i].backlogId === targetBacklogId) {
                                insertPos = i + 1;
                                break;
                            }
                        }
                    } else if (itemsCount === 0) {
                        // If no items in this category yet, just push to top of list
                        insertPos = 0;
                    }

                    newBacklogTasks.splice(insertPos, 0, movedItem);

                    return { backlogTasks: newBacklogTasks };
                });
            },

            moveHistoryToBacklog: (taskId, targetBacklogId) => {
                set((state) => {
                    const historyIndex = state.history.findIndex(t => t.id === taskId);
                    if (historyIndex === -1) return {};

                    const newHistory = [...state.history];
                    const [taskToReopen] = newHistory.splice(historyIndex, 1);

                    const reopenedTask: Task = {
                        ...taskToReopen,
                        startTime: Date.now(), // or 0 since it's in backlog
                        status: 'pending' as TaskStatus,
                        endTime: undefined,
                        backlogId: targetBacklogId
                    };

                    return {
                        history: newHistory,
                        backlogTasks: [reopenedTask, ...state.backlogTasks]
                    };
                });
            },

            addBacklogCategory: (name) => {
                const newId = crypto.randomUUID();
                set((state) => {
                    const newCategory: BacklogCategory = {
                        id: newId,
                        name: name || `New Backlog`,
                        allocatedMinutes: 0
                    };
                    return {
                        backlogCategories: [...state.backlogCategories, newCategory]
                    };
                });
                return newId;
            },

            updateBacklogCategory: (id, updates) => {
                set((state) => ({
                    backlogCategories: state.backlogCategories.map(c => c.id === id ? { ...c, ...updates } : c)
                }));
            },

            deleteBacklogCategory: (id) => {
                set((state) => {
                    // Update tasks to orphaned or move to 'main'
                    const mainId = state.backlogCategories.find(c => c.id !== id)?.id || 'main'; // Fallback
                    const newBacklogTasks = state.backlogTasks.map(t =>
                        t.backlogId === id ? { ...t, backlogId: mainId } : t
                    );

                    return {
                        backlogCategories: state.backlogCategories.filter(c => c.id !== id),
                        backlogTasks: newBacklogTasks
                    };
                });
            },

            toggleBacklogMinimized: (id) => {
                set((state) => ({
                    backlogCategories: state.backlogCategories.map(c =>
                        c.id === id ? { ...c, isMinimized: !c.isMinimized } : c
                    )
                }));
            },

            reorderBacklogCategories: (startIndex, endIndex) => {
                set((state) => {
                    const newCategories = [...state.backlogCategories];
                    const [moved] = newCategories.splice(startIndex, 1);
                    newCategories.splice(endIndex, 0, moved);
                    return { backlogCategories: newCategories };
                });
            },

            updateColorName: (id, name) => {
                set((state) => ({
                    colors: state.colors.map(c => c.id === id ? { ...c, name } : c)
                }));
            },

            updateTaskColorId: (taskId, colorId) => {
                set((state) => {
                    // Similar to updateTaskName, try all lists
                    const updateList = (list: Task[]) => list.map(t => t.id === taskId ? { ...t, colorId } : t);

                    if (state.currentTask && state.currentTask.id === taskId) {
                        return { currentTask: { ...state.currentTask, colorId } };
                    }
                    return {
                        backlogTasks: updateList(state.backlogTasks),
                        history: updateList(state.history),
                        taskStack: updateList(state.taskStack),
                        recurringTasks: updateList(state.recurringTasks)
                    };
                });
            },

            updateTaskBacklogId: (taskId, backlogId) => {
                set((state) => {
                    const updateList = (list: Task[]) => list.map(t => t.id === taskId ? { ...t, backlogId } : t);
                    if (state.currentTask && state.currentTask.id === taskId) {
                        return { currentTask: { ...state.currentTask, backlogId } };
                    }
                    return {
                        backlogTasks: updateList(state.backlogTasks),
                        history: updateList(state.history),
                        taskStack: updateList(state.taskStack)
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

                    const updateList = (list: Task[]) => {
                        const idx = list.findIndex(t => t.id === taskId);
                        if (idx !== -1) {
                            const changed = [...list];
                            changed[idx] = { ...changed[idx], name: newName };
                            return changed;
                        }
                        return list;
                    }

                    return {
                        backlogTasks: updateList(state.backlogTasks),
                        history: updateList(state.history),
                        taskStack: updateList(state.taskStack),
                        recurringTasks: updateList(state.recurringTasks)
                    };
                });
            },

            deleteTask: (taskId) => {
                set((state) => {
                    const updates: Partial<TaskState> = {
                        taskLog: state.taskLog.filter(t => t.taskId !== taskId)
                    };

                    if (state.backlogTasks.some(t => t.id === taskId)) {
                        updates.backlogTasks = state.backlogTasks.filter(t => t.id !== taskId);
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
                    status: 'pending',
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
                    newRecurring[index] = {
                        ...task,
                        status: task.status === 'completed' ? 'pending' : 'completed'
                    };
                    return { recurringTasks: newRecurring };
                });
            },

            clearAllRecurringTasksChecks: () => {
                set((state) => {
                    const newRecurring = state.recurringTasks.map(task =>
                        task.status === 'completed' ? { ...task, status: 'pending' as TaskStatus } : task
                    );
                    return { recurringTasks: newRecurring };
                });
            },

            startRecurringTask: (id) => {
                const state = get();
                const task = state.recurringTasks.find(t => t.id === id);
                if (!task) return;
                state.startTask(task.name, id);
            },

            copyToRecurring: (taskId) => {
                const state = get();
                const task = state.backlogTasks.find(t => t.id === taskId) ||
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
                        return {
                            currentTask: {
                                ...state.currentTask,
                                status: 'pending',
                                startTime: Date.now()
                            }
                        };
                    } else {
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

                        // If explicitly cleared (to undefined or null or empty string)
                        if (date === null || date === '') newDate = undefined;
                        if (time === null || time === '') newTime = undefined;

                        return { ...task, scheduledDate: newDate, scheduledTime: newTime };
                    };

                    const updateList = (list: Task[]) => {
                        const idx = list.findIndex(t => t.id === taskId);
                        if (idx !== -1) {
                            const changed = [...list];
                            changed[idx] = updateTask(changed[idx]);
                            return changed;
                        }
                        return list;
                    }

                    return {
                        backlogTasks: updateList(state.backlogTasks),
                        recurringTasks: updateList(state.recurringTasks)
                    };
                });
            },

            reorderBacklogTasks: (startIndex, endIndex) => {
                set((state) => {
                    const newTasks = [...state.backlogTasks];
                    const [moved] = newTasks.splice(startIndex, 1);
                    newTasks.splice(endIndex, 0, moved);
                    return { backlogTasks: newTasks };
                });
            },

            moveTaskToLocation: (taskId, location, backlogId) => {
                set((state) => {
                    let taskToMove: Task | undefined;
                    let foundLocation: 'current' | 'stack' | 'backlog' | undefined;

                    // 1. Find and remove from current source
                    if (state.currentTask?.id === taskId) {
                        taskToMove = state.currentTask;
                        foundLocation = 'current';
                    } else {
                        const stackIdx = state.taskStack.findIndex(t => t.id === taskId);
                        if (stackIdx !== -1) {
                            taskToMove = state.taskStack[stackIdx];
                            foundLocation = 'stack';
                        } else {
                            const backlogIdx = state.backlogTasks.findIndex(t => t.id === taskId);
                            if (backlogIdx !== -1) {
                                taskToMove = state.backlogTasks[backlogIdx];
                                foundLocation = 'backlog';
                            }
                        }
                    }

                    if (!taskToMove) return {};

                    let newCurrent = state.currentTask;
                    let newStack = [...state.taskStack];
                    let newBacklog = [...state.backlogTasks];
                    let newLog = [...state.taskLog];

                    // Remove from previous location
                    if (foundLocation === 'current') {
                        const now = Date.now();
                        const duration = now - newCurrent!.startTime;
                        newLog.unshift({
                            id: crypto.randomUUID(),
                            taskId: newCurrent!.id,
                            name: newCurrent!.name,
                            startTime: newCurrent!.startTime,
                            endTime: now,
                            duration,
                            status: location === 'backlog' ? 'paused' : 'interrupted'
                        });
                        taskToMove = { ...newCurrent!, duration: newCurrent!.duration + duration, status: 'paused' };
                        newCurrent = null;
                    } else if (foundLocation === 'stack') {
                        const idx = newStack.findIndex(t => t.id === taskId);
                        newStack.splice(idx, 1);
                    } else if (foundLocation === 'backlog') {
                        const idx = newBacklog.findIndex(t => t.id === taskId);
                        newBacklog.splice(idx, 1);
                    }

                    // 2. Insert into target location
                    if (location === 'current') {
                        // If there was an existing current task, push it to stack
                        if (newCurrent) {
                            const now = Date.now();
                            const duration = now - newCurrent.startTime;
                            newLog.unshift({
                                id: crypto.randomUUID(),
                                taskId: newCurrent.id,
                                name: newCurrent.name,
                                startTime: newCurrent.startTime,
                                endTime: now,
                                duration,
                                status: 'interrupted'
                            });
                            newStack.push({ ...newCurrent, duration: newCurrent.duration + duration, status: 'paused' });
                        }
                        newCurrent = { ...taskToMove!, startTime: Date.now(), status: 'pending' };
                    } else if (location === 'stack') {
                        newStack.push({ ...taskToMove!, status: 'paused' });
                    } else if (location === 'backlog') {
                        newBacklog.unshift({ ...taskToMove!, backlogId: backlogId || state.backlogCategories[0].id, status: 'paused' });
                    }

                    return {
                        currentTask: newCurrent,
                        taskStack: newStack,
                        backlogTasks: newBacklog,
                        taskLog: newLog
                    };
                });
            },

            importState: (data) => {
                set(() => ({
                    currentTask: data.state?.currentTask || data.currentTask || null,
                    taskStack: data.state?.taskStack || data.taskStack || [],
                    backlogTasks: data.state?.backlogTasks || data.backlogTasks || [],
                    backlogCategories: data.state?.backlogCategories || data.backlogCategories || [],
                    colors: data.state?.colors || data.colors || DEFAULT_COLORS,
                    history: data.state?.history || data.history || [],
                    recurringTasks: data.state?.recurringTasks || data.recurringTasks || [],
                    taskLog: data.state?.taskLog || data.taskLog || [],
                }));
            },

            reorderAllTasks: (newAllTasks) => {
                set((state) => {
                    if (newAllTasks.length === 0) return { currentTask: null, taskStack: [], backlogTasks: [] };

                    // Identify the boundaries
                    const prevActiveCount = (state.currentTask ? 1 : 0) + state.taskStack.length;
                    const defaultBacklogId = state.backlogCategories[0]?.id || 'main';

                    const movedTasks = newAllTasks.map((t, idx) => {
                        const newTask = { ...t };

                        // Section crossing logic:
                        // Top task is ALWAYS Current.
                        // Items at index 1...prevActiveCount-1 are ALWAYS Stack.
                        // The rest are Backlog.

                        if (idx === 0) {
                            newTask.status = 'paused'; // Top task
                        } else if (idx < prevActiveCount) {
                            newTask.status = 'paused'; // Stack task
                        } else {
                            newTask.status = 'paused'; // Backlog task
                        }

                        // Restore/Update backlogId
                        if (newTask.backlogId === '__CURRENT__' || newTask.backlogId === '__STACK__') {
                            const original = state.backlogTasks.find(bt => bt.id === t.id) ||
                                state.taskStack.find(s => s.id === t.id) ||
                                (state.currentTask?.id === t.id ? state.currentTask : null);
                            newTask.backlogId = original?.backlogId || defaultBacklogId;
                        }

                        return newTask;
                    });

                    const topTask = movedTasks.shift()!;

                    let newLog = [...state.taskLog];
                    if (state.currentTask && state.currentTask.id !== topTask.id) {
                        const now = Date.now();
                        const duration = now - state.currentTask.startTime;
                        newLog.unshift({
                            id: crypto.randomUUID(),
                            taskId: state.currentTask.id,
                            name: state.currentTask.name,
                            startTime: state.currentTask.startTime,
                            endTime: now,
                            duration,
                            status: 'paused'
                        });
                        topTask.startTime = now;
                    } else if (!state.currentTask) {
                        topTask.startTime = Date.now();
                    }

                    const newStack: Task[] = [];
                    const newBacklog: Task[] = [];

                    movedTasks.forEach((task, idx) => {
                        // idx here is originalIndex - 1
                        if (idx < prevActiveCount - 1) {
                            newStack.push(task);
                        } else {
                            newBacklog.push(task);
                        }
                    });

                    return {
                        currentTask: topTask,
                        taskStack: newStack,
                        backlogTasks: newBacklog,
                        taskLog: newLog
                    };
                });
            },

            setPaused: (paused) => {
                set((state) => {
                    if (!state.currentTask) return {};
                    if (paused && state.currentTask.status !== 'paused') {
                        const now = Date.now();
                        const duration = now - state.currentTask.startTime;
                        return {
                            currentTask: { ...state.currentTask, status: 'paused', duration: state.currentTask.duration + duration },
                            taskLog: [{
                                id: crypto.randomUUID(),
                                taskId: state.currentTask.id,
                                name: state.currentTask.name,
                                startTime: state.currentTask.startTime,
                                endTime: now,
                                duration,
                                status: 'paused'
                            }, ...state.taskLog]
                        };
                    } else if (!paused && state.currentTask.status === 'paused') {
                        return {
                            currentTask: { ...state.currentTask, status: 'pending', startTime: Date.now() }
                        };
                    }
                    return {};
                });
            },

            toggleRecurringMinimized: () => {
                set((state) => {
                    const newValue = !state.isRecurringMinimized;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('timetask-ui-recurring-minimized', String(newValue));
                    }
                    return { isRecurringMinimized: newValue };
                });
            },

            toggleHistoryMinimized: () => {
                set((state) => {
                    const newValue = !state.isHistoryMinimized;
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('timetask-ui-history-minimized', String(newValue));
                    }
                    return { isHistoryMinimized: newValue };
                });
            },

            addManualTaskLogEntry: (taskId, name, startTime, endTime, duration, status) => {
                set((state) => {
                    const newEntry: TaskLogEntry = {
                        id: crypto.randomUUID(),
                        taskId,
                        name,
                        startTime,
                        endTime,
                        duration,
                        status
                    };
                    return { taskLog: [...state.taskLog, newEntry] };
                });
            },

            updateTaskLogs: (logs) => {
                set((state) => {
                    const newLog = [...state.taskLog];
                    logs.forEach(log => {
                        const index = newLog.findIndex(l => l.id === log.id);
                        if (index >= 0) {
                            newLog[index] = log;
                        }
                    });
                    // Removed sorting here to preserve the original task order exactly as it was before editing
                    return { taskLog: newLog };
                });
            }
        }),
        {
            name: 'timetask-storage',
            storage: createJSONStorage(() => localStorage),
            version: 1,
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    const oldBacklog = persistedState.backlog || [];
                    const defaultCategory: BacklogCategory = {
                        id: 'main',
                        name: 'Main Backlog',
                        allocatedMinutes: 0
                    };
                    const newBacklogTasks = oldBacklog.map((t: any) => ({
                        ...t,
                        backlogId: 'main'
                    }));

                    persistedState.backlogTasks = newBacklogTasks;
                    persistedState.backlogCategories = [defaultCategory];
                    persistedState.colors = DEFAULT_COLORS;
                    delete persistedState.backlog;
                }
                return persistedState as TaskState;
            },
            partialize: (state) => {
                const { isRecurringMinimized, isHistoryMinimized, frontPanelId, draggedTaskId, ...rest } = state;
                return rest;
            }
        }
    )
);
