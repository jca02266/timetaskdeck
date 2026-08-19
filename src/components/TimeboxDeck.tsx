"use client";

import { useEffect, useMemo, useState } from 'react';
import { addDays, addMinutes, format, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock3, GripHorizontal, Play, Trash2, X } from 'lucide-react';
import { DraggablePanel } from './DraggablePanel';
import { useTaskStore, getLogicalDate, type Task } from '@/store/useTaskStore';
import { useTimeboxStore, type Timebox } from '@/store/useTimeboxStore';
import {
    getActualMinutes,
    getActualTaskLogs,
    getLogicalDayStart,
    getTimeboxResult,
    TIMEBOX_SLOT_MINUTES,
    TIMEBOX_TOTAL_MINUTES,
} from '@/utils/timebox';

interface TimeboxDeckProps {
    onClose: () => void;
}

type TimeboxPreview = Pick<Timebox, 'id' | 'startMinute' | 'durationMinutes'>;

const HOUR_HEIGHT = 96;
const SLOT_HEIGHT = HOUR_HEIGHT / 4;
const TIMELINE_HEIGHT = HOUR_HEIGHT * 24;

const resultLabels: Record<string, string> = {
    planned: '予定',
    'in-progress': '進行中',
    partial: '一部実施',
    completed: '完了',
    overrun: '超過',
    missed: '未実施',
};

const resultClasses: Record<string, string> = {
    planned: 'text-white/70',
    'in-progress': 'text-cyan-100',
    partial: 'text-amber-100',
    completed: 'text-green-100',
    overrun: 'text-orange-100',
    missed: 'text-red-100',
    empty: 'text-slate-300',
};

function uniqueTasks(tasks: Task[]): Task[] {
    const byId = new Map<string, Task>();
    tasks.forEach((task) => byId.set(task.id, task));
    return [...byId.values()];
}

function timeboxColor(colorCode?: string): string {
    if (colorCode?.includes('red')) return 'bg-red-600 border-red-300';
    if (colorCode?.includes('orange')) return 'bg-orange-600 border-orange-300';
    if (colorCode?.includes('yellow')) return 'bg-yellow-600 border-yellow-300';
    if (colorCode?.includes('green')) return 'bg-green-600 border-green-300';
    if (colorCode?.includes('blue')) return 'bg-blue-600 border-blue-300';
    if (colorCode?.includes('purple')) return 'bg-purple-600 border-purple-300';
    if (colorCode?.includes('pink')) return 'bg-pink-600 border-pink-300';
    return 'bg-slate-600 border-slate-300';
}

export function TimeboxDeck({ onClose }: TimeboxDeckProps) {
    const dayStartHour = useTaskStore((state) => state.dayStartHour);
    const currentTask = useTaskStore((state) => state.currentTask);
    const taskStack = useTaskStore((state) => state.taskStack);
    const backlogTasks = useTaskStore((state) => state.backlogTasks);
    const recurringTasks = useTaskStore((state) => state.recurringTasks);
    const history = useTaskStore((state) => state.history);
    const taskLog = useTaskStore((state) => state.taskLog);
    const colors = useTaskStore((state) => state.colors);
    const updateTaskName = useTaskStore((state) => state.updateTaskName);
    const updateTaskColorId = useTaskStore((state) => state.updateTaskColorId);
    const updateTaskSchedule = useTaskStore((state) => state.updateTaskSchedule);
    const updateTaskEstimatedDuration = useTaskStore((state) => state.updateTaskEstimatedDuration);

    const timeboxes = useTimeboxStore((state) => state.timeboxes);
    const addTimebox = useTimeboxStore((state) => state.addTimebox);
    const updateTimebox = useTimeboxStore((state) => state.updateTimebox);
    const deleteTimebox = useTimeboxStore((state) => state.deleteTimebox);
    const syncScheduledTimebox = useTimeboxStore((state) => state.syncScheduledTimebox);

    const [selectedDate, setSelectedDate] = useState(() => getLogicalDate(Date.now(), dayStartHour));
    const [now, setNow] = useState(() => Date.now());
    const [preview, setPreview] = useState<TimeboxPreview | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftTaskId, setDraftTaskId] = useState('');
    const [draftName, setDraftName] = useState('');
    const [draftColorId, setDraftColorId] = useState('');
    const [draftStartMinute, setDraftStartMinute] = useState(0);
    const [draftDuration, setDraftDuration] = useState(30);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        setSelectedDate(getLogicalDate(Date.now(), dayStartHour));
    }, [dayStartHour]);

    const logicalDateKey = format(selectedDate, 'yyyy-MM-dd');
    const dayStart = getLogicalDayStart(selectedDate, dayStartHour);
    const dayStartMs = dayStart.getTime();
    const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
    const tasks = useMemo(() => uniqueTasks([
        ...(currentTask ? [currentTask] : []),
        ...taskStack,
        ...backlogTasks,
        ...recurringTasks,
        ...history,
    ]), [currentTask, taskStack, backlogTasks, recurringTasks, history]);
    const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
    const colorById = useMemo(() => new Map(colors.map((color) => [color.id, color])), [colors]);
    const taskMatchesSelectedDate = (task: Task) => {
        if (!task.scheduledTime) return true;
        if (task.scheduledDate) return task.scheduledDate === logicalDateKey;
        if (task.scheduledDaysOfWeek?.length) return task.scheduledDaysOfWeek.includes(selectedDate.getDay());
        return true;
    };

    const taskStartMinute = (task: Task) => {
        if (!task.scheduledTime) return undefined;
        const [hours, minutes] = task.scheduledTime.split(':').map(Number);
        return Math.floor((((hours * 60 + minutes) - dayStartHour * 60 + 1440) % 1440) / 15) * 15;
    };

    const effectiveTimebox = (timebox: Timebox): Timebox => {
        const task = timebox.taskId ? taskById.get(timebox.taskId) : undefined;
        if (!task?.scheduledTime) return timebox;
        return {
            ...timebox,
            startMinute: taskStartMinute(task) ?? timebox.startMinute,
            durationMinutes: task.estimatedDurationMinutes ?? 30,
        };
    };

    const dayTimeboxes = useMemo(() => timeboxes
        .filter((timebox) => {
            if (timebox.logicalDate !== logicalDateKey) return false;
            const task = timebox.taskId ? taskById.get(timebox.taskId) : undefined;
            return !task || taskMatchesSelectedDate(task);
        })
        .sort((a, b) => effectiveTimebox(a).startMinute - effectiveTimebox(b).startMinute),
    // The helper functions intentionally derive from these source-of-truth values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeboxes, logicalDateKey, taskById, selectedDate, dayStartHour]);

    useEffect(() => {
        tasks.filter((task) => {
            if (task.status === 'completed' || !task.scheduledTime) return false;
            if (task.scheduledDate) return task.scheduledDate === logicalDateKey;
            if (task.scheduledDaysOfWeek?.length) return task.scheduledDaysOfWeek.includes(selectedDate.getDay());
            return true;
        }).forEach((task) => {
            const [hours, minutes] = task.scheduledTime!.split(':').map(Number);
            const startMinute = ((hours * 60 + minutes) - dayStartHour * 60 + 1440) % 1440;
            syncScheduledTimebox(
                logicalDateKey,
                Math.floor(startMinute / TIMEBOX_SLOT_MINUTES) * TIMEBOX_SLOT_MINUTES,
                task.id,
                task.estimatedDurationMinutes ?? 30,
            );
        });
    }, [tasks, logicalDateKey, selectedDate, dayStartHour, syncScheduledTimebox]);

    const formatMinute = (minute: number) => format(addMinutes(dayStart, minute), 'HH:mm');

    const playTask = (taskId: string) => {
        const state = useTaskStore.getState();
        if (state.currentTask?.id === taskId || state.currentTask?.recurringTaskId === taskId) {
            if (state.currentTask.status === 'paused') state.togglePause();
            return;
        }
        if (state.backlogTasks.some((task) => task.id === taskId)) {
            state.pickFromBacklog(taskId);
        } else if (state.taskStack.some((task) => task.id === taskId)) {
            state.moveTaskToLocation(taskId, 'current');
        } else if (state.recurringTasks.some((task) => task.id === taskId)) {
            state.startRecurringTask(taskId);
        } else if (state.history.some((task) => task.id === taskId)) {
            state.reopenTask(taskId);
        }
    };

    const updateLinkedTaskDefinition = (taskId: string, startMinute: number, durationMinutes: number) => {
        const task = taskById.get(taskId);
        if (!task) return;
        const scheduledTime = formatMinute(startMinute);

        if (task.scheduledDaysOfWeek?.length) {
            updateTaskSchedule(taskId, undefined, scheduledTime, task.scheduledDaysOfWeek, task.autoStart);
        } else {
            // Preserve an existing daily schedule. A previously unscheduled task becomes
            // a one-time task on the date represented by this timebox deck.
            const scheduledDate = task.scheduledDate ?? (task.scheduledTime ? undefined : logicalDateKey);
            updateTaskSchedule(taskId, scheduledDate, scheduledTime, undefined, task.autoStart);
        }
        updateTaskEstimatedDuration(taskId, durationMinutes);
    };

    const openEditor = (timebox: Timebox) => {
        const task = timebox.taskId ? taskById.get(timebox.taskId) : undefined;
        const effective = effectiveTimebox(timebox);
        setEditingId(timebox.id);
        setDraftTaskId(timebox.taskId ?? '');
        setDraftName(task?.name ?? timebox.note ?? '');
        setDraftColorId(task?.colorId ?? '');
        setDraftStartMinute(effective.startMinute);
        setDraftDuration(effective.durationMinutes);
    };

    const saveEditor = () => {
        if (!editingId) return;
        const durationMinutes = Math.max(15, Math.min(1440 - draftStartMinute, Math.round(draftDuration / 15) * 15));
        updateTimebox(editingId, {
            taskId: draftTaskId || undefined,
            note: draftTaskId ? undefined : draftName.trim() || undefined,
            startMinute: draftStartMinute,
            durationMinutes,
        });
        if (draftTaskId) {
            if (draftName.trim()) updateTaskName(draftTaskId, draftName.trim());
            updateTaskColorId(draftTaskId, draftColorId || undefined);
            updateLinkedTaskDefinition(draftTaskId, draftStartMinute, durationMinutes);
        }
        setEditingId(null);
    };

    const beginPointerOperation = (
        event: React.PointerEvent,
        timebox: Timebox,
        mode: 'move' | 'resize',
    ) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const startY = event.clientY;
        let moved = false;
        let latest: TimeboxPreview = {
            id: timebox.id,
            startMinute: timebox.startMinute,
            durationMinutes: timebox.durationMinutes,
        };

        const onPointerMove = (moveEvent: PointerEvent) => {
            const deltaY = moveEvent.clientY - startY;
            if (Math.abs(deltaY) >= 4) moved = true;
            const deltaMinutes = Math.round(deltaY / SLOT_HEIGHT) * TIMEBOX_SLOT_MINUTES;
            if (mode === 'move') {
                latest = {
                    ...latest,
                    startMinute: Math.max(0, Math.min(1440 - timebox.durationMinutes, timebox.startMinute + deltaMinutes)),
                };
            } else {
                latest = {
                    ...latest,
                    durationMinutes: Math.max(15, Math.min(1440 - timebox.startMinute, timebox.durationMinutes + deltaMinutes)),
                };
            }
            setPreview(latest);
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            setPreview(null);
            if (moved) {
                updateTimebox(timebox.id, {
                    startMinute: latest.startMinute,
                    durationMinutes: latest.durationMinutes,
                });
                if (timebox.taskId && mode === 'resize') {
                    updateLinkedTaskDefinition(timebox.taskId, latest.startMinute, latest.durationMinutes);
                } else if (timebox.taskId && mode === 'move') {
                    updateLinkedTaskDefinition(timebox.taskId, latest.startMinute, latest.durationMinutes);
                }
            } else if (mode === 'move') {
                openEditor(timebox);
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp, { once: true });
    };

    const createTimebox = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const minute = Math.max(0, Math.min(1425,
            Math.floor(((event.clientY - rect.top) / SLOT_HEIGHT)) * TIMEBOX_SLOT_MINUTES,
        ));
        const id = addTimebox(logicalDateKey, minute, undefined, 30);
        window.setTimeout(() => {
            const created = useTimeboxStore.getState().timeboxes.find((timebox) => timebox.id === id);
            if (created) openEditor(created);
        }, 0);
    };

    const editingTimebox = editingId ? timeboxes.find((timebox) => timebox.id === editingId) : undefined;
    const currentMinute = (now - dayStartMs) / 60_000;
    const actualTaskIds = [...new Set([
        ...taskLog.map((log) => log.taskId),
        currentTask?.id,
    ].filter((taskId): taskId is string => Boolean(taskId)))];
    const actualDayLogs = actualTaskIds.flatMap((taskId) =>
        getActualTaskLogs(taskId, dayStartMs, dayEndMs, taskLog, currentTask, now),
    );

    return (
        <DraggablePanel
            id="timebox-panel"
            defaultPosition={{ top: 32, right: 32 }}
            defaultSize={{ width: 760, height: 680 }}
            minSize={{ width: 500, height: 360 }}
            title={<div className="flex items-center gap-2"><Clock3 size={16} /><span>タイムボックスデッキ</span></div>}
            headerControls={
                <div className="flex items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
                    <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-1 rounded hover:bg-slate-700" title="前日"><ChevronLeft size={15} /></button>
                    <button onClick={() => setSelectedDate(getLogicalDate(Date.now(), dayStartHour))} className="px-2 py-1 text-xs rounded hover:bg-slate-700">{logicalDateKey}</button>
                    <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-1 rounded hover:bg-slate-700" title="翌日"><ChevronRight size={15} /></button>
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white" title="閉じる"><X size={15} /></button>
                </div>
            }
        >
            <div className="h-full flex flex-col overflow-hidden bg-slate-900/90">
                <div className="grid grid-cols-[64px_1fr] border-b border-slate-700 bg-slate-800/90 text-xs uppercase tracking-wide text-slate-400 shrink-0">
                    <div className="p-3">時刻</div>
                    <div className="p-3 flex items-center justify-between"><span>予定</span><span className="normal-case text-[10px] text-slate-500">ダブルクリックで追加</span></div>
                </div>
                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700">
                    <div className="grid grid-cols-[64px_1fr]" style={{ height: TIMELINE_HEIGHT }}>
                        <div className="relative border-r border-slate-700 bg-slate-950/50">
                            {Array.from({ length: 24 }, (_, hour) => (
                                <div key={hour} className="absolute inset-x-0 px-2 font-mono text-xs text-slate-500 -translate-y-1/2" style={{ top: hour * HOUR_HEIGHT }}>
                                    {formatMinute(hour * 60)}
                                </div>
                            ))}
                        </div>
                        <div className="relative" onDoubleClick={createTimebox}>
                            {Array.from({ length: TIMEBOX_TOTAL_MINUTES / TIMEBOX_SLOT_MINUTES }, (_, index) => {
                                const slotStart = index * TIMEBOX_SLOT_MINUTES;
                                const slotEnd = slotStart + TIMEBOX_SLOT_MINUTES;
                                const isPast = currentMinute >= slotEnd;
                                const isCurrent = currentMinute >= slotStart && currentMinute < slotEnd;
                                return (
                                    <div
                                        key={`background-${index}`}
                                        className={`absolute inset-x-0 pointer-events-none ${
                                            isPast ? 'bg-slate-700/25' : isCurrent ? 'bg-cyan-950/25' : ''
                                        }`}
                                        style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                                    />
                                );
                            })}
                            {Array.from({ length: 97 }, (_, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-x-0 border-t pointer-events-none ${index % 4 === 0 ? 'border-slate-600/70' : 'border-slate-800/70'}`}
                                    style={{ top: index * SLOT_HEIGHT }}
                                />
                            ))}
                            {currentMinute >= 0 && currentMinute < TIMEBOX_TOTAL_MINUTES && (
                                <div className="absolute inset-x-0 z-20 border-t border-cyan-400/80 pointer-events-none" style={{ top: currentMinute / 15 * SLOT_HEIGHT }} />
                            )}
                            {actualDayLogs.map((actual) => {
                                    const actualStart = Math.max(dayStartMs, actual.startTime);
                                    const actualEnd = Math.min(dayEndMs, actual.endTime);
                                    return (
                                        <div
                                            key={`actual-${actual.id}`}
                                            className="absolute left-1/2 right-1 z-[8] rounded border border-dashed border-white/70 bg-slate-950/45 px-1.5 py-0.5 text-[10px] text-white/90 overflow-hidden pointer-events-none"
                                            style={{
                                                top: ((actualStart - dayStartMs) / 60000) / 15 * SLOT_HEIGHT + 1,
                                                height: Math.max(8, ((actualEnd - actualStart) / 60000) / 15 * SLOT_HEIGHT - 2),
                                            }}
                                            title={`実績: ${actual.name}`}
                                        >
                                            <span className="truncate block">実績: {actual.name}</span>
                                        </div>
                                    );
                                })}
                            {dayTimeboxes.map((timebox) => {
                                const effective = effectiveTimebox(timebox);
                                const shown = preview?.id === timebox.id ? { ...effective, ...preview } : effective;
                                const task = shown.taskId ? taskById.get(shown.taskId) : undefined;
                                const color = task?.colorId ? colorById.get(task.colorId) : undefined;
                                const startTime = dayStartMs + shown.startMinute * 60_000;
                                const endTime = Math.min(dayEndMs, startTime + shown.durationMinutes * 60_000);
                                const actualMinutes = getActualMinutes(shown.taskId, startTime, endTime, taskLog, currentTask, now);
                                const actualLogs = getActualTaskLogs(shown.taskId, startTime, endTime, taskLog, currentTask, now);
                                const result = getTimeboxResult(shown.taskId, actualMinutes, shown.durationMinutes, endTime, history, currentTask, now);
                                return (
                                    <div
                                        key={timebox.id}
                                        className={`absolute left-2 right-3 z-10 rounded border shadow-sm text-white overflow-hidden select-none ${timeboxColor(color?.colorCode)} ${preview?.id === timebox.id ? 'opacity-80 ring-2 ring-white/60' : ''}`}
                                        style={{
                                            top: shown.startMinute / 15 * SLOT_HEIGHT + 2,
                                            height: Math.max(SLOT_HEIGHT - 4, shown.durationMinutes / 15 * SLOT_HEIGHT - 4),
                                            touchAction: 'none',
                                        }}
                                        onPointerDown={(event) => beginPointerOperation(event, timebox, 'move')}
                                        title="クリックで編集・ドラッグで移動"
                                    >
                                        {task && (
                                            <button
                                                className="absolute left-1 top-1 z-20 w-5 h-5 rounded bg-black/25 hover:bg-black/45 flex items-center justify-center text-white"
                                                onPointerDown={(event) => event.stopPropagation()}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    playTask(task.id);
                                                }}
                                                title={currentTask?.id === task.id || currentTask?.recurringTaskId === task.id ? 'カレントタスク' : 'このタスクを開始'}
                                                aria-label={`${task.name}を開始`}
                                            >
                                                <Play size={11} className="fill-current" />
                                            </button>
                                        )}
                                        <div className={`h-full pr-3 py-1.5 flex flex-col justify-between pointer-events-none ${task ? 'pl-8' : 'pl-3'}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="font-semibold text-xs truncate">{task?.name ?? shown.note ?? 'タスク未割当'}</span>
                                                <span className="font-mono text-[10px] whitespace-nowrap text-white/80">{formatMinute(shown.startMinute)}–{formatMinute(shown.startMinute + shown.durationMinutes)}</span>
                                            </div>
                                            {shown.durationMinutes >= 30 && (
                                                <div className={`flex justify-between text-[10px] ${resultClasses[result]}`}>
                                                    <span>{shown.durationMinutes}分</span>
                                                    <span>{actualMinutes > 0 ? `${Math.round(actualMinutes)}分実施 · ` : ''}{resultLabels[result] ?? ''}</span>
                                                </div>
                                            )}
                                            {actualLogs.length > 0 && (
                                                <div className="truncate text-[10px] text-white/80" title={actualLogs.map((log) => log.name).join(', ')}>
                                                    実績: {actualLogs.map((log) => log.name).join(' / ')}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="absolute bottom-0 inset-x-0 h-3 flex items-center justify-center cursor-ns-resize bg-black/10 hover:bg-black/25 text-white/70"
                                            onPointerDown={(event) => beginPointerOperation(event, timebox, 'resize')}
                                            title="15分単位で長さを変更"
                                        >
                                            <GripHorizontal size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="px-3 py-2 border-t border-slate-700 text-[11px] text-slate-500 shrink-0">
                    1時間目盛り・15分単位。ブロックをドラッグして移動、下端をドラッグして長さを変更します。
                </div>

                {editingId && editingTimebox && (
                    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4" onPointerDown={(event) => {
                        if (event.target === event.currentTarget) setEditingId(null);
                    }}>
                        <div className="w-full max-w-sm rounded-xl border border-slate-600 bg-slate-900 shadow-2xl overflow-hidden" onPointerDown={(event) => event.stopPropagation()}>
                            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                                <h3 className="text-sm font-semibold">タイムボックスを編集</h3>
                                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white"><X size={16} /></button>
                            </div>
                            <div className="p-4 space-y-3">
                                <label className="block text-xs text-slate-400">タスク
                                    <select
                                        value={draftTaskId}
                                        onChange={(event) => {
                                            const taskId = event.target.value;
                                            const task = taskById.get(taskId);
                                            setDraftTaskId(taskId);
                                            if (task) {
                                                setDraftName(task.name);
                                                setDraftColorId(task.colorId ?? '');
                                            }
                                        }}
                                        className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm"
                                    >
                                        <option value="">タスク未割当</option>
                                        {tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
                                    </select>
                                </label>
                                <label className="block text-xs text-slate-400">タスク名
                                    <input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" />
                                </label>
                                <label className="block text-xs text-slate-400">色
                                    <select value={draftColorId} onChange={(event) => setDraftColorId(event.target.value)} disabled={!draftTaskId} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm disabled:opacity-40">
                                        <option value="">デフォルト</option>
                                        {colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                                    </select>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-xs text-slate-400">開始
                                        <select value={draftStartMinute} onChange={(event) => setDraftStartMinute(Number(event.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm">
                                            {Array.from({ length: 96 }, (_, index) => index * 15).map((minute) => <option key={minute} value={minute}>{formatMinute(minute)}</option>)}
                                        </select>
                                    </label>
                                    <label className="block text-xs text-slate-400">所要時間
                                        <select value={draftDuration} onChange={(event) => setDraftDuration(Number(event.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm">
                                            {Array.from({ length: 96 }, (_, index) => (index + 1) * 15).map((minute) => <option key={minute} value={minute}>{minute}分</option>)}
                                        </select>
                                    </label>
                                </div>
                            </div>
                            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                                <button onClick={() => { deleteTimebox(editingId); setEditingId(null); }} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"><Trash2 size={14} />削除</button>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingId(null)} className="px-3 py-2 text-xs text-slate-400 hover:text-white">キャンセル</button>
                                    <button onClick={saveEditor} className="px-4 py-2 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white">保存</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DraggablePanel>
    );
}
