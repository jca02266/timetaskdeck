"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { Repeat, Play, Plus, Pencil, Check, X, Trash2, GripVertical, CheckCircle2, Circle, Minimize2, FileText } from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from './Tooltip';
import { DatePicker } from './DatePicker';
import { DraggablePanel } from './DraggablePanel';
import { TaskScheduleInput } from './TaskScheduleInput';

export function RecurringTasks() {
    const {
        recurringTasks,
        addRecurringTask,
        updateRecurringTask,
        deleteRecurringTask,
        reorderRecurringTasks,
        toggleRecurringTaskCheck,
        startRecurringTask,
        updateTaskSchedule,
        toggleRecurringMinimized
    } = useTaskStore();

    const [newItem, setNewItem] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');

    // Update current time every minute to check schedules
    useState(() => {
        const updateTime = () => {
            const now = new Date();
            const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            setCurrentTime(timeString);
            setCurrentDate(dateString);
        };
        updateTime();
        const interval = setInterval(updateTime, 10000); // Check every 10s
        return () => clearInterval(interval);
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;
        addRecurringTask(newItem);
        setNewItem('');
    };

    // ... existing helpers ...

    const startEditing = (task: { id: string, name: string }) => {
        setEditingId(task.id);
        setEditValue(task.name);
    };

    const saveEdit = () => {
        if (editingId && editValue.trim()) {
            updateRecurringTask(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };


    return (
        <DraggablePanel
            id="recurring-panel"
            defaultPosition={{ top: 32, right: 32 }}
            defaultSize={{ width: 320, height: 400 }}
            minSize={{ width: 320, height: 250 }}
            title={
                <div className="flex items-center gap-2 uppercase tracking-wider">
                    <Repeat size={16} />
                    <span>定期タスクデッキ</span>
                </div>
            }
            headerControls={
                <button
                    onClick={() => toggleRecurringMinimized()}
                    className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                    title="Minimize"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Minimize2 size={14} />
                </button>
            }
        >
            <form onSubmit={handleAdd} className="flex gap-2 shrink-0 mb-3 px-4 pt-2">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add recurring task..."
                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button
                    type="submit"
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                    <Plus size={16} />
                </button>
            </form>

            <div className="overflow-y-auto flex-1 min-h-0 space-y-2 mb-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent px-4 pb-2">
                {recurringTasks.length === 0 && (
                    <div className="text-slate-600 text-center py-4 text-sm italic">
                        No recurring tasks
                    </div>
                )}
                {recurringTasks.map((task, index) => {
                    const isTimeDue = task.scheduledTime === currentTime;
                    const isDateDue = !task.scheduledDate || task.scheduledDate === currentDate;
                    const isDue = isTimeDue && isDateDue && task.status !== 'completed';

                    return (
                        <div
                            key={task.id}
                            data-index={index}
                            onPointerDown={(e) => {
                                if (e.button !== 0 || editingId !== null) return;
                                const startTime = Date.now();
                                const startPos = { x: e.clientX, y: e.clientY };
                                let hasMoved = false;

                                const target = e.currentTarget as HTMLElement;
                                target.setPointerCapture(e.pointerId);

                                const onPointerMove = (moveEvent: PointerEvent) => {
                                    const dist = Math.sqrt(
                                        Math.pow(moveEvent.clientX - startPos.x, 2) +
                                        Math.pow(moveEvent.clientY - startPos.y, 2)
                                    );

                                    if (dist > 8 && !hasMoved) {
                                        hasMoved = true;
                                        setDraggedIndex(index);
                                    }

                                    if (hasMoved) {
                                        const overElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                                        const overRow = overElement?.closest('div[data-index]');
                                        if (overRow) {
                                            const overIndexAttr = overRow.getAttribute('data-index');
                                            if (overIndexAttr !== null) {
                                                const overIndex = parseInt(overIndexAttr);
                                                if (overIndex !== index) {
                                                    reorderRecurringTasks(index, overIndex);
                                                    setDraggedIndex(overIndex);
                                                }
                                            }
                                        }
                                    }
                                };

                                const onPointerUp = (upEvent: PointerEvent) => {
                                    target.releasePointerCapture(upEvent.pointerId);
                                    window.removeEventListener('pointermove', onPointerMove);
                                    window.removeEventListener('pointerup', onPointerUp);
                                    setDraggedIndex(null);
                                };

                                window.addEventListener('pointermove', onPointerMove);
                                window.addEventListener('pointerup', onPointerUp);
                            }}
                            className={`group bg-slate-800/30 hover:bg-slate-800/80 p-3 rounded-lg border border-transparent hover:border-slate-600 transition-all flex items-center justify-between gap-2 select-none
                                ${draggedIndex === index ? 'opacity-50' : ''} 
                                ${isDue ? 'animate-blink border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : ''}`}
                            style={{ touchAction: 'none' }}
                        >
                            {editingId === task.id ? (
                                <div className="flex items-center gap-1 w-full">
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
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
                                    <button
                                        onClick={() => toggleRecurringTaskCheck(task.id)}
                                        className={`shrink-0 transition-colors ${task.status === 'completed' ? 'text-green-400' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        {task.status === 'completed' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    </button>

                                    <div className="flex-1 flex items-center gap-3 min-w-0">
                                        <div className="cursor-grab text-slate-600 hover:text-slate-400 shrink-0">
                                            <GripVertical size={14} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <Tooltip text={task.name}>
                                                <span className={`truncate block text-sm text-slate-300 ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                                                    {task.name}
                                                </span>
                                            </Tooltip>
                                        </div>

                                        <TaskScheduleInput
                                            date={task.scheduledDate}
                                            time={task.scheduledTime}
                                            onUpdate={(date, time) => updateTaskSchedule(task.id, date, time)}
                                            className="ml-auto"
                                        />
                                    </div>

                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0">
                                        <button
                                            onClick={() => startEditing(task)}
                                            className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                            title="Rename"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => useTaskStore.getState().openMemo(task.id)}
                                            className="text-slate-400 hover:text-blue-400 p-1 rounded"
                                            title="Open Memo"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Delete this recurring task?')) {
                                                    deleteRecurringTask(task.id);
                                                }
                                            }}
                                            className="text-red-400 hover:text-red-300 p-1 rounded"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => startRecurringTask(task.id)}
                                            className="text-blue-400 hover:text-blue-300 p-1 rounded"
                                            title="Start Task"
                                        >
                                            <Play size={14} fill="currentColor" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </DraggablePanel>
    );
}
