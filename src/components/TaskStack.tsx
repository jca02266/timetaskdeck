"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { Layers } from 'lucide-react';
import { useState } from 'react';

// TaskStack.tsx
interface TaskStackProps {
    isExpanded: boolean;
    onToggle: (expanded: boolean) => void;
}

const STACK_CONFIG = {
    // ------------------------------------------------------------------
    // ユーザー設定: ここでスタックの見た目を調整してください
    // ------------------------------------------------------------------
    OFFSET_BASE: -70,   // スタック全体の上下位置（負の値で上へ移動）
    OFFSET_STEP: 15,    // カード同士の重なり間隔（px）
    SCALE_STEP: 0.05,   // 奥に行くごとの縮小率（5%ずつ小さく）
    VISIBLE_COUNT: 8,   // 表示する最大枚数
    // ------------------------------------------------------------------
};

export function TaskStack({ isExpanded, onToggle }: TaskStackProps) {
    const { taskStack, switchTask } = useTaskStore();

    if (taskStack.length === 0) return null;

    return (
        <div
            // Use justify-end to align bottom with Timer, p-8 matches page padding
            className={`absolute inset-0 -z-10 flex flex-col items-center transition-all duration-500 ${isExpanded ? 'z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto pt-20 pb-10 justify-start' : 'justify-end pb-8 overflow-hidden'}`}
            style={{ perspective: '1000px' }}
            onClick={() => !isExpanded && onToggle(true)}
        >
            {/* Close Overlay when expanded */}
            {isExpanded && (
                <div
                    className="absolute inset-0 z-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(false);
                    }}
                />
            )}

            {taskStack.map((task, index) => {
                const reverseIndex = taskStack.length - 1 - index;

                // Limit visible items in collapsed mode, show all in expanded
                if (!isExpanded && reverseIndex >= STACK_CONFIG.VISIBLE_COUNT) return null;

                // 3D Transform Logic (Collapsed)
                // Recede into background (translateZ) and move up slightly (translateY)
                const zOffset = -reverseIndex * 50;

                // Align to bottom, then shift UP based on config
                // Base shift moves the entire stack
                // Step shift spaces them out
                const yOffset = STACK_CONFIG.OFFSET_BASE - (reverseIndex * STACK_CONFIG.OFFSET_STEP);

                const scale = 1 - (reverseIndex * STACK_CONFIG.SCALE_STEP);
                const opacity = Math.max(0.4, 1 - (reverseIndex * 0.08));

                // Grid Logic (Expanded)
                // Simple vertical list for scrolling
                // Position relative to the top of the container
                const expandedY = index * 100 + 80; // Start with offset, spacing 100px
                const expandedScale = 1;
                const expandedOpacity = 1;

                return (
                    <div
                        key={task.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isExpanded) {
                                switchTask(task.id);
                                onToggle(false);
                            } else {
                                onToggle(true);
                            }
                        }}
                        className={`absolute w-[80%] max-w-sm h-[300px] glass-panel flex flex-col items-center cursor-pointer transition-all duration-500 ease-out border-slate-600/50 hover:border-blue-400 bg-slate-900 shadow-2xl ${isExpanded ? 'justify-center pointer-events-auto' : 'justify-start pt-1 pointer-events-none'}`}
                        style={{
                            transform: isExpanded
                                ? `translateY(0) scale(${expandedScale}) translateZ(0)` // Remove transform positioning in expanded
                                : `translateY(${yOffset}px) translateZ(${zOffset}px)`,
                            opacity: isExpanded ? expandedOpacity : opacity,
                            zIndex: isExpanded ? 100 : -1 - reverseIndex,
                            position: isExpanded ? 'relative' : 'absolute', // Use relative for scroll flow in expanded
                            marginTop: isExpanded ? '1rem' : '0',
                        }}
                    >
                        <div className={`text-lg font-bold text-slate-200 truncate max-w-[90%] px-4 w-full text-center tracking-wider transition-opacity duration-300 ${(!isExpanded && reverseIndex > 0) ? 'opacity-0' : 'opacity-100'}`}>
                            {task.name}
                        </div>

                    </div>
                );
            })}

            {/* Instruction Hint */}
            {!isExpanded && taskStack.length > 0 && (
                <div className="absolute top-[-80px] text-xs text-slate-500 opacity-0 hover:opacity-100 transition-opacity">
                    Click stack to expand
                </div>
            )}
        </div>
    );
}
