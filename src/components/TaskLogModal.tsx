import { useTaskStore } from '@/store/useTaskStore';
import { X, Clock, ChevronLeft, ChevronRight, Copy, Check, List, Layers } from 'lucide-react';
import { format, startOfDay, addDays, subDays, isSameDay } from 'date-fns';
import { useState, useEffect } from 'react';

export function TaskLogModal() {
    const isLogOpen = useTaskStore((state) => state.isLogOpen);
    const setIsLogOpen = useTaskStore((state) => state.setIsLogOpen);
    const currentTask = useTaskStore((state) => state.currentTask);
    const { taskLog, addManualTaskLogEntry } = useTaskStore();

    const [now, setNow] = useState(Date.now());
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<'timeline' | 'aggregated'>('timeline');

    useEffect(() => {
        if (!isLogOpen) return;
        setNow(Date.now());
        setSelectedDate(startOfDay(new Date()));
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [isLogOpen]);

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
        ...taskLog
    ] : taskLog;

    // Build a unique list of actual task names for the convert dropdown
    const uniqueTasks = Array.from(
        new Map(
            taskLog
                .filter(log => log.taskId !== 'break' && log.id !== 'current-active-task')
                .map(log => [log.taskId, { id: log.taskId, name: log.name }])
        ).values()
    );

    // Sort by startTime so timeline goes chronologically
    const sortedLogs = [...allLogs.filter(log => isSameDay(new Date(log.startTime), selectedDate))].sort((a, b) => a.startTime - b.startTime);

    // Calculate gaps and insert artificial "Break" tasks
    const displayLogs: typeof allLogs = [];
    for (let i = 0; i < sortedLogs.length; i++) {
        const currentLog = sortedLogs[i];

        // If there's a previous log, check the gap between its end and current's start
        if (i > 0) {
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

    // Helper functions for formatting duration
    const formatDurationHHmm = (ms: number) => {
        const totalMinutes = Math.floor(ms / 1000 / 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const formatRounded15m = (ms: number) => {
        const totalMinutes = ms / 1000 / 60;
        const roundedMinutes = Math.round(totalMinutes / 15) * 15;
        const hours = Math.floor(roundedMinutes / 60);
        const mins = roundedMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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

    const dataToDisplay = viewMode === 'timeline' ? displayLogs : aggregatedLogs;

    const handleCopy = async () => {
        let text = `Task Activity Log - ${format(selectedDate, 'yyyy-MM-dd')} (${viewMode === 'timeline' ? 'Timeline' : 'Aggregated'})\n\n`;

        if (viewMode === 'timeline') {
            text += `Task Name\tStartTime\tEndTime\tDuration (HH:mm)\tRounded (15m)\tStatus\n`;
            dataToDisplay.forEach(log => {
                const start = format(log.startTime, 'HH:mm');
                const end = log.endTime ? format(log.endTime, 'HH:mm') : '--:--';
                const dur = formatDurationHHmm(log.duration);
                const rounded = formatRounded15m(log.duration);
                const status = log.status === 'running' ? 'Running' : log.status;
                text += `${log.name}\t${start}\t${end}\t${dur}\t${rounded}\t${status}\n`;
            });
        } else {
            text += `Task Name\tTotal Duration (HH:mm)\tRounded (15m)\tStatus\n`;
            dataToDisplay.forEach(log => {
                const dur = formatDurationHHmm(log.duration);
                const rounded = formatRounded15m(log.duration);
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
                            <span className="text-sm font-mono text-slate-200 min-w-[110px] text-center">
                                {format(selectedDate, 'yyyy-MM-dd')}
                            </span>
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
                            onClick={() => setIsLogOpen(false)}
                            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800"
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
                                    return (
                                        <tr key={log.id || `agg-${i}`} className={`transition-colors ${log.id === 'current-active-task' ? 'bg-blue-900/20 hover:bg-blue-900/30' :
                                                log.taskId === 'break' ? 'bg-slate-800/30 text-slate-500' :
                                                    'hover:bg-slate-800/50'
                                            }`}>
                                            <td className={`p-4 font-medium truncate max-w-[200px] ${log.taskId === 'break' ? 'italic' : ''}`} title={log.name}>
                                                <div className="flex items-center gap-2">
                                                    <span>{log.name}</span>
                                                    {log.taskId === 'break' && viewMode === 'timeline' && (
                                                        <select
                                                            className="ml-2 bg-slate-800 border border-slate-700 outline-none text-slate-400 p-1 rounded text-xs hover:text-white"
                                                            value=""
                                                            onChange={(e) => {
                                                                if (!e.target.value) return;
                                                                const selectedMatch = uniqueTasks.find(t => t.id === e.target.value);
                                                                if (selectedMatch) {
                                                                    addManualTaskLogEntry(
                                                                        selectedMatch.id,
                                                                        selectedMatch.name,
                                                                        log.startTime,
                                                                        log.endTime!,
                                                                        log.duration,
                                                                        'completed'
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <option value="">＋ Task</option>
                                                            {uniqueTasks.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                            {viewMode === 'timeline' && (
                                                <td className="p-4 font-mono text-slate-400">
                                                    {format(log.startTime, 'HH:mm')}
                                                </td>
                                            )}
                                            {viewMode === 'timeline' && (
                                                <td className="p-4 font-mono text-slate-400">
                                                    {log.endTime ? format(log.endTime, 'HH:mm') : '--:--'}
                                                </td>
                                            )}
                                            <td className="p-4 font-mono font-medium text-slate-200">
                                                {formatDurationHHmm(log.duration)}
                                            </td>
                                            <td className="p-4 font-mono text-slate-500">
                                                {formatRounded15m(log.duration)}
                                            </td>
                                            <td className="p-4 capitalize text-xs">
                                                {viewMode === 'aggregated' && log.status !== 'running' ? null : (
                                                    <span className={`px-2 py-1 rounded-full whitespace-nowrap ${log.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        log.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse font-bold border border-blue-500/30' :
                                                            log.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                log.status === 'interrupted' ? 'bg-orange-500/20 text-orange-400' :
                                                                    'bg-slate-700 text-slate-300'
                                                        }`}>
                                                        {log.status === 'running' ? 'Running' : log.status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
