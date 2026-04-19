"use client";

import { useEffect, useRef } from 'react';
import { useTaskStore, Task } from '@/store/useTaskStore';
import { useNotification } from '@/hooks/useNotification';

export function NotificationManager() {
    const updateCurrentTime = useTaskStore(state => state.updateCurrentTime);
    const { sendNotification } = useNotification();
    const lastCheckMinute = useRef<string>('');
    const hasSettled = useRef(false);

    // On mount, settle any stale tasks from previous days
    useEffect(() => {
        if (!hasSettled.current) {
            hasSettled.current = true;
            useTaskStore.getState().settleStaleTasks();
        }
    }, []);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
            const dayNum = now.getDay();

            updateCurrentTime(timeStr, dateStr, dayNum);

            // Check for notifications
            if (lastCheckMinute.current !== timeStr) {
                lastCheckMinute.current = timeStr;

                // Get the latest state without triggering re-renders of this component
                const state = useTaskStore.getState();
                const allTasksToCheck = [...state.backlogTasks, ...state.recurringTasks, ...state.taskStack];
                if (state.currentTask) allTasksToCheck.push(state.currentTask);

                allTasksToCheck.forEach(task => {
                    if (task.status === 'completed' || !task.scheduledTime) return;

                    // Normalize comparison
                    const normalize = (t: string) => t.includes(':')
                        ? t.split(':').map(p => p.padStart(2, '0')).join(':')
                        : t.length === 4
                            ? `${t.slice(0, 2)}:${t.slice(2)}`
                            : t;

                    const taskTime = normalize(task.scheduledTime);
                    if (taskTime === timeStr) {
                        const isMatchingDate = !task.scheduledDate || task.scheduledDate === dateStr;
                        const isMatchingDay = !task.scheduledDaysOfWeek ||
                            task.scheduledDaysOfWeek.length === 0 ||
                            task.scheduledDaysOfWeek.includes(dayNum);

                        if (isMatchingDate && isMatchingDay) {
                            sendNotification(task.id, 'Task Schedule', task.name);

                            // Auto-start logic
                            const autoStart = task.autoStart ?? true; // Default to true
                            if (autoStart) {
                                // Find where it is and move to current
                                if (state.backlogTasks.some(t => t.id === task.id)) {
                                    state.pickFromBacklog(task.id);
                                } else if (state.recurringTasks.some(t => t.id === task.id)) {
                                    state.startRecurringTask(task.id);
                                } else if (state.taskStack.some(t => t.id === task.id)) {
                                    state.moveTaskToLocation(task.id, 'current');
                                }
                            }
                        }
                    }
                });
            }
        };

        const interval = setInterval(updateTimer, 1000); // UI resolution 1s
        updateTimer();

        return () => clearInterval(interval);
    }, [sendNotification, updateCurrentTime]);

    return null; // Headless component
}
