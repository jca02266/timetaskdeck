"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { Download, RotateCcw, Clock, Pencil, Check, X, Trash2, Copy, Minimize2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { useState } from 'react';
import { DatePicker } from './DatePicker';
import { Tooltip } from './Tooltip';
import { DraggablePanel } from './DraggablePanel';

export function HistoryView() {
    const history = useTaskStore((state) => state.history);
    const reopenTask = useTaskStore((state) => state.reopenTask);
    const updateTaskName = useTaskStore((state) => state.updateTaskName);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const copyToRecurring = useTaskStore((state) => state.copyToRecurring);
    const toggleHistoryMinimized = useTaskStore((state) => state.toggleHistoryMinimized);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

    const displayHistory = history.filter(task => isSameDay(new Date(task.startTime), selectedDate));

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

    const exportCSV = () => {
        const headers = ['Task Name', 'Start Time', 'End Time', 'Duration (seconds)', 'Status'];
        const rows = history.map(t => [
            t.name,
            new Date(t.startTime).toISOString(),
            t.endTime ? new Date(t.endTime).toISOString() : '',
            Math.floor(t.duration / 1000).toString(),
            t.status
        ]);

        const quote = (str: string) => `"${str.replace(/"/g, '""')}"`;
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(quote).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `timetask_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDuration = (ms: number) => {
        const totalMin = Math.floor(ms / 60000);
        const hours = Math.floor(totalMin / 60);
        const minutes = totalMin % 60;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (history.length === 0) return null;

    return (
        <DraggablePanel
            id="history-panel"
            defaultPosition={{ bottom: 32, left: 32 }}
            defaultSize={{ width: 320, height: 400 }}
            minSize={{ width: 320, height: 250 }}
            title={
                <div className="flex items-center gap-2 uppercase tracking-wider">
                    <Clock size={16} />
                    <span>完了タスクデッキ ({displayHistory.length})</span>
                </div>
            }
            headerControls={
                <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
                    {/* Date Navigation */}
                    <div className="flex items-center bg-slate-900/50 rounded-lg border border-slate-700">
                        <button
                            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                            className="p-1 rounded-l hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center justify-center px-1">
                            <DatePicker
                                value={format(selectedDate, 'yyyy-MM-dd')}
                                onChange={(val) => {
                                    if (val) setSelectedDate(startOfDay(parseISO(val)));
                                }}
                                className="bg-transparent border-none text-xs font-mono text-slate-200 hover:text-white justify-center h-auto py-1 px-1 pointer-cursor text-center"
                            />
                        </div>
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            className="p-1 rounded-r hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            disabled={isSameDay(selectedDate, startOfDay(new Date()))}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={exportCSV}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                            title="Export CSV"
                        >
                            <Download size={14} />
                        </button>
                        <button
                            onClick={() => toggleHistoryMinimized()}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                            title="Minimize"
                        >
                            <Minimize2 size={14} />
                        </button>
                    </div>
                </div>
            }
        >


            <div className="overflow-y-auto flex-1 min-h-0 space-y-2 p-4 pt-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {displayHistory.length === 0 && (
                    <div className="text-center text-slate-500 text-sm mt-4 italic">No tasks completed on this date.</div>
                )}
                {displayHistory.map((task) => (
                    <div key={task.id} className="group bg-slate-800/30 hover:bg-slate-800/80 p-3 rounded-lg border border-transparent hover:border-slate-600 transition-all">
                        <div className="flex justify-between items-start mb-1">
                            {editingId === task.id ? (
                                <div className="flex items-center gap-1 w-full mb-1">
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
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
                                    <Tooltip text={task.name}>
                                        <div className="text-sm text-slate-300 font-medium truncate flex-1">{task.name}</div>
                                    </Tooltip>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditing(task);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                            title="Rename"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToRecurring(task.id);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                                            title="定期タスクにコピー"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                useTaskStore.getState().openMemo(task.id);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                                            title="Open Memo"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('このタスクを削除してもよろしいですか？')) {
                                                    deleteTask(task.id);
                                                }
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="text-red-400 hover:text-red-300 p-1 rounded"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                reopenTask(task.id);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="text-blue-400 hover:text-blue-300 p-1 rounded"
                                            title="Reopen Task"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>{format(task.startTime, 'HH:mm')} - {task.endTime ? format(task.endTime, 'HH:mm') : ''}</span>
                            <span>{formatDuration(task.duration)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </DraggablePanel>
    );
}
