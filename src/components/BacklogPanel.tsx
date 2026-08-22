import { useTaskStore, BacklogCategory, Task } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { usePanelStore } from '@/store/usePanelStore';
import { DraggablePanel } from './DraggablePanel';
import { BacklogTaskItem } from './BacklogTaskItem';
import { ListTodo, Plus, Pencil, Trash2, Minimize2, Bell } from 'lucide-react';
import { getSmartPasteText } from '@/utils/taskParsing';
import { useState, useRef } from 'react';
import { useNotification } from '@/hooks/useNotification';

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
    const containerRef = useRef<HTMLDivElement>(null);

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
                                className="animate-due-indicator flex items-center gap-1.5 px-2 py-1 text-red-200 bg-red-950/60 border border-red-500/50 rounded-md font-bold tracking-widest text-[10px]"
                                title="Due task in this backlog"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Bell size={14} />
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
                            onClick={(e) => {
                                e.stopPropagation();
                                usePanelStore.getState().remove(`backlog-panel-${category.id}`);
                                toggleBacklogMinimized(category.id);
                            }}
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
                        const { isDue } = isTaskScheduledNow(task);
                        return (
                            <BacklogTaskItem
                                key={task.id}
                                task={task}
                                index={index}
                                categoryId={category.id}
                                isDue={isDue}
                            />
                        );
                    })
                )}
            </div>
        </DraggablePanel >
    );
}
