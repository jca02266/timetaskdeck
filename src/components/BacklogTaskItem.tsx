import { useTaskStore, Task } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { Tooltip } from './Tooltip';
import { TaskScheduleInput } from './TaskScheduleInput';
import { Play, Pencil, Check, X, Trash2, GripVertical, FileText } from 'lucide-react';
import { useState } from 'react';
import { ColorPickerDialog } from './ColorPickerDialog';

interface BacklogTaskItemProps {
    task: Task;
    index: number;
    categoryId: string;
    isDue: boolean;
}

export function BacklogTaskItem({ task, index, categoryId, isDue }: BacklogTaskItemProps) {
    const colors = useTaskStore((state) => state.colors);
    const pickFromBacklog = useTaskStore((state) => state.pickFromBacklog);
    const updateTaskName = useTaskStore((state) => state.updateTaskName);
    const deleteTask = useTaskStore((state) => state.deleteTask);
    const updateTaskSchedule = useTaskStore((state) => state.updateTaskSchedule);
    const updateTaskEstimatedDuration = useTaskStore((state) => state.updateTaskEstimatedDuration);
    const updateTaskColorId = useTaskStore((state) => state.updateTaskColorId);
    const draggedTaskId = useTaskStore((state) => state.draggedTaskId);
    const setDraggedTaskId = useTaskStore((state) => state.setDraggedTaskId);
    const setDropTarget = useTaskStore((state) => state.setDropTarget);
    const commitMove = useTaskStore((state) => state.commitMove);

    const memos = useMemoStore((state) => state.memos);

    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [activeColorPicker, setActiveColorPicker] = useState(false);
    const [colorPickerRect, setColorPickerRect] = useState<DOMRect | undefined>(undefined);

    const startEditing = () => {
        setIsEditing(true);
        setEditValue(task.name);
    };

    const saveEdit = () => {
        if (editValue.trim()) updateTaskName(task.id, editValue.trim());
        setIsEditing(false);
    };

    const cancelEdit = () => setIsEditing(false);

    const activeColorDef = colors.find(c => c.id === task.colorId);

    return (
        <div
            key={task.id}
            data-task-id={task.id}
            data-panel-id={categoryId}
            data-panel-type="backlog"
            data-index={index}
            data-is-due={isDue ? "true" : undefined}
            className={`group bg-slate-900/50 hover:bg-slate-800/80 px-3 py-2 rounded-lg transition-all flex items-center gap-3 select-none
            ${draggedTaskId === task.id ? 'opacity-20 scale-95 shadow-none' : 'shadow-sm'}
            ${isDue ? 'animate-due-card border' : ''}`}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
                if (e.button !== 0) return;
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
                            const overPanelType = (overTaskRow.getAttribute('data-panel-type') as 'backlog' | 'recurring') || 'backlog';
                            const overIndex = parseInt(overTaskRow.getAttribute('data-index') || '0');
                            if (overPanelId) setDropTarget({ panelId: overPanelId, index: overIndex, type: overPanelType });
                        } else {
                            const overPanel = overElement?.closest('div[data-panel-category-id]');
                            if (overPanel) {
                                const overPanelId = overPanel.getAttribute('data-panel-category-id');
                                if (overPanelId) setDropTarget({ panelId: overPanelId, index: 9999, type: 'backlog' });
                            } else {
                                const overRecurring = overElement?.closest('div[data-panel-type="recurring"]');
                                if (overRecurring) setDropTarget({ panelId: 'recurring', index: 9999, type: 'recurring' });
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
            {/* Drag Handle */}
            <div className="cursor-grab text-slate-600 hover:text-slate-400 shrink-0">
                <GripVertical size={14} />
            </div>

            {/* Color Tag */}
            <div className="relative shrink-0 ml-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColorPickerRect(rect);
                        setActiveColorPicker(true);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-700/50 transition-all"
                    title="タグを設定"
                >
                    <div className={`w-3 h-3 rounded-full border border-white/10 shadow-sm ${activeColorDef?.colorCode || 'bg-slate-700'}`} />
                </button>
                {activeColorPicker && (
                    <ColorPickerDialog
                        currentColorId={task.colorId}
                        onSelect={(colorId) => updateTaskColorId(task.id, colorId)}
                        onClose={() => setActiveColorPicker(false)}
                        triggerRect={colorPickerRect}
                    />
                )}
            </div>

            {/* Start Task */}
            <button
                onClick={(e) => { e.stopPropagation(); pickFromBacklog(task.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-blue-500 hover:text-blue-400 p-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-all"
                title="Start Task"
            >
                <Play size={14} className="fill-current" />
            </button>

            {/* Task Name */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
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
                        <button onClick={saveEdit} className="text-green-400 hover:text-green-300 p-1"><Check size={14} /></button>
                        <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-1"><X size={14} /></button>
                    </div>
                ) : (
                    <Tooltip text={task.name}>
                        <span className="truncate block text-sm text-slate-300">{task.name}</span>
                    </Tooltip>
                )}
            </div>

            {/* Schedule */}
            <TaskScheduleInput
                date={task.scheduledDate}
                time={task.scheduledTime}
                daysOfWeek={task.scheduledDaysOfWeek}
                autoStart={task.autoStart}
                onUpdate={(date, time, days, auto) => updateTaskSchedule(task.id, date, time, days, auto)}
                className="ml-auto"
            />

            <div className="flex items-center gap-1 shrink-0" title="タイムボックスの予定時間">
                <input
                    type="number"
                    min="15"
                    max="1440"
                    step="15"
                    value={task.estimatedDurationMinutes ?? 30}
                    onChange={(e) => updateTaskEstimatedDuration(task.id, Number(e.target.value) || 30)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="w-12 bg-slate-950/30 border border-slate-800 rounded px-1 py-1.5 text-[10px] text-center text-slate-300 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="予定時間（分）"
                />
                <span className="text-[10px] text-slate-500">分</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {/* Rename */}
                <button
                    onClick={(e) => { e.stopPropagation(); startEditing(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-slate-200 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Rename"
                >
                    <Pencil size={14} />
                </button>

                {/* Memo */}
                <button
                    onClick={(e) => { e.stopPropagation(); useTaskStore.getState().openMemo(task.id); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-700/50 transition-colors ${!!memos[task.id] ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    title="Open Memo"
                >
                    <FileText size={14} />
                </button>

                {/* Delete */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this task?')) deleteTask(task.id);
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
}
