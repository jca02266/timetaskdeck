"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { ListTodo, Play, Plus, Pencil, Check, X, Trash2, GripVertical } from 'lucide-react';
import { useState, useRef } from 'react';

export function BacklogList() {
    const { backlog, addToBacklog, pickFromBacklog, updateTaskName, deleteTask, reorderBacklog } = useTaskStore();
    const [newItem, setNewItem] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;
        addToBacklog(newItem);
        setNewItem('');
    };

    const startEditing = (task: { id: string, name: string }) => {
        setEditingId(task.id);
        setEditValue(task.name);
    };

    const saveEdit = () => {
        if (editingId && editValue.trim()) {
            updateTaskName(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // e.dataTransfer.setData("text/plain", index.toString()); // Optional, but good practice
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        reorderBacklog(draggedIndex, targetIndex);
        setDraggedIndex(null);
    };

    return (
        <div className="glass-panel p-4 w-80 fixed bottom-8 right-8 flex flex-col max-h-[50vh] z-50">
            <div className="flex items-center gap-2 mb-3 text-slate-400 text-sm uppercase tracking-wider font-semibold shrink-0">
                <ListTodo size={16} />
                <span>Backlog</span>
            </div>

            <form onSubmit={handleAdd} className="flex gap-2 shrink-0 mb-3">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add quick task..."
                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button
                    type="submit"
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                    <Plus size={16} />
                </button>
            </form>

            <div className="overflow-y-auto flex-1 min-h-0 space-y-2 mb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-2">
                {backlog.length === 0 && (
                    <div className="text-slate-600 text-center py-4 text-sm italic">
                        No tasks in backlog
                    </div>
                )}
                {backlog.map((task, index) => (
                    <div
                        key={task.id}
                        draggable={editingId === null} // Disable drag when editing
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`group bg-slate-800/30 hover:bg-slate-800/80 p-3 rounded-lg border border-transparent hover:border-slate-600 transition-all flex items-center justify-between gap-2 ${draggedIndex === index ? 'opacity-50' : ''}`}
                    >
                        {/* Numbering */}
                        <div className="text-xs text-slate-500 font-mono w-4 flex-shrink-0">
                            {index + 1}
                        </div>

                        {editingId === task.id ? (
                            <div className="flex items-center gap-1 w-full">
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                    }}
                                />
                                <button onClick={saveEdit} className="text-green-400 hover:text-green-300 p-1">
                                    <Check size={14} />
                                </button>
                                <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-1">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-sm text-slate-300 truncate flex-1 flex items-center gap-2">
                                    {/* Drag Handle - visual cue */}
                                    <div className="cursor-grab text-slate-600 hover:text-slate-400">
                                        <GripVertical size={14} />
                                    </div>
                                    <span className="truncate">{task.name}</span>
                                </div>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                    <button
                                        onClick={() => startEditing(task)}
                                        className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                        title="Rename"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('このタスクを削除してもよろしいですか？')) {
                                                deleteTask(task.id);
                                            }
                                        }}
                                        className="text-red-400 hover:text-red-300 p-1 rounded"
                                        title="Delete Task"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => pickFromBacklog(task.id)}
                                        className="text-blue-400 hover:text-blue-300 p-1 rounded"
                                        title="Start Task"
                                    >
                                        <Play size={14} fill="currentColor" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
