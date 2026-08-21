"use client";

import { useTaskStore } from '@/store/useTaskStore';
import { Layers } from 'lucide-react';
import { useState } from 'react';
import { TaskMemoIndicator } from './TaskMemoButton';

// TaskStack.tsx
interface TaskStackProps {
    isExpanded: boolean;
    onToggle: (expanded: boolean) => void;
}

export const STACK_CONFIG = {
    // ------------------------------------------------------------------
    // ユーザー設定: ここでスタックの見た目を調整してください
    // ------------------------------------------------------------------
    OFFSET_BASE: -10,   // スタック全体の上下位置（負の値で上へ移動）
    OFFSET_STEP: 16,    // カード同士の重なり間隔（px）- 前面のカードよりも上に飛び出す量
    SCALE_STEP: 0.05,   // 奥に行くごとの縮小率（5 %ずつ小さく）
    SCALE_X_STEP: 0.08, // 横方向の縮小率（8 %ずつ小さく）
    VISIBLE_COUNT: 8,   // 表示する最大枚数
    CARD_WIDTH: '100%',  // カードの横幅
    CARD_MAX_WIDTH: '400px', // カードの最大横幅
    CARD_HEIGHT: '380px', // カードの高さ
    // ------------------------------------------------------------------
};

export function TaskStack({ isExpanded, onToggle }: TaskStackProps) {
    const { currentTask, taskStack, switchTask } = useTaskStore();
    // Combine currentTask and stack for the view
    // To make sure currentTask is on TOP of the 3D stack, it must be the LAST element mapped
    // (since absolute positioned elements later in the DOM are on top by default)
    const allTasks = currentTask ? [...taskStack, currentTask] : taskStack;

    if (allTasks.length === 0) return null;

    return (
        <div
            // Use justify-end to align bottom with Timer, p-8 matches page padding
            className={`absolute inset-0 -z-10 flex flex-col items-center transition-all duration-500 ${isExpanded ? 'z-[150] bg-slate-950/95 backdrop-blur-md overflow-y-auto pt-20 pb-10 justify-start' : 'justify-end pb-8 overflow-hidden'}`}
            style={{}}
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

            {allTasks.map((task, index) => {
                const isCurrent = task.id === currentTask?.id;
                const reverseIndex = allTasks.length - 1 - index;

                // Limit visible items in collapsed mode, show all in expanded
                if (!isExpanded && reverseIndex >= STACK_CONFIG.VISIBLE_COUNT) return null;

                // Hide current task card in TaskStack when collapsed since TaskTimer is on top
                if (!isExpanded && isCurrent) return null;

                // 2D Transform Logic (Collapsed) — translateZ を排除してブラウザ差をなくす
                const yOffset = STACK_CONFIG.OFFSET_BASE - (reverseIndex * STACK_CONFIG.OFFSET_STEP);

                const scale = 1 - (reverseIndex * STACK_CONFIG.SCALE_STEP);
                const scaleX = 1 - (reverseIndex * STACK_CONFIG.SCALE_X_STEP);
                const opacity = Math.max(0.4, 1 - (reverseIndex * 0.08));

                const expandedScale = 1;

                return (
                    <div
                        key={task.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isExpanded) {
                                if (!isCurrent) {
                                    switchTask(task.id);
                                }
                                onToggle(false);
                            } else {
                                onToggle(true);
                            }
                        }}
                        className={`absolute glass-panel flex flex-col items-center cursor-pointer transition-all duration-500 ease-out border-slate-600/50 hover:border-blue-400 bg-slate-900 shadow-2xl ${isExpanded ? 'justify-center pointer-events-auto' : 'justify-start pt-1 pointer-events-none'} ${isCurrent ? 'ring-2 ring-blue-500/50 ring-offset-4 ring-offset-slate-950 border-blue-500/50' : ''}`}
                        style={{
                            width: STACK_CONFIG.CARD_WIDTH,
                            maxWidth: STACK_CONFIG.CARD_MAX_WIDTH,
                            height: STACK_CONFIG.CARD_HEIGHT,
                            transform: isExpanded
                                ? `translateY(0) scale(${expandedScale}) translateZ(0)`
                                : `translateY(${yOffset}px) scale(${scaleX}, ${scale})`,
                            opacity: isExpanded ? 1 : opacity,
                            zIndex: isExpanded ? 100 : (10 - reverseIndex), // Ensure positive zIndex so they are above background
                            position: isExpanded ? 'relative' : 'absolute',
                            marginTop: isExpanded ? '1.5rem' : '0',
                        }}
                    >
                        <div className={`absolute top-4 right-4 transition-opacity duration-300 ${(!isExpanded && !isCurrent) ? 'opacity-0' : 'opacity-100'}`}>
                            <TaskMemoIndicator taskId={task.id} recurringTaskId={task.recurringTaskId} />
                        </div>
                        <div className={`text-lg font-bold text-slate-200 truncate max-w-[90%] px-4 w-full text-center tracking-wider transition-opacity duration-300 ${(!isExpanded && !isCurrent) ? 'opacity-0' : 'opacity-100'}`}>
                            {isCurrent && <span className="text-blue-400 text-[10px] block mb-1 uppercase tracking-widest animate-pulse font-black">Executing</span>}
                            {task.name}
                        </div>
                    </div>
                );
            })}

            {/* Instruction Hint */}
            {!isExpanded && allTasks.length > 0 && (
                <div className="absolute top-[-80px] text-xs text-slate-500 opacity-0 hover:opacity-100 transition-opacity">
                    Click stack to expand
                </div>
            )}
        </div>
    );
}
