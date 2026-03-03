import { useTaskStore } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { Repeat, Play, Plus, Pencil, Check, X, Trash2, GripVertical, CheckCircle2, Circle, Minimize2, FileText, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { TaskScheduleInput } from './TaskScheduleInput';
import { Tooltip } from './Tooltip';
import { DraggablePanel } from './DraggablePanel';
import { ColorPickerDialog } from './ColorPickerDialog';

export function RecurringTasks() {
    const {
        recurringTasks,
        addRecurringTask,
        deleteRecurringTask,
        toggleRecurringTaskCheck,
        startRecurringTask,
        updateTaskName,
        updateTaskSchedule,
        toggleRecurringMinimized,
        draggedTaskId,
        setDraggedTaskId,
        dropTarget,
        setDropTarget,
        commitMove,
        getTaskById,
        backlogTasks: allBacklogTasks,
        colors,
        updateTaskColorId,
        clearAllRecurringTasksChecks
    } = useTaskStore();
    const memos = useMemoStore((state) => state.memos);

    const [newItem, setNewItem] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const [activeColorPickerTaskId, setActiveColorPickerTaskId] = useState<string | null>(null);
    const [colorPickerRect, setColorPickerRect] = useState<DOMRect | undefined>(undefined);
    const [hideChecked, setHideChecked] = useState(true);

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

    const handleAdd = () => {
        if (newItem.trim()) {
            addRecurringTask(newItem.trim());
            setNewItem('');
        }
    };

    const currentTime = useTaskStore((state) => state.currentTime);
    const currentDate = useTaskStore((state) => state.currentDate);
    const currentDay = useTaskStore((state) => state.currentDay);

    const isTaskScheduledNow = (task: any) => {
        if (task.status === 'completed' || !task.scheduledTime) return { isDue: false, shouldNotify: false };

        const isMatchingMinute = task.scheduledTime === currentTime;
        const isMatchingDate = !task.scheduledDate || task.scheduledDate === currentDate;
        const isMatchingDay = !task.scheduledDaysOfWeek ||
            task.scheduledDaysOfWeek.length === 0 ||
            task.scheduledDaysOfWeek.includes(currentDay);

        // Due if matching date and time has passed
        let isDue = false;
        if (task.scheduledDate) {
            isDue = `${currentDate}T${currentTime}` >= `${task.scheduledDate}T${task.scheduledTime}`;
        } else {
            isDue = isMatchingDay && currentTime >= task.scheduledTime;
        }

        return {
            isDue,
            shouldNotify: isMatchingMinute && isMatchingDate && isMatchingDay
        };
    };

    const formatTime = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const displayTasks = hideChecked
        ? recurringTasks.filter(t => t.status !== 'completed')
        : recurringTasks;

    return (
        <DraggablePanel
            id="recurring-panel"
            defaultPosition={{ bottom: 32, right: 32 }}
            defaultSize={{ width: 320, height: 400 }}
            minSize={{ width: 320, height: 250 }}
            title={
                <div className="flex items-center gap-2 uppercase tracking-wider">
                    <Repeat size={16} />
                    <span>定期タスクデッキ ({displayTasks.length})</span>
                </div>
            }
            headerControls={
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setHideChecked(!hideChecked)}
                        className={`p-1.5 rounded hover:bg-slate-700/50 transition-colors ${hideChecked ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
                        title={hideChecked ? "チェック済みを表示" : "チェック済みを隠す"}
                    >
                        {hideChecked ? <Circle size={14} className="opacity-50" /> : <CheckCircle2 size={14} />}
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm('全ての定期タスクを未完了に戻しますか？')) {
                                clearAllRecurringTasksChecks();
                            }
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-700/50 transition-colors"
                        title="全てのチェックを外す"
                    >
                        <CheckCircle2 size={14} />
                    </button>
                    <button
                        onClick={() => toggleRecurringMinimized()}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
                    >
                        <Minimize2 size={14} />
                    </button>
                </div>
            }
        >
            <div className="p-4 pt-2 border-b border-slate-700/50 bg-slate-800/20">
                <div className="flex gap-1">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()}
                        placeholder="Add recurring task..."
                        className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                        onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                            if (e.key === 'Enter') handleAdd();
                        }}
                    />
                    <button
                        onClick={handleAdd}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {displayTasks.length === 0 && (
                    <div className="text-slate-600 text-center py-4 text-sm italic">
                        No recurring tasks
                    </div>
                )}
                {displayTasks.map((task, index) => {
                    const { isDue, shouldNotify } = isTaskScheduledNow(task);
                    const activeColorDef = colors.find(c => c.id === task.colorId);

                    if (shouldNotify) {
                        // sendNotification is now handled by NotificationManager
                    }

                    return (
                        <div
                            key={task.id}
                            data-task-id={task.id}
                            data-panel-id="recurring"
                            data-panel-type="recurring"
                            data-index={index}
                            className={`group bg-slate-800/30 hover:bg-slate-800/80 p-3 rounded-lg border border-transparent hover:border-slate-600 transition-all flex items-center justify-between gap-2 select-none
                                ${draggedTaskId === task.id ? 'opacity-20 scale-95 shadow-none' : 'shadow-sm'} 
                                ${isDue ? 'animate-blink border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : ''}`}
                            style={{ touchAction: 'none' }}
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
                                        setDraggedTaskId(task.id);
                                    }

                                    if (hasMoved) {
                                        const overElement = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
                                        const overRow = overElement?.closest('div[data-task-id]');
                                        if (overRow) {
                                            const overPanelId = overRow.getAttribute('data-panel-id');
                                            const overPanelType = overRow.getAttribute('data-panel-type') as any || 'backlog';
                                            const overIndex = parseInt(overRow.getAttribute('data-index') || '0');
                                            if (overPanelId) {
                                                setDropTarget({ panelId: overPanelId, index: overIndex, type: overPanelType });
                                            }
                                        } else {
                                            const overBacklog = overElement?.closest('div[data-panel-category-id]');
                                            if (overBacklog) {
                                                const overPanelId = overBacklog.getAttribute('data-panel-category-id');
                                                if (overPanelId) {
                                                    setDropTarget({ panelId: overPanelId, index: 0, type: 'backlog' });
                                                }
                                            } else {
                                                const overRecurring = overElement?.closest('div[data-panel-type="recurring"]');
                                                if (overRecurring) {
                                                    setDropTarget({ panelId: 'recurring', index: 0, type: 'recurring' });
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
                                <>
                                    {/* 1. Drag Handle */}
                                    <div className="cursor-grab text-slate-600 hover:text-slate-400 shrink-0">
                                        <GripVertical size={14} />
                                    </div>

                                    {/* 2. Checkmark */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRecurringTaskCheck(task.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className={`shrink-0 ml-1 transition-colors ${task.status === 'completed' ? 'text-green-400' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        {task.status === 'completed' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    </button>

                                    {/* 3. Tag (Color Pulse) */}
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

                                    {/* 4. Start Task */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startRecurringTask(task.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="text-blue-400 hover:text-blue-300 p-1 rounded shrink-0 transition-opacity"
                                        title="Start Task"
                                    >
                                        <Play size={14} fill="currentColor" />
                                    </button>

                                    {/* 5. Subject */}
                                    <div className="flex-1 min-w-0">
                                        <Tooltip text={task.name}>
                                            <span className={`truncate block text-sm text-slate-300 ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>
                                                {task.name}
                                            </span>
                                        </Tooltip>
                                    </div>

                                    {/* 6. Schedule */}
                                    <TaskScheduleInput
                                        date={task.scheduledDate}
                                        time={task.scheduledTime}
                                        daysOfWeek={task.scheduledDaysOfWeek}
                                        onUpdate={(date, time, days) => updateTaskSchedule(task.id, date, time, days)}
                                        className="ml-auto"
                                    />

                                    <div className="flex items-center gap-1 shrink-0">
                                        {/* 7. Rename */}
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
                                        {/* 8. Open Memo */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                useTaskStore.getState().openMemo(task.id);
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className={`p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-700/50 transition-all ${!!memos[task.id] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                            title="Open Memo"
                                        >
                                            <FileText size={14} />
                                        </button>
                                        {/* 9. Delete Task */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Delete this recurring task?')) {
                                                    deleteRecurringTask(task.id);
                                                }
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="text-red-400 hover:text-red-300 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={14} />
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
