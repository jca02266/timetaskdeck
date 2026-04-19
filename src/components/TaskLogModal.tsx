import { X, Clock, ChevronLeft, ChevronRight, Copy, Check, List, Layers, Trash2, Plus, RefreshCw } from 'lucide-react';
import { format, startOfDay, parseISO } from 'date-fns';
import { DatePicker } from './DatePicker';
import { TaskSelectionDialog } from './TaskSelectionDialog';
import { TimeInput } from './ui/TimeInput';
import { useTaskLog } from '@/hooks/useTaskLog';

export function TaskLogModal() {
    const {
        isLogOpen,
        selectedDate,
        setSelectedDate,
        copied,
        viewMode,
        setViewMode,
        hasChanges,
        isSortDescending,
        setIsSortDescending,
        activeSelectionLogId,
        setActiveSelectionLogId,
        editingValue,
        sortedLogs,
        displayLogs,
        dataToDisplay,
        hasPrevLog,
        hasNextLog,
        formatDurationHHmm,
        formatRoundedDecimal,
        navigateDate,
        handleCopy,
        handleTimeChange,
        handleTimeBlur,
        handleDeleteLog,
        handleChangeTask,
        handleConvertBreak,
        handleRefresh,
        handleAddLog,
        handleClose,
    } = useTaskLog();

    if (!isLogOpen) return null;

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
                                onClick={() => navigateDate('prev')}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                disabled={!hasPrevLog}
                                title={hasPrevLog ? "Previous log date" : "No previous logs"}
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
                                onClick={() => navigateDate('next')}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                disabled={!hasNextLog}
                                title={hasNextLog ? "Next log date" : "No next logs"}
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
                            onClick={handleRefresh}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white"
                            title="保存してリフレッシュ（時刻順に並び替え）"
                        >
                            <RefreshCw size={14} />
                            <span>Refresh</span>
                        </button>
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
                                                        <TimeInput
                                                            id={`log-input-${log.id}-start`}
                                                            variant="inline"
                                                            value={editingValue?.id === log.id && editingValue?.type === 'start' ? editingValue.value : format(log.startTime, 'HH:mm')}
                                                            onChange={(v) => handleTimeChange(log.id, 'start', v)}
                                                            onBlur={() => handleTimeBlur(log.id, 'start')}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleTimeBlur(log.id, 'start');
                                                                if (e.key === 'Tab') {
                                                                    if (!e.shiftKey) {
                                                                        e.preventDefault();
                                                                        document.getElementById(`log-input-${log.id}-end`)?.focus();
                                                                    } else {
                                                                        const prevLog = displayLogs[i - 1];
                                                                        if (prevLog) {
                                                                            e.preventDefault();
                                                                            document.getElementById(`log-input-${prevLog.id}-end`)?.focus();
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            isInvalid={isInvalid}
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
                                                        <TimeInput
                                                            id={`log-input-${log.id}-end`}
                                                            variant="inline"
                                                            value={editingValue?.id === log.id && editingValue?.type === 'end' ? editingValue.value : (log.endTime ? format(log.endTime, 'HH:mm') : '')}
                                                            onChange={(v) => handleTimeChange(log.id, 'end', v)}
                                                            onBlur={() => handleTimeBlur(log.id, 'end')}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleTimeBlur(log.id, 'end');
                                                                if (e.key === 'Tab') {
                                                                    if (!e.shiftKey) {
                                                                        const nextLog = displayLogs[i + 1];
                                                                        if (nextLog) {
                                                                            e.preventDefault();
                                                                            document.getElementById(`log-input-${nextLog.id}-start`)?.focus();
                                                                        }
                                                                    } else {
                                                                        e.preventDefault();
                                                                        document.getElementById(`log-input-${log.id}-start`)?.focus();
                                                                    }
                                                                }
                                                            }}
                                                            isInvalid={isInvalid}
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
                                handleConvertBreak(activeSelectionLogId, taskId, name);
                            } else {
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
