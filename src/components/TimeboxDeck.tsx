"use client";

import { useEffect, useMemo, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock3, Plus, Trash2, X } from 'lucide-react';
import { DraggablePanel } from './DraggablePanel';
import { useTaskStore, getLogicalDate, type Task } from '@/store/useTaskStore';
import { useTimeboxStore, type Timebox } from '@/store/useTimeboxStore';
import {
    getActualMinutes,
    getLogicalDayStart,
    getTimeboxResult,
    getTimeboxSlots,
    TIMEBOX_SLOT_MINUTES,
} from '@/utils/timebox';

interface TimeboxDeckProps {
    onClose: () => void;
}

const resultClasses: Record<string, string> = {
    empty: 'text-slate-600',
    planned: 'text-slate-300',
    'in-progress': 'text-blue-300 bg-blue-500/10',
    partial: 'text-amber-300 bg-amber-500/10',
    completed: 'text-green-300 bg-green-500/10',
    overrun: 'text-orange-300 bg-orange-500/10',
    missed: 'text-red-300 bg-red-500/10',
};

const resultLabels: Record<string, string> = {
    'in-progress': '進行中',
    partial: '一部実施',
    completed: '完了',
    overrun: '超過',
    missed: '未実施',
};

function uniqueTasks(tasks: Task[]): Task[] {
    const byId = new Map<string, Task>();
    tasks.forEach((task) => byId.set(task.id, task));
    return [...byId.values()];
}

export function TimeboxDeck({ onClose }: TimeboxDeckProps) {
    const dayStartHour = useTaskStore((state) => state.dayStartHour);
    const currentTask = useTaskStore((state) => state.currentTask);
    const taskStack = useTaskStore((state) => state.taskStack);
    const backlogTasks = useTaskStore((state) => state.backlogTasks);
    const recurringTasks = useTaskStore((state) => state.recurringTasks);
    const history = useTaskStore((state) => state.history);
    const taskLog = useTaskStore((state) => state.taskLog);
    const timeboxes = useTimeboxStore((state) => state.timeboxes);
    const addTimebox = useTimeboxStore((state) => state.addTimebox);
    const updateTimebox = useTimeboxStore((state) => state.updateTimebox);
    const deleteTimebox = useTimeboxStore((state) => state.deleteTimebox);
    const assignTask = useTimeboxStore((state) => state.assignTask);

    const [selectedDate, setSelectedDate] = useState(() => getLogicalDate(Date.now(), dayStartHour));
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        setSelectedDate(getLogicalDate(Date.now(), dayStartHour));
    }, [dayStartHour]);

    const logicalDateKey = format(selectedDate, 'yyyy-MM-dd');
    const slots = useMemo(() => getTimeboxSlots(selectedDate, dayStartHour), [selectedDate, dayStartHour]);
    const dayStart = getLogicalDayStart(selectedDate, dayStartHour).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayTimeboxes = timeboxes
        .filter((timebox) => timebox.logicalDate === logicalDateKey)
        .sort((a, b) => a.startMinute - b.startMinute);
    const tasks = uniqueTasks([
        ...(currentTask ? [currentTask] : []),
        ...taskStack,
        ...backlogTasks,
        ...recurringTasks,
        ...history,
    ]);
    const taskById = new Map(tasks.map((task) => [task.id, task]));

    const findTimebox = (startMinute: number) => dayTimeboxes.find((timebox) =>
        timebox.startMinute <= startMinute && timebox.startMinute + timebox.durationMinutes > startMinute,
    );

    const getMaxDuration = (timebox: Timebox) => {
        const nextStart = dayTimeboxes
            .filter((candidate) => candidate.id !== timebox.id && candidate.startMinute > timebox.startMinute)
            .map((candidate) => candidate.startMinute)
            .sort((a, b) => a - b)[0] ?? 1440;
        return Math.max(TIMEBOX_SLOT_MINUTES, nextStart - timebox.startMinute);
    };

    const changeDate = (date: Date) => setSelectedDate(date);

    return (
        <DraggablePanel
            id="timebox-panel"
            defaultPosition={{ top: 32, right: 32 }}
            defaultSize={{ width: 900, height: 680 }}
            minSize={{ width: 520, height: 360 }}
            title={<div className="flex items-center gap-2"><Clock3 size={16} /><span>タイムボックスデッキ</span></div>}
            headerControls={
                <div className="flex items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
                    <button onClick={() => changeDate(subDays(selectedDate, 1))} className="p-1 rounded hover:bg-slate-700" title="前日">
                        <ChevronLeft size={15} />
                    </button>
                    <button onClick={() => changeDate(getLogicalDate(Date.now(), dayStartHour))} className="px-2 py-1 text-xs rounded hover:bg-slate-700">
                        {format(selectedDate, 'yyyy-MM-dd')}
                    </button>
                    <button onClick={() => changeDate(addDays(selectedDate, 1))} className="p-1 rounded hover:bg-slate-700" title="翌日">
                        <ChevronRight size={15} />
                    </button>
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white" title="閉じる">
                        <X size={15} />
                    </button>
                </div>
            }
        >
            <div className="h-full flex flex-col overflow-hidden bg-slate-900/80">
                <div className="grid grid-cols-[72px_minmax(220px,1fr)_minmax(180px,0.8fr)] border-b border-slate-700 bg-slate-800/80 text-xs uppercase tracking-wide text-slate-400 sticky top-0 z-10">
                    <div className="p-3">時刻</div>
                    <div className="p-3">予定</div>
                    <div className="p-3">実績</div>
                </div>
                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700">
                    {slots.map((slot) => {
                        const timebox = findTimebox(slot.startMinute);
                        const isTimeboxStart = timebox?.startMinute === slot.startMinute;
                        const task = timebox?.taskId ? taskById.get(timebox.taskId) : undefined;
                        const actualMinutes = timebox && isTimeboxStart
                            ? getActualMinutes(timebox.taskId, slot.startTime, Math.min(dayEnd, slot.startTime + timebox.durationMinutes * 60_000), taskLog, currentTask, now)
                            : 0;
                        const plannedMinutes = timebox?.durationMinutes ?? TIMEBOX_SLOT_MINUTES;
                        const result = timebox && isTimeboxStart
                            ? getTimeboxResult(timebox.taskId, actualMinutes, plannedMinutes, Math.min(dayEnd, slot.startTime + plannedMinutes * 60_000), history, currentTask, now)
                            : 'empty';
                        const isCurrentSlot = now >= slot.startTime && now < slot.endTime;

                        return (
                            <div
                                key={slot.startMinute}
                                className={`grid grid-cols-[72px_minmax(220px,1fr)_minmax(180px,0.8fr)] min-h-[38px] border-b border-slate-800/80 text-sm ${isCurrentSlot ? 'bg-blue-500/10' : ''}`}
                            >
                                <div className={`p-2 font-mono text-xs ${isCurrentSlot ? 'text-blue-300 font-bold' : 'text-slate-500'}`}>
                                    {slot.label}
                                </div>
                                <div
                                    className={`p-1.5 border-l border-slate-800 ${isTimeboxStart ? 'bg-slate-800/40' : ''}`}
                                    onDoubleClick={() => {
                                        if (!timebox) addTimebox(logicalDateKey, slot.startMinute);
                                    }}
                                >
                                    {isTimeboxStart && timebox ? (
                                        <div className="flex items-center gap-2 h-full">
                                            <select
                                                value={timebox.taskId ?? ''}
                                                onChange={(event) => assignTask(timebox.id, event.target.value || undefined)}
                                                className="min-w-0 flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                                            >
                                                <option value="">タスクを割り当て</option>
                                                {tasks.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                                            </select>
                                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{timebox.durationMinutes}分</span>
                                            <button
                                                onClick={() => updateTimebox(timebox.id, { durationMinutes: Math.min(getMaxDuration(timebox), timebox.durationMinutes + TIMEBOX_SLOT_MINUTES) })}
                                                className="p-1 text-slate-500 hover:text-white"
                                                title="15分延長"
                                            ><Plus size={13} /></button>
                                            <button onClick={() => deleteTimebox(timebox.id)} className="p-1 text-slate-500 hover:text-red-400" title="予定を削除">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ) : timebox ? (
                                        <span className="text-[10px] text-slate-600">└ 継続</span>
                                    ) : (
                                        <button className="text-xs text-slate-600 hover:text-blue-300 flex items-center gap-1" title="ダブルクリックで予定を追加">
                                            <Plus size={12} /> 予定を追加
                                        </button>
                                    )}
                                </div>
                                <div className={`p-2 border-l border-slate-800 ${resultClasses[result]}`}>
                                    {isTimeboxStart && timebox && task ? (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate">{actualMinutes > 0 ? `${Math.round(actualMinutes)}分` : '—'}</span>
                                            <span className="text-[10px] whitespace-nowrap">{resultLabels[result] ?? ''}</span>
                                        </div>
                                    ) : isTimeboxStart && timebox ? (
                                        <span className="text-xs text-slate-600">タスク未割当</span>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="px-3 py-2 border-t border-slate-700 text-[11px] text-slate-500">
                    1日の開始時間：{String(dayStartHour).padStart(2, '0')}:00 ／ 15分刻み。予定の追加は空欄をダブルクリックします。
                </div>
            </div>
        </DraggablePanel>
    );
}
