"use client";

import { useTaskStore, Task, BacklogCategory, ColorDefinition } from '@/store/useTaskStore';
import { Table, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';

type SortKey = 'name' | 'color' | 'backlog' | 'scheduled';
type SortDirection = 'asc' | 'desc';

interface BacklogTableViewProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BacklogTableView({ isOpen, onClose }: BacklogTableViewProps) {
    const backlogTasks = useTaskStore((state) => state.backlogTasks);
    const categories = useTaskStore((state) => state.backlogCategories);
    const colors = useTaskStore((state) => state.colors);

    const updateTaskName = useTaskStore((state) => state.updateTaskName);
    const updateTaskColorId = useTaskStore((state) => state.updateTaskColorId);
    const updateTaskBacklogId = useTaskStore((state) => state.updateTaskBacklogId);
    const updateTaskSchedule = useTaskStore((state) => state.updateTaskSchedule);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const addToBacklog = useTaskStore((state) => state.addToBacklog);

    const [sortKey, setSortKey] = useState<SortKey>('backlog');
    const [sortDir, setSortDir] = useState<SortDirection>('asc');

    const [newTaskName, setNewTaskName] = useState('');

    if (!isOpen) return null;

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortedTasks = useMemo(() => {
        return [...backlogTasks].sort((a, b) => {
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

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return <ArrowUpDown size={12} className="opacity-30" />;
        return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName.trim()) return;
        addToBacklog(newTaskName);
        setNewTaskName('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-8">
            <div className="w-full max-w-5xl h-full max-h-[85vh] bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 uppercase tracking-wider font-bold text-slate-200">
                        <Table size={18} />
                        <span>Backlog Table View</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-700 rounded p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col flex-1 min-h-0 bg-slate-900/50 relative">
                    {/* Fixed Headers / Scrollable Body requires careful markup. 
                        We use a wrapper with flex-1 min-h-0 so the tr elements can scroll.
                    */}
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 bg-slate-800 text-slate-400 z-10 text-xs uppercase shadow-md">
                                <tr>
                                    <th className="px-4 py-3 cursor-pointer hover:text-white transition-colors w-1/3" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">Task Name <SortIcon columnKey="name" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-white transition-colors w-32" onClick={() => handleSort('color')}>
                                        <div className="flex items-center gap-1">Color <SortIcon columnKey="color" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-white transition-colors w-40" onClick={() => handleSort('backlog')}>
                                        <div className="flex items-center gap-1">Backlog <SortIcon columnKey="backlog" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-white transition-colors w-32" onClick={() => handleSort('scheduled')}>
                                        <div className="flex items-center gap-1">Scheduled <SortIcon columnKey="scheduled" /></div>
                                    </th>
                                    <th className="px-4 py-3 w-10 text-center">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {sortedTasks.map(task => {
                                    const activeColorDef = colors.find(c => c.id === task.colorId);
                                    const colorBadgeClass = activeColorDef ? activeColorDef.colorCode : 'bg-transparent border border-slate-600 border-dashed';

                                    return (
                                        <tr key={task.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-4 py-2 truncate max-w-xs">
                                                <input
                                                    type="text"
                                                    value={task.name}
                                                    onChange={(e) => updateTaskName(task.id, e.target.value)}
                                                    className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none w-full truncate"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="relative group/custom">
                                                    <select
                                                        value={task.colorId || ''}
                                                        onChange={(e) => updateTaskColorId(task.id, e.target.value === '' ? undefined : e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs appearance-none cursor-pointer hover:border-slate-500 text-slate-300 pr-6"
                                                    >
                                                        <option value="">None</option>
                                                        {colors.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className={`absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none ${colorBadgeClass}`} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <select
                                                    value={task.backlogId || ''}
                                                    onChange={(e) => updateTaskBacklogId(task.id, e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs appearance-none cursor-pointer hover:border-slate-500 text-slate-300"
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-1 items-center">
                                                    <input
                                                        type="date"
                                                        value={task.scheduledDate || ''}
                                                        onChange={(e) => updateTaskSchedule(task.id, e.target.value, undefined)}
                                                        className="bg-transparent hover:bg-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-400 focus:outline-none cursor-pointer"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    onClick={() => {
                                                        if (window.confirm('このタスクを削除してもよろしいですか？')) {
                                                            deleteTask(task.id);
                                                        }
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {sortedTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-slate-500 text-xs italic">
                                            No tasks found in backlog.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Quick Add Row - Stick to bottom */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
                        <form onSubmit={handleAddTask} className="flex gap-2">
                            <input
                                type="text"
                                value={newTaskName}
                                onChange={(e) => setNewTaskName(e.target.value)}
                                placeholder="Add a new task to Main Backlog..."
                                className="flex-1 bg-slate-950 border border-slate-700/50 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-1 font-medium"
                            >
                                <Plus size={16} />
                                <span className="text-sm">Add Task</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
