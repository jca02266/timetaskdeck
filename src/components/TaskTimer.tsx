"use client";

import { useEffect, useState } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { Play, Square, Pause } from 'lucide-react';
import { format } from 'date-fns';

export function TaskTimer() {
    const { currentTask, stopTask, completeTask, interruptTask } = useTaskStore();
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!currentTask || currentTask.status !== 'pending') {
            setElapsed(currentTask ? currentTask.duration : 0);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const currentDuration = now - currentTask.startTime;
            setElapsed(currentTask.duration + currentDuration);
        }, 100); // 100ms for responsiveness

        return () => clearInterval(interval);
    }, [currentTask]);

    // Format time helper
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!currentTask) {
        return (
            <div className="flex flex-col items-center justify-center p-12 glass-panel w-full max-w-lg mx-auto">
                <h2 className="text-2xl text-slate-400 font-light">Ready to start?</h2>
                <div className="text-6xl font-thin tracking-wider my-8 text-slate-600 font-mono">
                    00:00:00
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 glass-panel w-full max-w-lg mx-auto neon-border-blue relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-500/5 blur-[100px] -z-10" />

            <h2 className="text-3xl font-medium text-center mb-4 text-glow break-all">
                {currentTask.name}
            </h2>

            <div className="text-6xl font-thin tracking-wider my-8 text-blue-400 font-mono text-glow">
                {formatTime(elapsed)}
            </div>

            <div className="flex gap-6 mt-4">
                <button
                    onClick={completeTask}
                    className="group flex flex-col items-center gap-2 text-slate-400 hover:text-green-400 transition-colors w-24"
                    title="Complete Task"
                >
                    <div className="w-14 h-14 rounded-full glass flex items-center justify-center border border-green-500/50 group-hover:bg-green-500/10 group-hover:border-green-400 transition-all">
                        <Square size={24} fill="currentColor" />
                    </div>
                    <span className="text-sm">完了</span>
                </button>

                <button
                    onClick={stopTask}
                    className="group flex flex-col items-center gap-2 text-slate-400 hover:text-red-400 transition-colors w-24"
                    title="Move to Backlog"
                >
                    <div className="w-14 h-14 rounded-full glass flex items-center justify-center border border-slate-600 group-hover:border-red-400 transition-all">
                        <Pause size={24} fill="currentColor" />
                    </div>
                    <span className="text-sm">バックログ</span>
                </button>
            </div>
        </div>
    );
}
