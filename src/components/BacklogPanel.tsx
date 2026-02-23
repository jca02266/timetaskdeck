import { useTaskStore, BacklogCategory, Task } from '@/store/useTaskStore';
import { Tooltip } from './Tooltip';
import { DatePicker } from './DatePicker';
import { DraggablePanel } from './DraggablePanel';
import { TaskScheduleInput } from './TaskScheduleInput';
import { format, parseISO } from 'date-fns';
import { ListTodo, Play, Plus, Pencil, Check, X, Trash2, GripVertical, Copy, Minimize2, Calendar, Clock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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

    // For calculating total time
    const taskLog = useTaskStore((state) => state.taskLog);

    const [newItem, setNewItem] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(category.name);

    // Drag and drop state
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');

    useEffect(() => {
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
    }, []);

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
                        <span className="truncate">{category.name}</span>
                    </div>
                )
            }
            headerControls={
                !isEditingTitle && (
                    <>
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
                    </>
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

            <div
                className="overflow-y-auto flex-1 h-full min-h-0 space-y-2 mb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent px-4 pb-2"
                data-panel-category-id={category.id}
            >
                {backlogTasks.length === 0 && (
                    <div className="text-slate-600 text-center py-4 text-sm italic pointer-events-none">
                        No tasks in backlog
                    </div>
                )}
                {backlogTasks.map((task, index) => {
                    const isTimeDue = task.scheduledTime === currentTime;
                    const isDateDue = !task.scheduledDate || task.scheduledDate === currentDate;
                    const isDue = isTimeDue && isDateDue;
                    const activeColorDef = colors.find(c => c.id === task.colorId);

                    return (
                        <div
                            key={task.id}
                            data-task-id={task.id}
                            data-panel-id={category.id}
                            data-index={index}
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
                                            const overIndex = parseInt(overTaskRow.getAttribute('data-index') || '0');
                                            if (overPanelId) {
                                                // If we are over a task in some panel
                                                if (overPanelId === category.id) {
                                                    // Same panel reorder
                                                    if (overIndex !== index) {
                                                        moveBacklogTask(task.id, category.id, overIndex);
                                                    }
                                                } else {
                                                    // Cross panel move
                                                    moveBacklogTask(task.id, overPanelId, overIndex);
                                                }
                                            }
                                        } else {
                                            // Maybe over an empty area of a panel
                                            const overPanel = overElement?.closest('div[data-panel-category-id]');
                                            if (overPanel) {
                                                const overPanelId = overPanel.getAttribute('data-panel-category-id');
                                                if (overPanelId && overPanelId !== category.id) {
                                                    moveBacklogTask(task.id, overPanelId, 0);
                                                }
                                            }
                                        }
                                    }
                                };

                                const onPointerUp = (upEvent: PointerEvent) => {
                                    target.releasePointerCapture(upEvent.pointerId);
                                    window.removeEventListener('pointermove', onPointerMove);
                                    window.removeEventListener('pointerup', onPointerUp);
                                    setDraggedTaskId(null);

                                    // No tap action defined for the whole row currently, 
                                    // specific fields handle their own clicks
                                };

                                window.addEventListener('pointermove', onPointerMove);
                                window.addEventListener('pointerup', onPointerUp);
                            }}
                        >
                            {/* Color Dot Tag */}
                            <div className="relative shrink-0">
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
                                <div className={`w-3 h-3 rounded-full border border-white/10 ${activeColorDef?.colorCode || 'bg-slate-700'}`} />
                            </div>

                            <div className="cursor-grab text-slate-600 hover:text-slate-400 shrink-0">
                                <GripVertical size={14} />
                            </div>

                            <Tooltip text={task.name}>
                                <input
                                    type="text"
                                    value={task.name}
                                    onChange={(e) => updateTaskName(task.id, e.target.value)}
                                    className="flex-1 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none text-sm text-slate-200 transition-colors truncate min-w-0"
                                    placeholder="Task Name"
                                />
                            </Tooltip>

                            <TaskScheduleInput
                                date={task.scheduledDate}
                                time={task.scheduledTime}
                                onUpdate={(date, time) => updateTaskSchedule(task.id, date, time)}
                                className="shrink-0"
                            />

                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => pickFromBacklog(task.id)}
                                    className="text-blue-500 hover:text-blue-400 p-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 transition-all"
                                    title="Start Task"
                                >
                                    <Play size={14} className="fill-current" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Delete this task?')) {
                                            deleteTask(task.id);
                                        }
                                    }}
                                    className="p-1.5 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Task"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </DraggablePanel>
    );
}
