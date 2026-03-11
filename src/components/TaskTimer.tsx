import { useEffect, useState } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useMemoStore } from '@/store/useMemoStore';
import { Play, Square, Pause, ArrowDown, Pencil, Check, X, FileText, ListTodo } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { STACK_CONFIG } from './TaskStack';

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

    const hasMemo = useMemoStore((state) => !!state.memos[currentTask?.id || '']);

    // Parse numeric height for layout adjustments
    const cardHeightNum = parseInt(STACK_CONFIG.CARD_HEIGHT) || 300;
    const isShort = cardHeightNum < 250;
    const isVeryShort = cardHeightNum < 180;

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
            <div 
                className={`flex flex-col items-center justify-center glass-panel mx-auto ${isShort ? 'p-4' : 'p-12'}`}
                style={{
                    width: STACK_CONFIG.CARD_WIDTH,
                    maxWidth: STACK_CONFIG.CARD_MAX_WIDTH,
                    height: STACK_CONFIG.CARD_HEIGHT
                }}
            >
                {!isVeryShort && <h2 className={`${isShort ? 'text-lg' : 'text-2xl'} text-slate-400 font-light`}>Ready to start?</h2>}
                <div className={`${isShort ? 'text-4xl my-4' : 'text-6xl my-8'} font-thin tracking-wider text-slate-600 font-mono`}>
                    00:00:00
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`flex flex-col items-center justify-center glass-panel mx-auto neon-border-blue relative overflow-hidden transition-all duration-300 ${isShort ? 'p-4' : 'p-12'}`}
            style={{
                width: STACK_CONFIG.CARD_WIDTH,
                maxWidth: STACK_CONFIG.CARD_MAX_WIDTH,
                height: STACK_CONFIG.CARD_HEIGHT
            }}
        >
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-blue-500/5 blur-[100px] -z-10" />

            {/* Stop/Pause Button - Top Left */}
            <button
                onClick={togglePause}
                className={`absolute ${isShort ? 'top-1 left-1 p-2' : 'top-4 left-4 p-3'} text-slate-500 hover:text-white transition-colors rounded-full hover:bg-slate-800/50 z-20`}
                title={currentTask.status === 'paused' ? "Resume" : "Pause"}
            >
                {currentTask.status === 'paused' ? <Play size={isShort ? 16 : 20} fill="currentColor" /> : <Pause size={isShort ? 16 : 20} fill="currentColor" />}
            </button>

            {/* Task Name & Edit */}
            {isEditing ? (
                <div className={`flex items-center gap-2 ${isShort ? 'mb-2' : 'mb-4'} w-full`}>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={`flex-1 bg-slate-900/50 border border-slate-600 rounded px-3 py-1 ${isShort ? 'text-lg' : 'text-xl'} text-center text-white focus:outline-none focus:border-blue-500`}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                        }}
                    />
                    <button onClick={saveEdit} className="text-green-400 hover:text-green-300 p-2">
                        <Check size={isShort ? 16 : 20} />
                    </button>
                    <button onClick={cancelEdit} className="text-red-400 hover:text-red-300 p-2">
                        <X size={isShort ? 16 : 20} />
                    </button>
                </div>
            ) : (
                <div className={`group flex flex-col items-center justify-center gap-3 ${isShort ? 'mb-2' : 'mb-4'} w-[calc(100%-40px)] mx-auto relative text-center ${isShort ? 'min-h-[3rem]' : 'min-h-[5rem]'}`}>
                    <Tooltip text={currentTask.name} className="w-full relative">
                        <h2 className={`${isShort ? 'text-xl' : 'text-3xl'} font-medium text-glow line-clamp-2 break-words px-4`}>
                            {currentTask.name}
                        </h2>
                    </Tooltip>

                    {/* Floating tools overlay */}
                    <div className={`${hasMemo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity absolute ${isShort ? '-top-6' : '-top-8'} right-0 flex items-center gap-2 bg-slate-800/90 border border-slate-700 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg`}>
                        <button
                            onClick={startEditing}
                            className={`${hasMemo ? 'opacity-0 group-hover:opacity-100' : ''} text-slate-400 hover:text-slate-200 transition-colors p-1`}
                            title="Edit Name"
                        >
                            <Pencil size={isShort ? 14 : 18} />
                        </button>
                        <button
                            onClick={() => useTaskStore.getState().openMemo(currentTask.id)}
                            className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                            title="Open Memo"
                        >
                            <FileText size={isShort ? 14 : 18} />
                        </button>
                    </div>
                </div>
            )}

            <div className={`font-thin tracking-wider ${isShort ? 'text-4xl my-2' : 'text-6xl my-8'} font-mono text-glow transition-colors ${currentTask.status === 'paused' ? 'text-yellow-500' : 'text-blue-400'}`}>
                {formatTime(elapsed)}
            </div>

            {!isVeryShort && (
                <div className={`flex ${isShort ? 'gap-3 mt-2' : 'gap-6 mt-4'}`}>
                    <button
                        onClick={completeTask}
                        className={`group flex flex-col items-center gap-2 text-slate-400 hover:text-green-400 transition-colors ${isShort ? 'w-16' : 'w-24'}`}
                        title="Complete Task"
                    >
                        <div className={`${isShort ? 'w-10 h-10' : 'w-14 h-14'} rounded-full glass flex items-center justify-center border border-green-500/50 group-hover:bg-green-500/10 group-hover:border-green-400 transition-all`}>
                            <Square size={isShort ? 18 : 24} fill="currentColor" />
                        </div>
                        <span className={`${isShort ? 'text-[10px]' : 'text-sm'}`}>完了</span>
                    </button>

                    <button
                        onClick={stopTask}
                        className={`group flex flex-col items-center gap-2 text-slate-400 hover:text-red-400 transition-colors ${isShort ? 'w-16' : 'w-24'}`}
                        title="Move to Backlog"
                    >
                        <div className={`${isShort ? 'w-10 h-10' : 'w-14 h-14'} rounded-full glass flex items-center justify-center border border-slate-600 group-hover:border-red-400 transition-all`}>
                            <ListTodo size={isShort ? 18 : 24} />
                        </div>
                        <span className={`${isShort ? 'text-[10px]' : 'text-sm'}`}>バックログ</span>
                    </button>

                    <button
                        onClick={sendCurrentToBack}
                        className={`group flex flex-col items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors ${isShort ? 'w-16' : 'w-24'}`}
                        title="Send to Back of Stack"
                    >
                        <div className={`${isShort ? 'w-10 h-10' : 'w-14 h-14'} rounded-full glass flex items-center justify-center border border-slate-600 group-hover:border-blue-400 transition-all`}>
                            <ArrowDown size={isShort ? 18 : 24} />
                        </div>
                        <span className={`${isShort ? 'text-[10px]' : 'text-sm'}`}>背面へ</span>
                    </button>
                </div>
            )}
        </div>
    );
}
