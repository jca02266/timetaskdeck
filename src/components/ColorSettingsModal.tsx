"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { X, Check } from 'lucide-react';
import { useState } from 'react';

interface ColorSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ColorSettingsModal({ isOpen, onClose }: ColorSettingsModalProps) {
    const colors = useTaskStore((state) => state.colors);
    const updateColorName = useTaskStore((state) => state.updateColorName);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    if (!isOpen) return null;

    const startEditing = (id: string, currentName: string) => {
        setEditingId(id);
        setEditValue(currentName);
    };

    const saveEdit = () => {
        if (editingId && editValue.trim()) {
            updateColorName(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[400px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-200">Task Colors</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    {colors.map((color) => {
                        const bgClass = color.colorCode;

                        return (
                            <div key={color.id} className="flex items-center gap-4 bg-slate-800/50 p-2 rounded">
                                <div className={`w-6 h-6 rounded-full ${bgClass} shrink-0 shadow-inner`} />

                                {editingId === color.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="flex-1 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                                if (e.key === 'Enter') saveEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            onBlur={saveEdit}
                                        />
                                        <button onClick={saveEdit} className="text-green-400 hover:text-green-300 p-1">
                                            <Check size={14} />
                                        </button>
                                        <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-1">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="flex-1 text-sm text-slate-300 cursor-text hover:text-white"
                                        onClick={() => startEditing(color.id, color.name)}
                                        title="Click to edit name"
                                    >
                                        {color.name}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
