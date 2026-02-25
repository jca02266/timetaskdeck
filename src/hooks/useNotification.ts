import { useEffect, useRef } from 'react';

export function useNotification() {
    // Keep track of tasks we've already notified about today to avoid spamming
    const notifiedTasksRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Request permission on mount if needed
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Reset notified tasks at midnight
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        const timeout = setTimeout(() => {
            notifiedTasksRef.current.clear();
        }, msUntilMidnight);

        return () => clearTimeout(timeout);
    }, []);

    const sendNotification = (taskId: string, title: string, body?: string) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        // Create a unique key for the notification to avoid duplicates in the same minute
        const now = new Date();
        const timeKey = `${now.getHours()}:${now.getMinutes()}`;
        const notificationKey = `${taskId}-${timeKey}`;

        if (!notifiedTasksRef.current.has(notificationKey)) {
            new Notification(title, {
                body,
                icon: '/icon.png' // Fallback if no specific icon
            });
            notifiedTasksRef.current.add(notificationKey);
        }
    };

    return { sendNotification };
}
