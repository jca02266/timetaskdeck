import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { useTaskStore, Task } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { Trash2, ArrowUp, ArrowDown, Plus, X, GripVertical, ListFilter, Play, Search, Bell } from 'lucide-react';
import { TaskScheduleInput } from './TaskScheduleInput';
import { TaskMemoButton } from './TaskMemoButton';

type SortKey = 'name' | 'color' | 'backlog' | 'scheduled';
type SortDirection = 'asc' | 'desc';

function getPillClasses(colorCode?: string) {
    if (!colorCode) return 'bg-slate-800 border-slate-700 text-slate-400';
    if (colorCode.includes('red')) return 'bg-red-500/10 border-red-500/20 text-red-400';
    if (colorCode.includes('blue')) return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    if (colorCode.includes('green')) return 'bg-green-500/10 border-green-500/20 text-green-400';
    if (colorCode.includes('yellow')) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
    if (colorCode.includes('purple')) return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
    if (colorCode.includes('pink')) return 'bg-pink-500/10 border-pink-500/20 text-pink-400';
    if (colorCode.includes('orange')) return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
    return 'bg-slate-500/10 border-slate-500/20 text-slate-400';
}

export function TaskTableView() {
    const isTaskTableOpen = useTaskStore((state) => state.activeDialog === 'taskTable');
    const openDialog = useTaskStore((state) => state.openDialog);

    // Store data
    const backlogTasks = useTaskStore((state) => state.backlogTasks);
    const currentTask = useTaskStore((state) => state.currentTask);
    const taskStack = useTaskStore((state) => state.taskStack);
    const categories = useTaskStore((state) => state.backlogCategories);
    const colors = useTaskStore((state) => state.colors);
    const memos = useMemoStore((state) => state.memos);

    // Store actions
    const reorderAllTasks = useTaskStore((state) => state.reorderAllTasks);
    const setPaused = useTaskStore((state) => state.setPaused);
    const addBacklogCategory = useTaskStore((state) => state.addBacklogCategory);
    const bringToFront = useTaskStore((state) => state.bringToFront);

    // Local state for performance
    const [localTasks, setLocalTasks] = useState<Task[]>([]);

    // UI state
    const [sortKey, setSortKey] = useState<SortKey>('backlog');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');
    const [isSortActive, setIsSortActive] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const wasPausedRef = useRef<boolean>(false);
    const hasInitializedRef = useRef<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentTime = useTaskStore((state) => state.currentTime);
    const currentDate = useTaskStore((state) => state.currentDate);
    const currentDay = useTaskStore((state) => state.currentDay);

    // Initialize local state when modal opens
    useEffect(() => {
        if (isTaskTableOpen) {
            if (!hasInitializedRef.current) {
                wasPausedRef.current = currentTask?.status === 'paused';
                let allTasks: Task[] = [];
                if (currentTask) {
                    allTasks.push({ ...currentTask, backlogId: '__CURRENT__' });
                }
                if (taskStack.length > 0) {
                    allTasks = [...allTasks, ...taskStack.map(t => ({ ...t, backlogId: '__STACK__' }))];
                }
                allTasks = [...allTasks, ...backlogTasks];

                setLocalTasks(allTasks);
                setPaused(true);
                hasInitializedRef.current = true;
            }
        } else {
            if (hasInitializedRef.current) {
                // Only resume if it was NOT paused before we opened the view
                if (!wasPausedRef.current) {
                    setPaused(false);
                }
                hasInitializedRef.current = false;
            }
        }
    }, [isTaskTableOpen, currentTask, taskStack, backlogTasks, setPaused]);

    const handleSort = (key: SortKey) => {
        if (!isSortActive) {
            setIsSortActive(true);
        }
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const displayTasks = useMemo(() => {
        let filteredTasks = localTasks;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filteredTasks = filteredTasks.filter(task => {
                const nameMatch = task.name.toLowerCase().includes(query);
                const memoContent = memos[task.id] || '';
                const memoMatch = memoContent.toLowerCase().includes(query);
                return nameMatch || memoMatch;
            });
        }

        if (!isSortActive) return filteredTasks;

        return [...filteredTasks].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            switch (sortKey) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case 'color':
                    const colA = colors.find(c => c.id === a.colorId);
                    const colB = colors.find(c => c.id === b.colorId);
                    valA = colA ? colA.name.toLowerCase() : '';
                    valB = colB ? colB.name.toLowerCase() : '';
                    break;
                case 'backlog':
                    const catA = categories.find(c => c.id === a.backlogId);
                    const catB = categories.find(c => c.id === b.backlogId);
                    // Special virtual categories
                    if (a.backlogId === '__CURRENT__') valA = '00_CURRENT';
                    else if (a.backlogId === '__STACK__') valA = '01_STACK';
                    else valA = catA ? '02_' + catA.name.toLowerCase() : 'zz_none';

                    if (b.backlogId === '__CURRENT__') valB = '00_CURRENT';
                    else if (b.backlogId === '__STACK__') valB = '01_STACK';
                    else valB = catB ? '02_' + catB.name.toLowerCase() : 'zz_none';
                    break;
                case 'scheduled':
                    valA = (a.scheduledDate || '9999-99-99') + (a.scheduledTime || '99:99');
                    valB = (b.scheduledDate || '9999-99-99') + (b.scheduledTime || '99:99');
                    break;
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [localTasks, isSortActive, sortKey, sortDir, categories, colors, searchQuery, memos]);

    const isTaskScheduledNow = useCallback((task: Task) => {
        if (task.status === 'completed') return { isDue: false };
        let isDue = false;
        if (task.scheduledDate && task.scheduledTime) {
            isDue = `${currentDate}T${currentTime}` >= `${task.scheduledDate}T${task.scheduledTime}`;
        } else if (task.scheduledTime) {
            const isMatchingDate = !task.scheduledDate || task.scheduledDate === currentDate;
            const isMatchingDay = !task.scheduledDaysOfWeek || task.scheduledDaysOfWeek.includes(currentDay);
            const isDaily = task.scheduledDaysOfWeek && task.scheduledDaysOfWeek.length === 7;
            const timeMatch = isDaily || isMatchingDate || isMatchingDay;
            isDue = timeMatch && currentTime >= task.scheduledTime;
        }
        return { isDue };
    }, [currentDate, currentTime, currentDay]);

    const hasDueTask = displayTasks.some(t => isTaskScheduledNow(t).isDue);

    const handleClose = () => {
        // Commit local state to store then close
        // We need to merge updates into current store records to preserve ALL data
        // because localTasks might have had some fields stripped if display logic changes
        const currentTasks = useTaskStore.getState().backlogTasks;
        const currentStack = useTaskStore.getState().taskStack;
        const currentTask = useTaskStore.getState().currentTask;

        const merged = localTasks.map(updatedTask => {
            const original = currentTasks.find(t => t.id === updatedTask.id) ||
                currentStack.find(t => t.id === updatedTask.id) ||
                (currentTask?.id === updatedTask.id ? currentTask : null);

            if (original) {
                return { ...original, ...updatedTask };
            }
            return updatedTask;
        });

        reorderAllTasks(merged);
        openDialog(null);
    };

    const handleLocalUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
        setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }, []);

    const handleLocalDelete = React.useCallback((taskId: string) => {
        if (window.confirm('このタスクを削除してもよろしいですか？')) {
            setLocalTasks(prev => prev.filter(t => t.id !== taskId));
        }
    }, []);

    const handleAddTask = () => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            name: 'New Card',
            startTime: 0,
            duration: 0,
            status: 'pending',
            backlogId: categories[0]?.id || 'main',
            estimatedDurationMinutes: 30,
        };
        setLocalTasks(prev => [...prev, newTask]);
    };

    const handleAddCategory = useCallback((name?: string) => {
        return addBacklogCategory(name);
    }, [addBacklogCategory]);

    const handleDragStart = useCallback((index: number, e: React.PointerEvent, taskId: string) => {
        if (isSortActive) return;
        setDraggedIndex(index);
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);

        const onPointerMove = (moveEvent: PointerEvent) => {
            const overElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
            const row = overElement?.closest('tr');
            if (row) {
                const overIndexAttr = row.getAttribute('data-index');
                if (overIndexAttr !== null) {
                    const overIndex = parseInt(overIndexAttr);
                    setLocalTasks(prev => {
                        if (prev[overIndex].id === taskId) return prev;
                        const newTasks = [...prev];
                        const fromIndex = newTasks.findIndex(t => t.id === taskId);
                        if (fromIndex === -1) return prev;
                        const [moved] = newTasks.splice(fromIndex, 1);
                        newTasks.splice(overIndex, 0, moved);
                        return newTasks;
                    });
                }
            }
        };

        const onPointerUp = (upEvent: PointerEvent) => {
            target.releasePointerCapture(upEvent.pointerId);
            setDraggedIndex(null);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    }, [isSortActive]);

    if (!isTaskTableOpen) return null;

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (!isSortActive || sortKey !== columnKey) return null;
        return sortDir === 'asc' ? <ArrowUp size={12} className="text-slate-400" /> : <ArrowDown size={12} className="text-slate-400" />;
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
            {/* Header Section */}
            <div className="w-full max-w-7xl mx-auto px-8 py-10 flex justify-between items-start shrink-0">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Task Table View</h1>
                    <p className="text-slate-400 text-sm">Manage and prioritize all your cards and tasks across the deck.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search tasks or memos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all w-64 placeholder:text-slate-600"
                        />
                    </div>
                    {hasDueTask && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Find the due element within the table rows
                                const dueElement = containerRef.current?.querySelector('[data-is-due="true"]');
                                if (dueElement) {
                                    dueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                            className="animate-due-indicator flex items-center gap-1.5 px-3 py-1.5 min-w-[60px] justify-center text-red-200 bg-red-950/60 border border-red-500/50 rounded-md font-bold tracking-widest text-[10px]"
                            title="Due task in this view"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Bell size={14} />
                            <span>DUE</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsSortActive(!isSortActive)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all ${isSortActive
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                            : 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        <ListFilter size={16} />
                        <span>{isSortActive ? 'Sort: ON' : 'Sort: OFF'}</span>
                    </button>
                    <button
                        onClick={handleAddTask}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                        <Plus size={16} />
                        <span>Create Card</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-800 mx-2" />
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2"
                        title="Close and Save"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 w-full max-w-7xl mx-auto px-8 pb-12 min-h-0">
                <div className="w-full h-full bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">

                    <div ref={containerRef} className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 text-[11px] font-semibold tracking-widest text-slate-500 uppercase border-b border-slate-800/80">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center"></th>
                                    <th className="px-4 py-4 cursor-pointer hover:text-slate-300 transition-colors w-32 group/th" onClick={() => handleSort('color')}>
                                        <div className="flex items-center gap-1.5">タグ <SortIcon columnKey="color" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:text-slate-300 transition-colors" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1.5">Task Name <SortIcon columnKey="name" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:text-slate-300 transition-colors w-56" onClick={() => handleSort('backlog')}>
                                        <div className="flex items-center gap-1.5">Backlog/Category <SortIcon columnKey="backlog" /></div>
                                    </th>
                                    <th className="px-4 py-4 cursor-pointer hover:text-slate-300 transition-colors w-48" onClick={() => handleSort('scheduled')}>
                                        <div className="flex items-center gap-1.5">Scheduled Date <SortIcon columnKey="scheduled" /></div>
                                    </th>
                                    <th className="px-6 py-4 w-20 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {displayTasks.map((task, index) => (
                                    <TaskTableRow
                                        key={task.id}
                                        task={task}
                                        index={index}
                                        isSortActive={isSortActive}
                                        draggedIndex={draggedIndex}
                                        onUpdate={handleLocalUpdate}
                                        onDelete={handleLocalDelete}
                                        onDragStart={handleDragStart}
                                        categories={categories}
                                        colors={colors}
                                        onAddCategory={addBacklogCategory}
                                        isDue={isTaskScheduledNow(task).isDue}
                                    />
                                ))}

                                {displayTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                                            No tasks found. Click "Create Card" to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-component for each row to improve rendering performance via memo
const TaskTableRow = memo(function TaskTableRow({
    task,
    index,
    isSortActive,
    draggedIndex,
    onUpdate,
    onDelete,
    onDragStart,
    categories,
    colors,
    onAddCategory,
    isDue
}: {
    task: Task;
    index: number;
    isSortActive: boolean;
    draggedIndex: number | null;
    onUpdate: (id: string, updates: Partial<Task>) => void;
    onDelete: (id: string) => void;
    onDragStart: (index: number, e: React.PointerEvent, taskId: string) => void;
    categories: any[];
    colors: any[];
    onAddCategory: (name?: string) => string;
    isDue?: boolean;
}) {
    const activeColorDef = colors.find(c => c.id === task.colorId);
    const pillClasses = getPillClasses(activeColorDef?.colorCode);

    // Row component manages its own name input state to avoid parent re-renders while typing
    const [localName, setLocalName] = useState(task.name);

    // Sync from parent if name changes (e.g. from state reset)
    useEffect(() => {
        setLocalName(task.name);
    }, [task.name]);

    return (
        <tr
            data-index={index}
            data-is-due={isDue ? "true" : undefined}
            className={`transition-colors group ${draggedIndex === index ? 'opacity-30' : ''} ${task.backlogId === '__CURRENT__' ? 'bg-blue-500/5' : ''} ${isDue ? 'animate-due-card' : 'hover:bg-slate-800/40'}`}
        >
            <td className="px-6 py-4 text-slate-600 relative">
                {!isSortActive && (
                    <div
                        onPointerDown={(e) => onDragStart(index, e, task.id)}
                        className="cursor-grab hover:text-slate-400 active:cursor-grabbing p-1 -m-1"
                        style={{ touchAction: 'none' }}
                    >
                        <GripVertical size={16} />
                    </div>
                )}
                {index === 0 && !isSortActive && (
                    <div className="absolute left-2 text-blue-500 animate-pulse">
                        <Play size={16} fill="currentColor" />
                    </div>
                )}
            </td>

            <td className="px-4 py-4">
                <div className="relative inline-block w-full max-w-[100px]">
                    <select
                        value={task.colorId || ''}
                        onChange={(e) => onUpdate(task.id, { colorId: e.target.value === '' ? undefined : e.target.value })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="タグを設定"
                    >
                        <option value="">NONE</option>
                        {colors.map(c => (
                            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                        ))}
                    </select>
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border pointer-events-none ${pillClasses}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${activeColorDef?.colorCode || 'bg-slate-500'}`} />
                        <span>{activeColorDef ? activeColorDef.name : 'NONE'}</span>
                    </div>
                </div>
            </td>

            <td className="px-4 py-4 truncate max-w-md">
                <input
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    onBlur={() => {
                        if (localName !== task.name) {
                            onUpdate(task.id, { name: localName });
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none w-full truncate py-1 text-slate-200 transition-colors"
                    placeholder="Task Name"
                />
            </td>

            <td className="px-4 py-4">
                <div className="relative">
                    <select
                        value={task.backlogId || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__NEW__') {
                                const name = window.prompt("新しいバックログタスクデッキの名前を入力してください:", "New Backlog");
                                if (name !== null) {
                                    const newId = onAddCategory(name.trim());
                                    onUpdate(task.id, { backlogId: newId });
                                } else {
                                    // Revert if cancelled
                                    e.target.value = task.backlogId || '';
                                }
                            } else {
                                onUpdate(task.id, { backlogId: val });
                            }
                        }}
                        className="w-full bg-slate-800/50 hover:bg-slate-800 border border-transparent rounded-lg px-3 py-1.5 text-xs appearance-none cursor-pointer focus:border-slate-600 focus:outline-none text-slate-300 transition-colors shadow-sm pr-8"
                    >
                        <optgroup label="Active">
                            <option value="__CURRENT__">⚡ Current Task</option>
                            <option value="__STACK__">📚 Task Stack</option>
                        </optgroup>
                        <optgroup label="Backlog Categories">
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </optgroup>
                        <option value="__NEW__" className="text-blue-400 font-bold">+ New Category...</option>
                    </select>
                    {/* Custom chevron */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <ArrowDown size={12} />
                    </div>
                </div>
            </td>

            <td className="px-4 py-4">
                <TaskScheduleInput
                    date={task.scheduledDate}
                    time={task.scheduledTime}
                    daysOfWeek={task.scheduledDaysOfWeek}
                    autoStart={task.autoStart}
                    estimatedDurationMinutes={task.estimatedDurationMinutes}
                    onUpdate={(d, t, days, auto) => onUpdate(task.id, { scheduledDate: d, scheduledTime: t, scheduledDaysOfWeek: days, autoStart: auto })}
                    onEstimatedDurationChange={(minutes) => onUpdate(task.id, { estimatedDurationMinutes: minutes })}
                />
            </td>

            <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                <TaskMemoButton
                    taskId={task.id}
                    recurringTaskId={task.recurringTaskId}
                    iconSize={16}
                    className="p-2 hover:bg-slate-800/80"
                />
                <button
                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-slate-800/80"
                    onClick={() => onDelete(task.id)}
                    title="Delete"
                >
                    <Trash2 size={16} />
                </button>
            </td>
        </tr>
    );
});
