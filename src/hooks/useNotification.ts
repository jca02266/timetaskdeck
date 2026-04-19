import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { addDays, startOfDay } from 'date-fns';

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
        const tomorrow = addDays(startOfDay(now), 1);
        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        const timeout = setTimeout(() => {
            notifiedTasksRef.current.clear();
        }, msUntilMidnight);

        return () => clearTimeout(timeout);
    }, []);

    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        typeof window !== 'undefined' ? Notification.permission : 'default'
    );

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) return 'unsupported';
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        return permission;
    }, []);

    const sendNotification = useCallback((taskId: string, title: string, body?: string) => {
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
    }, []);

    return useMemo(() => ({
        sendNotification,
        requestPermission,
        permission: permissionStatus
    }), [sendNotification, requestPermission, permissionStatus]);
}
