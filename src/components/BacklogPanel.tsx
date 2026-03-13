import { useTaskStore, BacklogCategory, Task } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { Tooltip } from './Tooltip';
import { DatePicker } from './DatePicker';
import { DraggablePanel } from './DraggablePanel';
import { TaskScheduleInput } from './TaskScheduleInput';
import { format, parseISO } from 'date-fns';
import { ListTodo, Play, Plus, Pencil, Check, X, Trash2, GripVertical, Copy, Minimize2, Calendar, Clock, FileText, Bell } from 'lucide-react';
import { getSmartPasteText } from '@/utils/taskParsing';
import { useState, useRef, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { ColorPickerDialog } from './ColorPickerDialog';

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

interface BacklogPanelProps {
    category: BacklogCategory;
    defaultPosition: { top?: number; bottom?: number; left?: number; right?: number };
}

export const BacklogPanel = ({ category, defaultPosition }: BacklogPanelProps) => {
    const allBacklogTasks = useTaskStore((state) => state.backlogTasks);
    const backlogTasks = allBacklogTasks.filter(t => t.backlogId === category.id);
    const colors = useTaskStore((state) => state.colors);
    const addToBacklog = useTaskStore((state) => state.addToBacklog);
    const pickFromBacklog = useTaskStore((state) => state.pickFromBacklog);
    const updateTaskName = useTaskStore((state) => state.updateTaskName);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const moveBacklogTask = useTaskStore((state) => state.moveBacklogTask);
    const moveHistoryToBacklog = useTaskStore((state) => state.moveHistoryToBacklog);
    const copyToRecurring = useTaskStore((state) => state.copyToRecurring);
    const updateTaskSchedule = useTaskStore((state) => state.updateTaskSchedule);
    const updateBacklogCategory = useTaskStore((state) => state.updateBacklogCategory);
    const deleteBacklogCategory = useTaskStore((state) => state.deleteBacklogCategory);
    const toggleBacklogMinimized = useTaskStore((state) => state.toggleBacklogMinimized);
    const updateTaskColorId = useTaskStore((state) => state.updateTaskColorId);

    const memos = useMemoStore((state) => state.memos);
    const draggedTaskId = useTaskStore((state) => state.draggedTaskId);
    const setDraggedTaskId = useTaskStore((state) => state.setDraggedTaskId);
    const dropTarget = useTaskStore((state) => state.dropTarget);
    const setDropTarget = useTaskStore((state) => state.setDropTarget);
    const commitMove = useTaskStore((state) => state.commitMove);
    const getTaskById = useTaskStore((state) => state.getTaskById);

    // For calculating total time
    const taskLog = useTaskStore((state) => state.taskLog);

    const [newItem, setNewItem] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(category.name);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const [activeColorPickerTaskId, setActiveColorPickerTaskId] = useState<string | null>(null);
    const [colorPickerRect, setColorPickerRect] = useState<DOMRect | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Drag and drop state removed (moved to store)

    const currentTime = useTaskStore((state) => state.currentTime);
    const currentDate = useTaskStore((state) => state.currentDate);
    const currentDay = useTaskStore((state) => state.currentDay);

    const isTaskScheduledNow = (task: Task) => {
        if (task.status === 'completed') return { isDue: false, shouldNotify: false };

        // Notification check (exact minute)
        const isMatchingMinute = task.scheduledTime === currentTime;
        const isMatchingDate = !task.scheduledDate || task.scheduledDate === currentDate;
        const isMatchingDay = !task.scheduledDaysOfWeek || task.scheduledDaysOfWeek.includes(currentDay);

        const isDaily = task.scheduledDaysOfWeek && task.scheduledDaysOfWeek.length === 7;

        // Due check (any time past the scheduled time)
        let isDue = false;
        if (task.scheduledDate && task.scheduledTime) {
            isDue = `${currentDate}T${currentTime}` >= `${task.scheduledDate}T${task.scheduledTime}`;
        } else if (task.scheduledTime) {
            const timeMatch = isDaily || isMatchingDate || isMatchingDay;
            isDue = timeMatch && currentTime >= task.scheduledTime;
        }

        const shouldNotify = isMatchingMinute && (isMatchingDate && (task.scheduledDaysOfWeek ? isMatchingDay : true));

        return { isDue, shouldNotify };
    };

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes} m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds} s`;
        } else {
            return `${seconds} s`;
        }
    };

    // Calculate total time spent on this category
    const calculateElapsedTime = () => {
        let totalMs = 0;
        backlogTasks.forEach(t => {
            totalMs += t.duration;
            // add active logs. Actually task duration combines completed/paused.
            // If the task is currently active, we could calculate it, but these are backlog tasks so they aren't active.
        });

        // Include any history tasks that belong to this backlog
        const historyTasks = useTaskStore.getState().history.filter(t => t.backlogId === category.id);
        historyTasks.forEach(t => totalMs += t.duration);

        const totalMin = Math.floor(totalMs / 60000);
        const hours = Math.floor(totalMin / 60);
        const minutes = totalMin % 60;
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const tasksInCategory = allBacklogTasks.filter(t => t.backlogId === category.id);
    let displayTasks = tasksInCategory;
    const hasDueTask = displayTasks.some(t => isTaskScheduledNow(t).isDue);

    if (draggedTaskId && dropTarget) {
        const isTargetingThisPanel = dropTarget.panelId === category.id && dropTarget.type === 'backlog';
        if (tasksInCategory.some(t => t.id === draggedTaskId) || isTargetingThisPanel) {
            const draggedTask = getTaskById(draggedTaskId);
            if (draggedTask) {
                let temp = tasksInCategory.filter(t => t.id !== draggedTaskId);
                if (isTargetingThisPanel) {
                    const safeIndex = Math.max(0, Math.min(dropTarget.index, temp.length));
                    temp.splice(safeIndex, 0, draggedTask);
                }
                displayTasks = temp;
            }
        }
    }

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;
        addToBacklog(newItem, category.id);
        setNewItem('');
    };

    const saveTitle = () => {
        if (titleValue.trim()) {
            updateBacklogCategory(category.id, { name: titleValue.trim() });
        } else {
            setTitleValue(category.name);
        }
        setIsEditingTitle(false);
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/json", JSON.stringify({ source: 'backlog', taskId }));
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData("application/json");
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            if (data.source === 'backlog') {
                moveBacklogTask(data.taskId, category.id, targetIndex);
            } else if (data.source === 'history') {
                moveHistoryToBacklog(data.taskId, category.id);
                // Optionally re-order it immediately? The move puts it at the top, maybe that's fine.
            }
        } catch (err) { }
        setDraggedTaskId(null);
    };

    const handleCategoryDrop = (e: React.DragEvent) => {
        e.preventDefault();
        // If drops to empty area of the panel
        const dataStr = e.dataTransfer.getData("application/json");
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            if (data.source === 'backlog') {
                // Drop at the end
                moveBacklogTask(data.taskId, category.id, backlogTasks.length);
            } else if (data.source === 'history') {
                moveHistoryToBacklog(data.taskId, category.id);
            }
        } catch (err) { }
    };

    return (
        <DraggablePanel
            id={`backlog-panel-${category.id}`}
            defaultPosition={defaultPosition}
            defaultSize={{ width: 320, height: 400 }}
            minSize={{ width: 320, height: 200 }}
            title={
                isEditingTitle ? (
                    <div className="flex items-center gap-1 w-full" onPointerDown={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                if (e.key === 'Enter') {
                                    updateBacklogCategory(category.id, { name: titleValue.trim() });
                                    setIsEditingTitle(false);
                                }
                                if (e.key === 'Escape') {
                                    setTitleValue(category.name);
                                    setIsEditingTitle(false);
                                }
                            }}
                            onBlur={saveTitle}
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-2 font-bold w-full">
                        <ListTodo size={16} />
                        <span className="truncate">{category.name} ({backlogTasks.length})</span>
                    </div>
                )
            }
            headerControls={
                !isEditingTitle && (
                    <div className="flex items-center gap-0.5">
                        {hasDueTask && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const dueElement = containerRef.current?.querySelector('[data-is-due="true"]');
                                    if (dueElement) {
                                        dueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 text-white rounded-md animate-alert-flash transition-colors font-bold tracking-widest text-[10px]"
                                title="Due task in this backlog"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Bell size={14} className="animate-bell-ring" />
                                <span>DUE</span>
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                            title="Edit Backlog Name"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleBacklogMinimized(category.id); }}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                            title="Minimize Backlog"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Minimize2 size={14} />
                        </button>
                    </div>
                )
            }
        >
            {/* Category Stats Header (Not draggable) */}
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400 border-b border-slate-800/50 bg-slate-900/20 shrink-0">
                <span>時間: {calculateElapsedTime()}</span>
                <span>/</span>
                <input
                    type="number"
                    min="0"
                    value={category.allocatedMinutes || ''}
                    onChange={(e) => updateBacklogCategory(category.id, { allocatedMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
                    placeholder="予定"
                    className="bg-slate-900 border border-slate-700 rounded w-16 px-1 text-center text-xs focus:border-blue-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onPointerDown={(e) => e.stopPropagation()}
                />
                <span>分</span>
                {category.id !== 'main' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('このバックログを削除しますか？タスクはMainに移動します。')) {
                                deleteBacklogCategory(category.id);
                            }
                        }}
                        className="ml-auto text-red-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Delete Backlog"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <form onSubmit={handleAdd} className="flex gap-2 shrink-0 mb-3 px-4 pt-3">
                <textarea
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onPaste={(e) => {
                        e.preventDefault();
                        const text = getSmartPasteText(e.clipboardData);
                        setNewItem(prev => prev + text);
                    }}
                    onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newItem.trim()) {
                                addToBacklog(newItem, category.id);
                                setNewItem('');
                            }
                        }
                    }}
                    placeholder="Add quick task... (Shift+Enter for Memo)"
                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none overflow-hidden min-h-[38px]"
                    rows={1}
                    ref={(el) => {
                        if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                        }
                    }}
                />
                <button
                    type="submit"
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                >
                    <Plus size={16} />
                </button>
            </form>

            <div
                ref={containerRef}
                className="overflow-y-auto flex-1 h-full min-h-0 space-y-2 mb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent px-4 pb-2"
                data-panel-category-id={category.id}
            >
                {displayTasks.length === 0 ? (
                    <div className="text-slate-600 text-center py-4 text-sm italic pointer-events-none">
                        No tasks in backlog
                    </div>
                ) : (
                    displayTasks.map((task, index) => {
                        const { isDue, shouldNotify } = isTaskScheduledNow(task);
                        const activeColorDef = colors.find(c => c.id === task.colorId);

                        if (shouldNotify) {
                            // sendNotification is now handled by NotificationManager
                        }

                        return (
                            <div
                                key={task.id}
                                data-task-id={task.id}
                                data-panel-id={category.id}
                                data-panel-type="backlog"
                                data-index={index}
                                data-is-due={isDue ? "true" : undefined}
                                className={`group bg-slate-900/50 hover:bg-slate-800/80 px-3 py-2 rounded-lg transition-all flex items-center gap-3 select-none
                                ${draggedTaskId === task.id ? 'opacity-20 scale-95 shadow-none' : 'shadow-sm'}
                                ${isDue ? 'animate-blink border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : ''}`}
                                style={{ touchAction: 'none' }}
                                onPointerDown={(e) => {
                                    if (e.button !== 0) return;
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
                                            setDraggedTaskId(task.id);
                                        }

                                        if (hasMoved) {
                                            const overElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                                            const overTaskRow = overElement?.closest('div[data-task-id]');
                                            if (overTaskRow) {
                                                const overPanelId = overTaskRow.getAttribute('data-panel-id');
                                                const overPanelType = overTaskRow.getAttribute('data-panel-type') as any || 'backlog';
                                                const overIndex = parseInt(overTaskRow.getAttribute('data-index') || '0');
                                                if (overPanelId) {
                                                    setDropTarget({ panelId: overPanelId, index: overIndex, type: overPanelType });
                                                }
                                            } else {
                                                const overPanel = overElement?.closest('div[data-panel-category-id]');
                                                if (overPanel) {
                                                    const overPanelId = overPanel.getAttribute('data-panel-category-id');
                                                    if (overPanelId) {
                                                        setDropTarget({ panelId: overPanelId, index: 9999, type: 'backlog' });
                                                    }
                                                } else {
                                                    const overRecurring = overElement?.closest('div[data-panel-type="recurring"]');
                                                    if (overRecurring) {
                                                        setDropTarget({ panelId: 'recurring', index: 9999, type: 'recurring' });
                                                    }
                                                }
                                            }
                                        }
                                    };

                                    const onPointerUp = (upEvent: PointerEvent) => {
                                        target.releasePointerCapture(upEvent.pointerId);
                                        window.removeEventListener('pointermove', onPointerMove);
                                        window.removeEventListener('pointerup', onPointerUp);

                                        if (hasMoved) {
                                            commitMove();
                                        } else {
                                            setDraggedTaskId(null);
                                            setDropTarget(null);
                                        }
                                    };

                                    window.addEventListener('pointermove', onPointerMove);
                                    window.addEventListener('pointerup', onPointerUp);
                                }}
                            >
                                {/* 1. Drag Handle */}
                                <div className="cursor-grab text-slate-600 hover:text-slate-400 shrink-0">
                                    <GripVertical size={14} />
                                </div>

                                {/* 2. Tag (Color Pulse) */}
                                <div className="relative shrink-0 ml-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setColorPickerRect(rect);
                                            setActiveColorPickerTaskId(task.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-700/50 transition-all"
                                        title="タグを設定"
                                    >
                                        <div className={`w-3 h-3 rounded-full border border-white/10 shadow-sm ${activeColorDef?.colorCode || 'bg-slate-700'}`} />
                                    </button>
                                    {activeColorPickerTaskId === task.id && (
                                        <ColorPickerDialog
                                            currentColorId={task.colorId}
                                            onSelect={(colorId) => updateTaskColorId(task.id, colorId)}
                                            onClose={() => setActiveColorPickerTaskId(null)}
                                            triggerRect={colorPickerRect}
                                        />
                                    )}
                                </div>

                                {/* 3. Start Task */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        pickFromBacklog(task.id);
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className="text-blue-500 hover:text-blue-400 p-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-all"
                                    title="Start Task"
                                >
                                    <Play size={14} className="fill-current" />
                                </button>

                                {/* 4. Subject */}
                                <div className="flex-1 min-w-0">
                                    {editingId === task.id ? (
                                        <div className="flex items-center gap-1 w-full">
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
                                        <Tooltip text={task.name}>
                                            <span className="truncate block text-sm text-slate-300">
                                                {task.name}
                                            </span>
                                        </Tooltip>
                                    )}
                                </div>

                                {/* 5. Schedule */}
                                <TaskScheduleInput
                                    date={task.scheduledDate}
                                    time={task.scheduledTime}
                                    daysOfWeek={task.scheduledDaysOfWeek}
                                    autoStart={task.autoStart}
                                    onUpdate={(date, time, days, auto) => updateTaskSchedule(task.id, date, time, days, auto)}
                                    className="ml-auto"
                                />

                                <div className="flex items-center gap-1 shrink-0">
                                    {/* 6. Rename */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(task);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="text-slate-400 hover:text-slate-200 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Rename"
                                    >
                                        <Pencil size={14} />
                                    </button>

                                    {/* 7. Open Memo */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useTaskStore.getState().openMemo(task.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className={`p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-700/50 transition-colors ${!!memos[task.id] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                        title="Open Memo"
                                    >
                                        <FileText size={14} />
                                    </button>

                                    {/* 8. Delete Task */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('Delete this task?')) {
                                                deleteTask(task.id);
                                            }
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="p-1.5 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete Task"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </DraggablePanel >
    );
}
