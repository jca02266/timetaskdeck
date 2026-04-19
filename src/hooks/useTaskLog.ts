import { useState, useEffect, useMemo } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { useTaskStore, getLogicalDate, TaskLogEntry } from '@/store/useTaskStore';
import { parseTime } from '@/utils/validate';
import { setTimeOnDate, calendarDayForTime } from '@/utils/dateUtils';

export function useTaskLog() {
    const isLogOpen = useTaskStore((state) => state.activeDialog === 'log');
    const openDialog = useTaskStore((state) => state.openDialog);
    const currentTask = useTaskStore((state) => state.currentTask);
    const { taskLog, history, backlogTasks, taskStack, addManualTaskLogEntry } = useTaskStore();
    const dayStartHour = useTaskStore((state) => state.dayStartHour);

    const [now, setNow] = useState(Date.now());
    const [selectedDate, setSelectedDate] = useState<Date>(() => getLogicalDate(Date.now(), dayStartHour));
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<'timeline' | 'aggregated'>('timeline');
    const [localLogs, setLocalLogs] = useState<TaskLogEntry[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [orderMap, setOrderMap] = useState<Record<string, number>>({});
    const [isSortDescending, setIsSortDescending] = useState(true);
    const [activeSelectionLogId, setActiveSelectionLogId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<{ id: string; type: 'start' | 'end'; value: string } | null>(null);

    useEffect(() => {
        if (!isLogOpen) return;
        if (!hasChanges) {
            setLocalLogs(taskLog);
            const map: Record<string, number> = {};
            const sorted = [...taskLog].sort((a, b) => {
                if (a.startTime !== b.startTime) return a.startTime - b.startTime;
                return a.id.localeCompare(b.id);
            });
            sorted.forEach((l, i) => (map[l.id] = i));
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

    const allLogs = (currentTask && currentTask.startTime > 0)
        ? [
            {
                id: 'current-active-task',
                taskId: currentTask.id,
                name: currentTask.name,
                startTime: currentTask.startTime,
                endTime: null as null,
                duration: currentTask.status === 'pending' ? Math.max(0, now - currentTask.startTime) : 0,
                status: currentTask.status === 'pending' ? 'running' : currentTask.status,
            },
            ...localLogs,
          ]
        : localLogs;

    const availableDates = useMemo(() => {
        const dates = new Set<number>();
        localLogs.forEach(log => {
            dates.add(getLogicalDate(log.startTime, dayStartHour).getTime());
        });
        if (currentTask) {
            dates.add(getLogicalDate(currentTask.startTime, dayStartHour).getTime());
        }
        return Array.from(dates).sort((a, b) => a - b);
    }, [localLogs, currentTask, dayStartHour]);

    const navigateDate = (direction: 'prev' | 'next') => {
        const currentMs = selectedDate.getTime();
        if (direction === 'prev') {
            const prev = [...availableDates].reverse().find(d => d < currentMs);
            if (prev) setSelectedDate(new Date(prev));
        } else {
            const next = availableDates.find(d => d > currentMs);
            if (next) setSelectedDate(new Date(next));
        }
    };

    const hasPrevLog = availableDates.some(d => d < selectedDate.getTime());
    const hasNextLog = availableDates.some(d => d > selectedDate.getTime());

    const sortedLogs = [...allLogs.filter(log =>
        isSameDay(getLogicalDate(log.startTime, dayStartHour), selectedDate) &&
        (log.id === 'current-active-task' || Math.abs(log.duration) > 5000)
    )].sort((a, b) => {
        const orderA = orderMap[a.id];
        const orderB = orderMap[b.id];
        if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
        return a.startTime - b.startTime;
    });

    const displayLogs: typeof allLogs = [];
    for (let i = 0; i < sortedLogs.length; i++) {
        const currentLog = sortedLogs[i];
        if (i > 0 && !hasChanges) {
            const previousLog = sortedLogs[i - 1];
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
                        status: 'completed',
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
        const parsed = parseTime(timeStr);
        if (!parsed) return;
        const { hours, minutes } = parsed;
        setLocalLogs(prev => {
            const newLogs = [...prev];
            const index = newLogs.findIndex(l => l.id === logId);
            if (index === -1) return prev;
            const log = { ...newLogs[index] };
            const calDay = calendarDayForTime(selectedDate, hours, dayStartHour);
            const newTimestamp = setTimeOnDate(calDay, hours, minutes);
            if (type === 'start') {
                if (log.startTime === newTimestamp) return prev;
                log.startTime = newTimestamp;
                if (log.endTime !== null) log.duration = log.endTime - log.startTime;
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
            newLogs[index] = { ...newLogs[index], taskId: newTaskId, name: newName };
            setHasChanges(true);
            return newLogs;
        });
    };

    const handleSort = () => {
        const currentLogs = localLogs.filter(l => isSameDay(getLogicalDate(l.startTime, dayStartHour), selectedDate));
        const sorted = [...currentLogs].sort((a, b) => a.startTime - b.startTime);
        const newMap: Record<string, number> = {};
        sorted.forEach((l, i) => { newMap[l.id] = i * 10; });
        setOrderMap(newMap);
        setHasChanges(true);
    };

    const handleAddLog = (beforeLogId?: string) => {
        const currentDayLogs = [...localLogs]
            .filter(l => isSameDay(new Date(l.startTime), selectedDate))
            .sort((a, b) => (orderMap[a.id] ?? Infinity) - (orderMap[b.id] ?? Infinity));

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
            newOrderValue = (orderMap[lastLog.id] ?? currentDayLogs.length * 10) + 10;
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
            status: 'completed' as const,
        };
        setLocalLogs(prev => {
            setHasChanges(true);
            setOrderMap(order => ({ ...order, [newId]: newOrderValue }));
            return [...prev, newLog];
        });
    };

    const handleConvertBreak = (breakLogId: string, taskId: string, name: string) => {
        const log = displayLogs.find(l => l.id === breakLogId);
        if (!log) return;
        const newId = `manual-log-${Date.now()}`;
        const convLog = {
            id: newId,
            taskId,
            name,
            startTime: log.startTime,
            endTime: log.endTime!,
            duration: log.duration,
            status: 'completed' as const,
        };
        const timeIndex = sortedLogs.findIndex(sl => sl.startTime > log.startTime);
        let newOrderValue = 0;
        if (timeIndex === 0) {
            newOrderValue = (orderMap[sortedLogs[0].id] ?? 1000) - 5;
        } else if (timeIndex === -1) {
            newOrderValue = (orderMap[sortedLogs[sortedLogs.length - 1].id] ?? 0) + 5;
        } else {
            const prevOrder = orderMap[sortedLogs[timeIndex - 1].id] ?? 0;
            const nextOrder = orderMap[sortedLogs[timeIndex].id] ?? (prevOrder + 10);
            newOrderValue = (prevOrder + nextOrder) / 2;
        }
        setLocalLogs(prev => {
            setHasChanges(true);
            setOrderMap(order => ({ ...order, [newId]: newOrderValue }));
            return [...prev, convLog];
        });
    };

    const handleClose = () => {
        if (hasChanges) {
            const hasInvalid = localLogs.some(l => l.endTime !== null && Math.floor(l.startTime / 60000) > Math.floor(l.endTime / 60000));
            if (hasInvalid) {
                if (window.confirm('開始時刻が終了時刻より後になっている不正なタスクがあります。変更を破棄して閉じますか？\n（キャンセルを押すと編集に戻ります）')) {
                    setHasChanges(false);
                    openDialog(null);
                }
                return;
            }
            useTaskStore.getState().updateTaskLogs(localLogs);
            setHasChanges(false);
        }
        openDialog(null);
    };

    return {
        isLogOpen,
        now,
        selectedDate,
        setSelectedDate,
        copied,
        viewMode,
        setViewMode,
        localLogs,
        hasChanges,
        isSortDescending,
        setIsSortDescending,
        activeSelectionLogId,
        setActiveSelectionLogId,
        editingValue,
        allLogs,
        availableDates,
        sortedLogs,
        displayLogs,
        aggregatedLogs,
        dataToDisplay,
        hasPrevLog,
        hasNextLog,
        history,
        backlogTasks,
        taskStack,
        addManualTaskLogEntry,
        formatDurationHHmm,
        formatRoundedDecimal,
        navigateDate,
        handleCopy,
        handleTimeChange,
        handleTimeBlur,
        handleDeleteLog,
        handleChangeTask,
        handleConvertBreak,
        handleSort,
        handleAddLog,
        handleClose,
    };
}
