import { useTaskStore, BacklogCategory, Task } from '@/store/useTaskStore';
import { Tooltip } from './Tooltip';
import { DatePicker } from './DatePicker';
import { DraggablePanel } from './DraggablePanel';
import { ListTodo, Play, Plus, Pencil, Check, X, Trash2, GripVertical, Copy } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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

    // For calculating total time
    const taskLog = useTaskStore((state) => state.taskLog);

    const [newItem, setNewItem] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
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
                <div className="flex flex-col w-full text-sm">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-1 w-full">
                            <input
                                type="text"
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveTitle();
                                    if (e.key === 'Escape') {
                                        setTitleValue(category.name);
                                        setIsEditingTitle(false);
                                    }
                                }}
                                onBlur={saveTitle}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                            <div className="flex items-center gap-2 uppercase tracking-wider font-bold">
                                <ListTodo size={16} />
                                <span>{category.name}</span>
                            </div>
                            <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>Time: {calculateElapsedTime()}</span>
                        <span>/</span>
                        <input
                            type="number"
                            value={category.allocatedMinutes || ''}
                            onChange={(e) => updateBacklogCategory(category.id, { allocatedMinutes: parseInt(e.target.value) || 0 })}
                            placeholder="Min"
                            className="bg-slate-900 border border-slate-700 rounded w-12 px-1 text-center text-xs"
                        />
                        <span>min</span>
                        {category.id !== 'main' && (
                            <button
                                onClick={() => {
                                    if (window.confirm('このバックログを削除しますか？タスクはMainに移動します。')) {
                                        deleteBacklogCategory(category.id);
                                    }
                                }}
                                className="ml-auto text-red-500 hover:text-red-400 p-1"
                                title="Delete Backlog"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <form onSubmit={handleAdd} className="flex gap-2 shrink-0 mb-3 px-4 pt-2">
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
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={handleCategoryDrop}
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
                    const colorDef = colors.find(c => c.id === task.colorId);
                    const borderColorClass = colorDef ? colorDef.colorCode.replace('bg-', 'border-') : 'border-transparent';

                    return (
                        <div
                            key={task.id}
                            draggable={editingId === null}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => { e.stopPropagation(); handleDrop(e, index); }}
                            className={`group bg-slate-800/30 hover:bg-slate-800/80 p-3 rounded-lg border-l-4 hover:border-r-slate-600 border-t-transparent border-b-transparent border-r-transparent transition-all flex items-center justify-between gap-2 
                                ${borderColorClass}
                                ${draggedTaskId === task.id ? 'opacity-50' : ''}
                                ${isDue ? 'animate-blink border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : ''}`}
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
                                    <div className="text-sm text-slate-300 truncate flex-1 flex flex-col gap-0.5">
                                        <div className="text-sm text-slate-300 truncate flex-1 flex items-center gap-2">
                                            <div className="cursor-grab text-slate-600 hover:text-slate-400">
                                                <GripVertical size={14} />
                                            </div>
                                            <Tooltip text={task.name}>
                                                <span className="truncate block">{task.name}</span>
                                            </Tooltip>
                                        </div>
                                        <div className="flex items-center gap-1 pl-5">
                                            <DatePicker
                                                value={task.scheduledDate}
                                                onChange={(date) => updateTaskSchedule(task.id, date, undefined)}
                                            />
                                            <input
                                                type="time"
                                                value={task.scheduledTime || ''}
                                                onChange={(e) => updateTaskSchedule(task.id, undefined, e.target.value)}
                                                className="bg-transparent text-[10px] text-slate-500 focus:text-slate-300 focus:outline-none w-16"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                        <button
                                            onClick={() => startEditing(task)}
                                            className="text-slate-400 hover:text-slate-200 p-1 rounded"
                                            title="Rename"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <div className="flex gap-1 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToRecurring(task.id);
                                                }}
                                                className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                                                title="定期タスクにコピー"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('このタスクを削除してもよろしいですか？')) {
                                                        deleteTask(task.id);
                                                    }
                                                }}
                                                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                                                title="削除"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
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
                    );
                })}
            </div>
        </DraggablePanel>
    );
}
