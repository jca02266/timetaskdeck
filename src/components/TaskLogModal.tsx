import { useTaskStore, getLogicalDate } from '@/store/useTaskStore';
import { X, Clock, ChevronLeft, ChevronRight, Copy, Check, List, Layers, Trash2, Plus } from 'lucide-react';
import { format, startOfDay, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import { DatePicker } from './DatePicker';
import { TaskSelectionDialog } from './TaskSelectionDialog';

export function TaskLogModal() {
    const isLogOpen = useTaskStore((state) => state.isLogOpen);
    const setIsLogOpen = useTaskStore((state) => state.setIsLogOpen);
    const currentTask = useTaskStore((state) => state.currentTask);
    const { taskLog, history, backlogTasks, taskStack, addManualTaskLogEntry } = useTaskStore();

    const dayStartHour = useTaskStore((state) => state.dayStartHour);
    const [now, setNow] = useState(Date.now());
    const [selectedDate, setSelectedDate] = useState<Date>(() => getLogicalDate(Date.now(), dayStartHour));
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<'timeline' | 'aggregated'>('timeline');
    const [localLogs, setLocalLogs] = useState<typeof taskLog>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [orderMap, setOrderMap] = useState<Record<string, number>>({});
    const [isSortDescending, setIsSortDescending] = useState(true);
    const [activeSelectionLogId, setActiveSelectionLogId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<{ id: string, type: 'start' | 'end', value: string } | null>(null);

    useEffect(() => {
        if (!isLogOpen) return;
        if (!hasChanges) {
            setLocalLogs(taskLog);
            const map: Record<string, number> = {};
            const sorted = [...taskLog].sort((a, b) => {
                if (a.startTime !== b.startTime) return a.startTime - b.startTime;
                return a.id.localeCompare(b.id);
            });
            sorted.forEach((l, i) => map[l.id] = i);
            setOrderMap(map);
        }
    }, [isLogOpen, taskLog, hasChanges]);

    useEffect(() => {
        if (!isLogOpen) return;
        setNow(Date.now());
        setSelectedDate(getLogicalDate(Date.now(), dayStartHour));
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [isLogOpen, dayStartHour]);

    if (!isLogOpen) return null;

    const allLogs = currentTask ? [
        {
            id: 'current-active-task',
            taskId: currentTask.id,
            name: currentTask.name,
            startTime: currentTask.startTime,
            endTime: null,
            duration: currentTask.status === 'pending' ? Math.max(0, now - currentTask.startTime) : 0,
            status: currentTask.status === 'pending' ? 'running' : currentTask.status
        },
        ...localLogs
    ] : localLogs;

    const sortedLogs = [...allLogs.filter(log =>
        isSameDay(getLogicalDate(log.startTime, dayStartHour), selectedDate) &&
        (log.id === 'current-active-task' || Math.abs(log.duration) > 5000)
    )].sort((a, b) => {
        const orderA = orderMap[a.id];
        const orderB = orderMap[b.id];

        // If both have explicit order, use it
        if (orderA !== undefined && orderB !== undefined) return orderA - orderB;

        // Fallback to start time
        return a.startTime - b.startTime;
    });

    // Calculate gaps and insert artificial "Break" tasks
    const displayLogs: typeof allLogs = [];
    for (let i = 0; i < sortedLogs.length; i++) {
        const currentLog = sortedLogs[i];

        // If there's a previous log, check the gap between its end and current's start
        if (i > 0 && !hasChanges) {
            const previousLog = sortedLogs[i - 1];
            // Only calculate gap if previous log actually ended (has endTime)
            // If it's the "current running task", it doesn't have an endTime, so it won't trigger a gap before itself in history unless it started way after the last task ended.
            if (previousLog.endTime) {
                const gapMs = currentLog.startTime - previousLog.endTime;
                const gapMinutes = gapMs / 1000 / 60;

                if (gapMinutes >= 5) {
                    displayLogs.push({
                        id: `gap-${previousLog.id}-${currentLog.id}`,
                        taskId: 'break',
                        name: 'BreakTime',
                        startTime: previousLog.endTime,
                        endTime: currentLog.startTime,
                        duration: gapMs,
                        status: 'completed'
                    });
                }
            }
        }

        displayLogs.push(currentLog);
    }

    const formatDurationHHmm = (ms: number) => {
        const isNegative = ms < 0;
        const absMs = Math.abs(ms);
        const totalMinutes = Math.floor(absMs / 1000 / 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${isNegative ? '-' : ''}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const formatRoundedDecimal = (ms: number) => {
        const isNegative = ms < 0;
        const absMs = Math.abs(ms);
        const totalMinutes = absMs / 1000 / 60;
        const roundedMinutes = Math.round(totalMinutes / 15) * 15;
        const decimalHours = roundedMinutes / 60;
        return `${isNegative ? '-' : ''}${decimalHours.toFixed(2)}`;
    };

    // Aggregation logic
    const aggregatedLogs = displayLogs.reduce((acc, log) => {
        const existing = acc.find(item => item.name === log.name);
        if (existing) {
            existing.duration += log.duration;
            if (log.status === 'running') existing.status = 'running';
        } else {
            acc.push({ ...log });
        }
        return acc;
    }, [] as typeof displayLogs).sort((a, b) => b.duration - a.duration);
    const dataToDisplay = viewMode === 'timeline'
        ? (isSortDescending ? [...displayLogs].reverse() : displayLogs)
        : aggregatedLogs;

    const handleCopy = async () => {
        let text = `Task Activity Log - ${format(selectedDate, 'yyyy-MM-dd')} (${viewMode === 'timeline' ? 'Timeline' : 'Aggregated'})\n\n`;

        if (viewMode === 'timeline') {
            text += `Task Name\tStartTime\tEndTime\tDuration (HH:mm)\tRounded (15m)\tStatus\n`;
            dataToDisplay.forEach(log => {
                const start = format(log.startTime, 'HH:mm');
                const end = log.endTime ? format(log.endTime, 'HH:mm') : '--:--';
                const dur = formatDurationHHmm(log.duration);
                const rounded = formatRoundedDecimal(log.duration);
                const status = log.status === 'running' ? 'Running' : log.status;
                text += `${log.name}\t${start}\t${end}\t${dur}\t${rounded}\t${status}\n`;
            });
        } else {
            text += `Task Name\tTotal Duration (HH:mm)\tRounded (15m)\tStatus\n`;
            dataToDisplay.forEach(log => {
                const dur = formatDurationHHmm(log.duration);
                const rounded = formatRoundedDecimal(log.duration);
                const status = log.status === 'running' ? 'Running' : '';
                text += `${log.name}\t${dur}\t${rounded}\t${status}\n`;
            });
        }

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleTimeChange = (logId: string, type: 'start' | 'end', timeStr: string) => {
        setEditingValue({ id: logId, type, value: timeStr });
    };

    const applyTimeUpdate = (logId: string, type: 'start' | 'end', timeStr: string) => {
        if (!timeStr) return;
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return;

        setLocalLogs(prev => {
            const newLogs = [...prev];
            const index = newLogs.findIndex(l => l.id === logId);
            if (index === -1) return prev;

            const log = { ...newLogs[index] };
            const baseDate = new Date(type === 'start' ? log.startTime : (log.endTime || log.startTime));
            const newTimestamp = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes).getTime();

            if (type === 'start') {
                if (log.startTime === newTimestamp) return prev;
                log.startTime = newTimestamp;
                if (log.endTime !== null) {
                    log.duration = log.endTime - log.startTime;
                }
                newLogs[index] = log;
            } else {
                if (log.endTime === newTimestamp) return prev;
                log.endTime = newTimestamp;
                log.duration = log.endTime - log.startTime;
                newLogs[index] = log;
            }

            setHasChanges(true);
            return newLogs;
        });
    };

    const handleTimeBlur = (logId: string, type: 'start' | 'end') => {
        if (editingValue && editingValue.id === logId && editingValue.type === type) {
            applyTimeUpdate(logId, type, editingValue.value);
            setEditingValue(null);
        }
    };

    const handleDeleteLog = (logId: string) => {
        setLocalLogs(prev => {
            setHasChanges(true);
            return prev.filter(l => l.id !== logId);
        });
    };

    const handleChangeTask = (logId: string, newTaskId: string, newName: string) => {
        setLocalLogs(prev => {
            const index = prev.findIndex(l => l.id === logId);
            if (index === -1) return prev;

            const newLogs = [...prev];
            newLogs[index] = {
                ...newLogs[index],
                taskId: newTaskId,
                name: newName
            };
            setHasChanges(true);
            return newLogs;
        });
    };

    const handleSort = () => {
        const currentLogs = localLogs.filter(l => isSameDay(getLogicalDate(l.startTime, dayStartHour), selectedDate));
        const sorted = [...currentLogs].sort((a, b) => a.startTime - b.startTime);

        const newMap: Record<string, number> = {};
        sorted.forEach((l, i) => {
            newMap[l.id] = i * 10;
        });
        setOrderMap(newMap);
        setHasChanges(true);
    };

    const handleAddLog = (beforeLogId?: string) => {
        const currentDayLogs = [...localLogs]
            .filter(l => isSameDay(new Date(l.startTime), selectedDate))
            .sort((a, b) => {
                const orderA = orderMap[a.id] ?? Infinity;
                const orderB = orderMap[b.id] ?? Infinity;
                return orderA - orderB;
            });

        let newStart = startOfDay(selectedDate).getTime() + 9 * 60 * 60 * 1000;
        let newEnd = newStart + 30 * 60 * 1000;
        let newOrderValue = 0;

        if (beforeLogId) {
            const targetIndex = currentDayLogs.findIndex(l => l.id === beforeLogId);
            if (targetIndex !== -1) {
                const targetLog = currentDayLogs[targetIndex];
                newStart = targetLog.startTime;
                newEnd = targetLog.endTime || targetLog.startTime;

                const targetOrder = orderMap[targetLog.id] ?? 1000;
                if (targetIndex > 0) {
                    const prevLog = currentDayLogs[targetIndex - 1];
                    const prevOrder = orderMap[prevLog.id] ?? (targetOrder - 10);
                    newOrderValue = (prevOrder + targetOrder) / 2;
                } else {
                    newOrderValue = targetOrder - 5;
                }
            }
        } else if (currentDayLogs.length > 0) {
            const lastLog = currentDayLogs[currentDayLogs.length - 1];
            newStart = lastLog.endTime || (lastLog.startTime + 30 * 60 * 1000);
            newEnd = newStart + 30 * 60 * 1000;
            newOrderValue = (orderMap[lastLog.id] ?? (currentDayLogs.length * 10)) + 10;
        } else {
            newOrderValue = 1000;
        }

        const newId = `manual-log-${Date.now()}`;
        const newLog = {
            id: newId,
            taskId: 'manual',
            name: 'New Task',
            startTime: newStart,
            endTime: newEnd,
            duration: newEnd - newStart,
            status: 'completed' as const
        };

        setLocalLogs(prev => {
            setHasChanges(true);
            setOrderMap(order => ({
                ...order,
                [newId]: newOrderValue
            }));
            return [...prev, newLog];
        });
    };

    const handleClose = () => {
        if (hasChanges) {
            const hasInvalid = localLogs.some(l => l.endTime !== null && Math.floor(l.startTime / 60000) > Math.floor(l.endTime / 60000));
            if (hasInvalid) {
                if (window.confirm('開始時刻が終了時刻より後になっている不正なタスクがあります。変更を破棄して閉じますか？\n（キャンセルを押すと編集に戻ります）')) {
                    setHasChanges(false);
                    // Reset to original on next open
                    setIsLogOpen(false);
                }
                return;
            }
            useTaskStore.getState().updateTaskLogs(localLogs);
            setHasChanges(false);
        }
        setIsLogOpen(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-20 sm:pt-24">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-slate-200 font-semibold">
                            <Clock className="text-blue-400" size={20} />
                            <span>Activity Log</span>
                        </div>

                        {/* Date Navigation */}
                        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                            <button
                                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center justify-center px-2">
                                <DatePicker
                                    value={format(selectedDate, 'yyyy-MM-dd')}
                                    onChange={(val) => {
                                        if (val) setSelectedDate(startOfDay(parseISO(val)));
                                    }}
                                    className="bg-transparent border-none text-sm font-mono text-slate-200 hover:text-white justify-center h-auto py-1 px-2 pointer-cursor"
                                />
                            </div>
                            <button
                                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                disabled={isSameDay(selectedDate, startOfDay(new Date()))}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1 border border-slate-700 ml-4">
                            <button
                                onClick={() => setViewMode('timeline')}
                                className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${viewMode === 'timeline' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                title="Timeline View"
                            >
                                <List size={14} /> Timeline
                            </button>
                            <button
                                onClick={() => setViewMode('aggregated')}
                                className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${viewMode === 'aggregated' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                title="Aggregated by Task Name"
                            >
                                <Layers size={14} /> Aggregated
                            </button>
                        </div>

                        {/* Sort Button */}
                        {viewMode === 'timeline' && (
                            <button
                                onClick={handleSort}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
                                title="時刻順に並べ替え"
                            >
                                <List size={14} className="opacity-50" />
                                <span>Sort by Time</span>
                            </button>
                        )}
                        {/* Sort Toggle (Timeline Only) */}
                        {viewMode === 'timeline' && (
                            <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1 border border-slate-700 ml-4">
                                <button
                                    onClick={() => setIsSortDescending(!isSortDescending)}
                                    className="px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
                                    title={isSortDescending ? "Sort: Newest First" : "Sort: Oldest First"}
                                >
                                    {isSortDescending ? "↓ Newest First" : "↑ Oldest First"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${copied
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                                }`}
                            disabled={dataToDisplay.length === 0}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied!' : 'Copy Table'}
                        </button>
                        <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>
                        <button
                            onClick={handleClose}
                            className={`transition-colors p-1.5 rounded-md hover:bg-slate-800 ${hasChanges ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400 hover:text-white'}`}
                            title={hasChanges ? "Save changes and close" : "Close"}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-0 flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800/80 sticky top-0 backdrop-blur-md text-xs uppercase text-slate-400 font-medium">
                            <tr>
                                <th className="p-4 w-1/3">Task Name</th>
                                {viewMode === 'timeline' && <th className="p-4">Start Time</th>}
                                {viewMode === 'timeline' && <th className="p-4">End Time</th>}
                                <th className="p-4">Duration (HH:mm)</th>
                                <th className="p-4 text-slate-500">Rounded (15m)</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                            {dataToDisplay.length === 0 ? (
                                <tr>
                                    <td colSpan={viewMode === 'timeline' ? 6 : 4} className="p-8 text-center text-slate-500 italic">
                                        No activity recorded for this day.
                                    </td>
                                </tr>
                            ) : (
                                dataToDisplay.map((log, i) => {
                                    // Identify this log's position in the baseline time-sorted sequence
                                    const timeIndex = sortedLogs.findIndex(l => l.id === log.id);
                                    const prevInTime = timeIndex > 0 ? sortedLogs[timeIndex - 1] : null;
                                    const nextInTime = timeIndex < sortedLogs.length - 1 ? sortedLogs[timeIndex + 1] : null;

                                    const startMin = Math.floor(log.startTime / 60000);
                                    const endMin = log.endTime !== null ? Math.floor(log.endTime / 60000) : null;
                                    const prevEndMin = (prevInTime && prevInTime.endTime !== null) ? Math.floor(prevInTime.endTime / 60000) : null;
                                    const nextStartMin = nextInTime ? Math.floor(nextInTime.startTime / 60000) : null;

                                    const isSelfInvalid = endMin !== null && startMin > endMin;
                                    const overlapsPrev = viewMode === 'timeline' && prevEndMin !== null && startMin < prevEndMin;
                                    const overlapsNext = viewMode === 'timeline' && nextStartMin !== null && endMin !== null && endMin > nextStartMin;

                                    const isInvalid = isSelfInvalid || overlapsPrev || overlapsNext;
                                    const isShort = !isInvalid && log.id !== 'current-active-task' && log.taskId !== 'break' && Math.abs(log.duration) < 60000;
                                    const invalidTextClass = isInvalid ? "text-red-500 font-bold" : "";
                                    const shortTextClass = isShort ? "text-slate-500" : "";

                                    return (
                                        <tr key={log.id || `agg-${i}`} className={`transition-colors ${isInvalid ? 'bg-red-900/10 hover:bg-red-900/20' : log.id === 'current-active-task' ? 'bg-blue-900/20 hover:bg-blue-900/30' :
                                            log.taskId === 'break' ? 'bg-slate-800/30 text-slate-500' :
                                                isShort ? 'opacity-50 text-slate-500' : 'hover:bg-slate-800/50'
                                            }`}>
                                            <td className={`p-4 font-medium truncate max-w-[200px] ${log.taskId === 'break' ? 'italic' : ''} ${invalidTextClass || shortTextClass}`} title={log.name}>
                                                <div className="flex items-center gap-2">
                                                    {log.id !== 'current-active-task' && log.taskId !== 'break' ? (
                                                        <button
                                                            onClick={() => setActiveSelectionLogId(log.id)}
                                                            className={`text-left flex-1 max-w-[250px] truncate border-b border-transparent hover:border-slate-700 transition-all ${isInvalid ? 'text-red-500' : isShort ? 'text-slate-400 hover:text-slate-200' : 'text-slate-200 hover:text-white'}`}
                                                            title="Click to change task"
                                                        >
                                                            {log.name}
                                                        </button>
                                                    ) : (
                                                        <span>{log.name}</span>
                                                    )}
                                                    {log.taskId === 'break' && viewMode === 'timeline' && (
                                                        <button
                                                            onClick={() => setActiveSelectionLogId(log.id)}
                                                            className="ml-2 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all uppercase tracking-tighter"
                                                        >
                                                            ＋ Task
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {viewMode === 'timeline' && (
                                                <td className={`p-4 font-mono ${invalidTextClass || shortTextClass || 'text-slate-400'}`}>
                                                    {log.id === 'current-active-task' || log.taskId === 'break' ? (
                                                        format(log.startTime, 'HH:mm')
                                                    ) : (
                                                        <input
                                                            type="time"
                                                            value={editingValue?.id === log.id && editingValue?.type === 'start' ? editingValue.value : format(log.startTime, 'HH:mm')}
                                                            onChange={(e) => handleTimeChange(log.id, 'start', e.target.value)}
                                                            onBlur={() => handleTimeBlur(log.id, 'start')}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleTimeBlur(log.id, 'start')}
                                                            className={`bg-transparent border-b border-transparent focus:outline-none w-24 ${isInvalid ? 'border-red-500/50 focus:border-red-500' : 'hover:border-slate-700 focus:border-blue-500'}`}
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            {viewMode === 'timeline' && (
                                                <td className={`p-4 font-mono ${invalidTextClass || shortTextClass || 'text-slate-400'}`}>
                                                    {log.id === 'current-active-task' ? (
                                                        '--:--'
                                                    ) : log.taskId === 'break' ? (
                                                        log.endTime ? format(log.endTime, 'HH:mm') : '--:--'
                                                    ) : (
                                                        <input
                                                            type="time"
                                                            value={editingValue?.id === log.id && editingValue?.type === 'end' ? editingValue.value : (log.endTime ? format(log.endTime, 'HH:mm') : '')}
                                                            onChange={(e) => handleTimeChange(log.id, 'end', e.target.value)}
                                                            onBlur={() => handleTimeBlur(log.id, 'end')}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleTimeBlur(log.id, 'end')}
                                                            className={`bg-transparent border-b border-transparent focus:outline-none w-24 ${isInvalid ? 'border-red-500/50 focus:border-red-500' : 'hover:border-slate-700 focus:border-blue-500'}`}
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            <td className={`p-4 font-mono font-medium ${invalidTextClass || (isShort ? 'text-slate-400' : 'text-slate-200')}`}>
                                                {formatDurationHHmm(Math.abs(log.duration))}
                                                {log.duration < 0 && <span className="text-red-500 text-xs ml-1">(Negative)</span>}
                                            </td>
                                            <td className={`p-4 font-mono text-slate-500 ${isInvalid ? 'opacity-50' : ''}`}>
                                                {formatRoundedDecimal(log.duration)}
                                            </td>
                                            <td className="p-4 capitalize text-xs">
                                                {viewMode === 'aggregated' && log.status !== 'running' ? null : (
                                                    <div className="flex items-center gap-2 justify-between">
                                                        <span className={`px-2 py-1 rounded-full whitespace-nowrap ${log.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                            log.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse font-bold border border-blue-500/30' :
                                                                log.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    log.status === 'interrupted' ? 'bg-orange-500/20 text-orange-400' :
                                                                        'bg-slate-700 text-slate-300'
                                                            }`}>
                                                            {log.status === 'running' ? 'Running' : log.status}
                                                        </span>
                                                        {viewMode === 'timeline' && log.id !== 'current-active-task' && log.taskId !== 'break' && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => handleAddLog(log.id)}
                                                                    className="text-slate-500 hover:text-blue-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                                                    title="Insert log entry above"
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteLog(log.id)}
                                                                    className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                                                    title="Delete this entry"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    {viewMode === 'timeline' && (
                        <div className="p-4 border-t border-slate-800 flex justify-center bg-slate-800/20">
                            <button
                                onClick={() => handleAddLog()}
                                className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-all border border-slate-700 hover:border-slate-500 group shadow-lg"
                            >
                                <span className="text-xl leading-none group-hover:scale-125 transition-transform">＋</span>
                                <span>Add Log Entry</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {activeSelectionLogId && (
                <TaskSelectionDialog
                    referenceDate={selectedDate}
                    onSelect={(taskId, name) => {
                        const log = displayLogs.find(l => l.id === activeSelectionLogId);
                        if (log) {
                            if (log.taskId === 'break') {
                                // Conversion logic for break
                                const newId = `manual-log-${Date.now()}`;
                                const convLog = {
                                    id: newId,
                                    taskId,
                                    name,
                                    startTime: log.startTime,
                                    endTime: log.endTime!,
                                    duration: log.duration,
                                    status: 'completed' as const
                                };

                                // Find its place in the sorted sequence to get neighbors
                                const timeIndex = sortedLogs.findIndex(sl => sl.startTime > log.startTime);
                                let newOrderValue = 0;
                                if (timeIndex === 0) {
                                    const nextOrder = orderMap[sortedLogs[0].id] ?? 1000;
                                    newOrderValue = nextOrder - 5;
                                } else if (timeIndex === -1) {
                                    const prevOrder = orderMap[sortedLogs[sortedLogs.length - 1].id] ?? 0;
                                    newOrderValue = prevOrder + 5;
                                } else {
                                    const prevOrder = orderMap[sortedLogs[timeIndex - 1].id] ?? 0;
                                    const nextOrder = orderMap[sortedLogs[timeIndex].id] ?? (prevOrder + 10);
                                    newOrderValue = (prevOrder + nextOrder) / 2;
                                }

                                setLocalLogs(prev => {
                                    setHasChanges(true);
                                    setOrderMap(order => ({
                                        ...order,
                                        [newId]: newOrderValue
                                    }));
                                    return [...prev, convLog];
                                });
                            } else {
                                // Normal update
                                handleChangeTask(activeSelectionLogId, taskId, name);
                            }
                        }
                        setActiveSelectionLogId(null);
                    }}
                    onClose={() => setActiveSelectionLogId(null)}
                />
            )}
        </div>
    );
}
