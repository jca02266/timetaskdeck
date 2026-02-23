"use client";

import { useTaskStore, Task, BacklogCategory, ColorDefinition } from '@/store/useTaskStore';
import { Table, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Plus, X, GripVertical, Calendar, ListFilter, Play } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

type SortKey = 'name' | 'color' | 'backlog' | 'scheduled';
type SortDirection = 'asc' | 'desc';

interface TaskTableViewProps {
    isOpen: boolean;
    onClose: () => void;
}

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

export function TaskTableView({ isOpen, onClose }: TaskTableViewProps) {
    const backlogTasks = useTaskStore((state) => state.backlogTasks);
    const currentTask = useTaskStore((state) => state.currentTask);
    const taskStack = useTaskStore((state) => state.taskStack);
    const categories = useTaskStore((state) => state.backlogCategories);
    const colors = useTaskStore((state) => state.colors);

    const updateTaskName = useTaskStore((state) => state.updateTaskName);
    const updateTaskColorId = useTaskStore((state) => state.updateTaskColorId);
    const updateTaskBacklogId = useTaskStore((state) => state.updateTaskBacklogId);
    const moveTaskToLocation = useTaskStore((state) => state.moveTaskToLocation);
    const updateTaskSchedule = useTaskStore((state) => state.updateTaskSchedule);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const addToBacklog = useTaskStore((state) => state.addToBacklog);
    const addBacklogCategory = useTaskStore((state) => state.addBacklogCategory);

    const [sortKey, setSortKey] = useState<SortKey>('backlog');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');
    const [isSortActive, setIsSortActive] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const reorderAllTasks = useTaskStore((state) => state.reorderAllTasks);
    const setPaused = useTaskStore((state) => state.setPaused);

    // Auto-pause when open
    useEffect(() => {
        if (isOpen) {
            setPaused(true);
        } else {
            setPaused(false);
        }
    }, [isOpen, setPaused]);

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

    const sortedTasks = useMemo(() => {
        let allTasks: Task[] = [];
        if (currentTask) {
            allTasks.push({ ...currentTask, backlogId: '__CURRENT__' });
        }
        if (taskStack.length > 0) {
            allTasks = [...allTasks, ...taskStack.map(t => ({ ...t, backlogId: '__STACK__' }))];
        }
        allTasks = [...allTasks, ...backlogTasks];

        if (!isSortActive) return allTasks;

        return allTasks.sort((a, b) => {
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
                    valA = catA ? catA.name.toLowerCase() : '';
                    valB = catB ? catB.name.toLowerCase() : '';
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
    }, [backlogTasks, sortKey, sortDir, categories, colors]);

    if (!isOpen) return null;

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (!isSortActive || sortKey !== columnKey) return null;
        return sortDir === 'asc' ? <ArrowUp size={12} className="text-slate-400" /> : <ArrowDown size={12} className="text-slate-400" />;
    };

    const handleAddTask = () => {
        addToBacklog('New Task');
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={16} />
                        <span>Create Card</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 ml-4 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                        title="Close"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 w-full max-w-7xl mx-auto px-8 pb-12 min-h-0">
                <div className="w-full h-full bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">

                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
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
                                {sortedTasks.map((task, index) => {
                                    const activeColorDef = colors.find(c => c.id === task.colorId);
                                    const pillClasses = getPillClasses(activeColorDef?.colorCode);

                                    const dateDisplay = task.scheduledDate
                                        ? format(parseISO(task.scheduledDate), 'MMM d, yyyy')
                                        : 'Set Date';

                                    return (
                                        <tr
                                            key={task.id}
                                            className={`hover:bg-slate-800/40 transition-colors group ${draggedIndex === index ? 'opacity-30' : ''} ${task.backlogId === '__CURRENT__' ? 'bg-blue-500/5' : ''}`}
                                            draggable={!isSortActive}
                                            onDragStart={() => !isSortActive && setDraggedIndex(index)}
                                            onDragOver={(e) => {
                                                if (isSortActive) return;
                                                e.preventDefault();
                                                if (draggedIndex === null || draggedIndex === index) return;

                                                const newAllTasks = [...sortedTasks];
                                                const [moved] = newAllTasks.splice(draggedIndex, 1);
                                                newAllTasks.splice(index, 0, moved);

                                                reorderAllTasks(newAllTasks);
                                                setDraggedIndex(index);
                                            }}
                                            onDragEnd={() => setDraggedIndex(null)}
                                        >
                                            <td className="px-6 py-4 text-slate-600">
                                                {!isSortActive && (
                                                    <GripVertical size={16} className="cursor-grab hover:text-slate-400 active:cursor-grabbing" />
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
                                                        onChange={(e) => updateTaskColorId(task.id, e.target.value === '' ? undefined : e.target.value)}
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
                                                    value={task.name}
                                                    onChange={(e) => updateTaskName(task.id, e.target.value)}
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
                                                                const newId = addBacklogCategory();
                                                                moveTaskToLocation(task.id, 'backlog', newId);
                                                            } else if (val === '__CURRENT__') {
                                                                moveTaskToLocation(task.id, 'current');
                                                            } else if (val === '__STACK__') {
                                                                moveTaskToLocation(task.id, 'stack');
                                                            } else {
                                                                moveTaskToLocation(task.id, 'backlog', val);
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
                                                <div className="relative flex items-center gap-2 group/date">
                                                    <Calendar size={14} className="text-slate-500" />
                                                    <span className="text-slate-400 text-xs">{dateDisplay}</span>
                                                    <input
                                                        type="date"
                                                        value={task.scheduledDate || ''}
                                                        onChange={(e) => updateTaskSchedule(task.id, e.target.value, undefined)}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-slate-800/80"
                                                    onClick={() => {
                                                        if (window.confirm('このタスクを削除してもよろしいですか？')) {
                                                            deleteTask(task.id);
                                                        }
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {sortedTasks.length === 0 && (
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
