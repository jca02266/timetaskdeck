"use client";

import { FileText } from 'lucide-react';
import { useMemoStore } from '@/store/useMemoStore';
import { useTaskStore } from '@/store/useTaskStore';

interface TaskMemoProps {
    taskId: string;
    recurringTaskId?: string;
    iconSize?: number;
    className?: string;
}

export function useTaskMemoId(taskId?: string, recurringTaskId?: string): string | undefined {
    return useMemoStore((state) => {
        if (taskId && state.memos[taskId]?.trim()) return taskId;
        if (recurringTaskId && state.memos[recurringTaskId]?.trim()) return recurringTaskId;
        return undefined;
    });
}

export function TaskMemoButton({
    taskId,
    recurringTaskId,
    iconSize = 14,
    className = '',
}: TaskMemoProps) {
    const memoTaskId = useTaskMemoId(taskId, recurringTaskId);
    const hasMemo = Boolean(memoTaskId);

    return (
        <button
            onClick={(event) => {
                event.stopPropagation();
                useTaskStore.getState().openMemo(memoTaskId ?? taskId);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className={`p-1.5 rounded hover:bg-slate-700/50 transition-colors ${hasMemo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${className}`}
            title={hasMemo ? 'Open Memo (メモあり)' : 'Open Memo'}
            aria-label={hasMemo ? 'メモを開く（メモあり）' : 'メモを開く'}
            data-has-memo={hasMemo}
        >
            <FileText size={iconSize} color={hasMemo ? '#3b82f6' : '#94a3b8'} />
        </button>
    );
}

export function TaskMemoIndicator({
    taskId,
    recurringTaskId,
    iconSize = 18,
    className = '',
}: TaskMemoProps) {
    const memoTaskId = useTaskMemoId(taskId, recurringTaskId);
    if (!memoTaskId) return null;

    return <FileText size={iconSize} color="#3b82f6" className={className} aria-label="メモあり" />;
}
