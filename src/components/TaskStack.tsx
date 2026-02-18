"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { Layers } from 'lucide-react';

export function TaskStack() {
    const { taskStack, switchTask } = useTaskStore();

    if (taskStack.length === 0) return null;

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-64 -z-10 pointer-events-none">
            {taskStack.map((task, index) => {
                // Calculate reverse index (last item is top of stack)
                const reverseIndex = taskStack.length - 1 - index;
                const yOffset = (reverseIndex + 1) * 35; // Vertical spread
                const xOffset = (reverseIndex + 1) * 15; // Horizontal spread
                const scale = 1 - ((reverseIndex + 1) * 0.05);

                return (
                    <div
                        key={task.id}
                        onClick={() => switchTask(task.id)}
                        className="absolute top-0 left-0 w-full h-full glass-panel flex flex-col items-center justify-start pt-3 cursor-pointer hover:border-blue-400 transition-all duration-300 pointer-events-auto"
                        style={{
                            transform: `translate(${xOffset}px, -${yOffset}px) scale(${scale})`,
                            zIndex: -1 - reverseIndex,
                            opacity: 0.8
                        }}
                    >
                        <div className="text-sm font-bold text-slate-200 truncate max-w-[90%] mb-1 px-4 w-full text-center">
                            {task.name}
                        </div>
                        <div className="text-slate-500 text-xs uppercase tracking-wider">
                            Paused
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
