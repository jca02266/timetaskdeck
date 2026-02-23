"use client";

import { useEffect, useState } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { Play, Square, Pause, ArrowDown, Pencil, Check, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip } from './Tooltip';

export function TaskTimer() {
    const {
        currentTask,
        taskStack,
        stopTask,
        completeTask,
        sendCurrentToBack,
        updateCurrentTaskName,
        togglePause,
        resumeFromStack
    } = useTaskStore();
    const [elapsed, setElapsed] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        if (!currentTask && taskStack.length > 0) {
            resumeFromStack();
        }
    }, [currentTask, taskStack.length, resumeFromStack]);

    useEffect(() => {
        if (!currentTask || currentTask.status !== 'pending') {
            setElapsed(currentTask ? currentTask.duration : 0);
            return;
        }

        // Set initial elapsed time
        setElapsed(currentTask.duration + (Date.now() - currentTask.startTime));

        const interval = setInterval(() => {
            const now = Date.now();
            const currentDuration = now - currentTask.startTime;
            setElapsed(currentTask.duration + currentDuration);
        }, 100);

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

    const startEditing = () => {
        if (currentTask) {
            setEditName(currentTask.name);
            setIsEditing(true);
        }
    };

    const saveEdit = () => {
        if (editName.trim()) {
            updateCurrentTaskName(editName.trim());
        }
        setIsEditing(false);
    };

    const cancelEdit = () => {
        setIsEditing(false);
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

            {/* Stop/Pause Button - Top Left */}
            <button
                onClick={togglePause}
                className="absolute top-4 left-4 text-slate-500 hover:text-white transition-colors p-3 rounded-full hover:bg-slate-800/50 z-20"
                title={currentTask.status === 'paused' ? "Resume" : "Pause"}
            >
                {currentTask.status === 'paused' ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
            </button>

            {/* Task Name & Edit */}
            {isEditing ? (
                <div className="flex items-center gap-2 mb-4 w-full">
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-xl text-center text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                        }}
                    />
                    <button onClick={saveEdit} className="text-green-400 hover:text-green-300 p-2">
                        <Check size={20} />
                    </button>
                    <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-2">
                        <X size={20} />
                    </button>
                </div>
            ) : (
                <div className="group flex flex-col items-center justify-center gap-3 mb-4 w-[calc(100%-40px)] mx-auto relative text-center min-h-[5rem]">
                    <Tooltip text={currentTask.name} className="w-full relative">
                        <h2 className="text-3xl font-medium text-glow line-clamp-2 break-words px-4">
                            {currentTask.name}
                        </h2>
                    </Tooltip>

                    {/* Floating tools overlay, positioned above the text on the right */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 flex items-center gap-2 bg-slate-800/90 border border-slate-700 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                        <button
                            onClick={startEditing}
                            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                            title="Edit Name"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            onClick={() => useTaskStore.getState().openMemo(currentTask.id)}
                            className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                            title="Open Memo"
                        >
                            <FileText size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className={`text-6xl font-thin tracking-wider my-8 font-mono text-glow transition-colors ${currentTask.status === 'paused' ? 'text-yellow-500' : 'text-blue-400'}`}>
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

                <button
                    onClick={sendCurrentToBack}
                    className="group flex flex-col items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors w-24"
                    title="Send to Back of Stack"
                >
                    <div className="w-14 h-14 rounded-full glass flex items-center justify-center border border-slate-600 group-hover:border-blue-400 transition-all">
                        <ArrowDown size={24} />
                    </div>
                    <span className="text-sm">背面へ</span>
                </button>
            </div>
        </div>
    );
}
