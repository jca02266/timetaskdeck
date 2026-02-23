import { useTaskStore } from '@/store/useTaskStore';
import { X, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function TaskLogModal() {
    const isLogOpen = useTaskStore((state) => state.isLogOpen);
    const setIsLogOpen = useTaskStore((state) => state.setIsLogOpen);
    const { taskLog } = useTaskStore();

    if (!isLogOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold">
                        <Clock className="text-blue-400" size={20} />
                        <span>Task Activity Log</span>
                    </div>
                    <button
                        onClick={() => setIsLogOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-0 flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-800/80 sticky top-0 backdrop-blur-md text-xs uppercase text-slate-400 font-medium">
                            <tr>
                                <th className="p-4 w-1/3">Task Name</th>
                                <th className="p-4">Start Time</th>
                                <th className="p-4">End Time</th>
                                <th className="p-4">Session Duration</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                            {taskLog.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                        No activity recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                taskLog.map((log) => {
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-medium truncate max-w-[200px]" title={log.name}>
                                                {log.name}
                                            </td>
                                            <td className="p-4 font-mono text-slate-400">
                                                {format(log.startTime, 'yyyy-MM-dd HH:mm:ss')}
                                            </td>
                                            <td className="p-4 font-mono text-slate-400">
                                                {format(log.endTime, 'HH:mm:ss')}
                                            </td>
                                            <td className="p-4 font-mono">
                                                {Math.floor(log.duration / 1000 / 60)}m {Math.floor((log.duration / 1000) % 60)}s
                                            </td>
                                            <td className="p-4 capitalize text-xs">
                                                <span className={`px-2 py-1 rounded-full ${log.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                    log.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        log.status === 'interrupted' ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-slate-700 text-slate-300'
                                                    }`}>
                                                    {log.status}
                                                </span>
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
