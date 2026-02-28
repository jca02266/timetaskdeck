"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { X, Search, Play, Layers, ListTodo, Repeat, Clock, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface TaskSelectionDialogProps {
    onSelect: (taskId: string, name: string) => void;
    onClose: () => void;
}

export function TaskSelectionDialog({ onSelect, onClose }: TaskSelectionDialogProps) {
    const {
        currentTask,
        taskStack,
        backlogTasks,
        backlogCategories,
        recurringTasks,
        history
    } = useTaskStore();

    const [search, setSearch] = useState('');

    const filteredSections = useMemo(() => {
        const s = search.toLowerCase();

        const sections = [
            {
                title: 'Active Tasks',
                icon: <Play size={14} className="text-blue-400" />,
                tasks: [
                    ...(currentTask ? [{ id: currentTask.id, name: currentTask.name, type: 'current' }] : []),
                    ...taskStack.map(t => ({ id: t.id, name: t.name, type: 'stack' }))
                ]
            },
            {
                title: 'Backlog',
                icon: <ListTodo size={14} className="text-green-400" />,
                tasks: backlogTasks.map(t => ({ id: t.id, name: t.name, type: 'backlog' }))
            },
            {
                title: 'Recurring',
                icon: <Repeat size={14} className="text-purple-400" />,
                tasks: recurringTasks.map(t => ({ id: t.id, name: t.name, type: 'recurring' }))
            },
            {
                title: 'Recent History',
                icon: <Clock size={14} className="text-slate-400" />,
                tasks: Array.from(new Map(history.slice(-50).reverse().map(t => [t.name, t])).values())
                    .map(t => ({ id: t.id, name: t.name, type: 'history' }))
            }
        ];

        return sections.map(section => ({
            ...section,
            tasks: section.tasks.filter(t => t.name.toLowerCase().includes(s))
        })).filter(section => section.tasks.length > 0);
    }, [search, currentTask, taskStack, backlogTasks, recurringTasks, history]);

    return createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                        <Search size={16} className="text-blue-400" />
                        Select Task
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search tasks or enter new name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && search.trim()) {
                                    onSelect(`manual-${Date.now()}`, search.trim());
                                }
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                    {filteredSections.length === 0 && search.trim() && (
                        <button
                            onClick={() => onSelect(`manual-${Date.now()}`, search.trim())}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-500/10 text-blue-400 transition-all border border-dashed border-blue-500/30 group"
                        >
                            <Plus size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">Create new task: "{search}"</span>
                        </button>
                    )}

                    {filteredSections.map((section) => (
                        <div key={section.title} className="space-y-1.5">
                            <div className="flex items-center gap-2 px-3 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {section.icon}
                                {section.title}
                            </div>
                            <div className="grid gap-1">
                                {section.tasks.map((task) => (
                                    <button
                                        key={`${task.type}-${task.id}`}
                                        onClick={() => onSelect(task.id, task.name)}
                                        className="w-full flex items-center p-3 rounded-xl hover:bg-slate-800/80 text-left transition-all border border-transparent hover:border-slate-700 group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-slate-200 font-medium truncate group-hover:text-white">
                                                {task.name}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {!search.trim() && filteredSections.length === 0 && (
                        <div className="p-8 text-center text-slate-500 italic text-sm">
                            No tasks found. Try searching for a task.
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
                    <p className="text-[10px] text-slate-500 font-medium">Tip: Press Enter to create a manual task</p>
                    <button
                        onClick={onClose}
                        className="text-[10px] text-slate-400 hover:text-white uppercase font-bold tracking-widest"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
