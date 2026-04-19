"use client";

import { useEffect, useRef } from 'react';
import { useTaskStore, Task } from '@/store/useTaskStore';
import { useNotification } from '@/hooks/useNotification';

function checkAndAutoStart(
    tasks: Task[],
    targetTimeStr: string,
    targetDateStr: string,
    targetDayNum: number,
    sendNotification: (id: string, title: string, body?: string) => void
) {
    const state = useTaskStore.getState();

    tasks.forEach(task => {
        if (task.status === 'completed' || !task.scheduledTime) return;

        const normalize = (t: string) => t.includes(':')
            ? t.split(':').map(p => p.padStart(2, '0')).join(':')
            : t.length === 4
                ? `${t.slice(0, 2)}:${t.slice(2)}`
                : t;

        const taskTime = normalize(task.scheduledTime);
        if (taskTime !== targetTimeStr) return;

        const isMatchingDate = !task.scheduledDate || task.scheduledDate === targetDateStr;
        const isMatchingDay = !task.scheduledDaysOfWeek ||
            task.scheduledDaysOfWeek.length === 0 ||
            task.scheduledDaysOfWeek.includes(targetDayNum);

        if (!isMatchingDate || !isMatchingDay) return;

        sendNotification(task.id, 'Task Schedule', task.name);

        const autoStart = task.autoStart ?? true;
        if (!autoStart) return;

        // Re-read fresh state before each move to avoid stale captures
        const fresh = useTaskStore.getState();
        if (fresh.backlogTasks.some(t => t.id === task.id)) {
            fresh.pickFromBacklog(task.id);
        } else if (fresh.recurringTasks.some(t => t.id === task.id)) {
            fresh.startRecurringTask(task.id);
        } else if (fresh.taskStack.some(t => t.id === task.id)) {
            fresh.moveTaskToLocation(task.id, 'current');
        }
    });
}

export function NotificationManager() {
    const updateCurrentTime = useTaskStore(state => state.updateCurrentTime);
    const missedTaskWindowMinutes = useTaskStore(state => state.missedTaskWindowMinutes);
    const { sendNotification } = useNotification();
    const lastCheckMinute = useRef<string>('');
    const hasSettled = useRef(false);

    useEffect(() => {
        if (!hasSettled.current) {
            hasSettled.current = true;
            useTaskStore.getState().settleStaleTasks();
        }
    }, []);

    // 過去N分以内のスケジュールタスクをまとめてチェック
    const checkMissedTasks = (windowMinutes: number) => {
        const now = new Date();
        const state = useTaskStore.getState();
        const allTasks = [...state.backlogTasks, ...state.recurringTasks, ...state.taskStack];
        if (state.currentTask) allTasks.push(state.currentTask);

        for (let i = windowMinutes; i >= 1; i--) {
            const t = new Date(now.getTime() - i * 60 * 1000);
            const timeStr = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
            const dateStr = `${t.getFullYear()}-${(t.getMonth() + 1).toString().padStart(2, '0')}-${t.getDate().toString().padStart(2, '0')}`;
            const dayNum = t.getDay();
            checkAndAutoStart(allTasks, timeStr, dateStr, dayNum, sendNotification);
        }
    };

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            const dayNum = now.getDay();

            updateCurrentTime(timeStr, dateStr, dayNum);

            if (lastCheckMinute.current !== timeStr) {
                lastCheckMinute.current = timeStr;

                const state = useTaskStore.getState();
                const allTasks = [...state.backlogTasks, ...state.recurringTasks, ...state.taskStack];
                if (state.currentTask) allTasks.push(state.currentTask);

                checkAndAutoStart(allTasks, timeStr, dateStr, dayNum, sendNotification);
            }
        };

        // 起動時に過去N分のチェック（アプリを予定時刻後に開いた場合に対応）
        checkMissedTasks(missedTaskWindowMinutes);

        const interval = setInterval(updateTimer, 1000);
        updateTimer();

        // タブが前面に戻ったとき（バックグラウンド抑制で見逃した分をリカバリ）
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkMissedTasks(missedTaskWindowMinutes);
                // 現在分も即時チェック（lastCheckMinuteをリセットして強制再チェック）
                lastCheckMinute.current = '';
                updateTimer();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [sendNotification, updateCurrentTime, missedTaskWindowMinutes]);

    return null;
}
