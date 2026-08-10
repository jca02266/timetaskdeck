import { addMinutes, format, startOfDay } from 'date-fns';
import type { Task, TaskLogEntry } from '@/store/useTaskStore';

export const TIMEBOX_SLOT_MINUTES = 15;
export const TIMEBOX_TOTAL_MINUTES = 24 * 60;

export interface TimeboxSlot {
    startMinute: number;
    endMinute: number;
    startTime: number;
    endTime: number;
    label: string;
}

export function getLogicalDayStart(logicalDate: Date, dayStartHour: number): Date {
    const dayStart = startOfDay(logicalDate);
    dayStart.setHours(dayStartHour, 0, 0, 0);
    return dayStart;
}

export function getTimeboxSlots(logicalDate: Date, dayStartHour: number): TimeboxSlot[] {
    const dayStart = getLogicalDayStart(logicalDate, dayStartHour);
    return Array.from({ length: TIMEBOX_TOTAL_MINUTES / TIMEBOX_SLOT_MINUTES }, (_, index) => {
        const startMinute = index * TIMEBOX_SLOT_MINUTES;
        const startTime = addMinutes(dayStart, startMinute);
        return {
            startMinute,
            endMinute: startMinute + TIMEBOX_SLOT_MINUTES,
            startTime: startTime.getTime(),
            endTime: addMinutes(startTime, TIMEBOX_SLOT_MINUTES).getTime(),
            label: format(startTime, 'HH:mm'),
        };
    });
}

export function getActualMinutes(
    taskId: string | undefined,
    startTime: number,
    endTime: number,
    logs: TaskLogEntry[],
    currentTask: Task | null,
    now: number,
): number {
    if (!taskId) return 0;
    const actualLogs = logs
        .filter((log) => log.taskId === taskId && log.endTime > log.startTime)
        .map((log) => ({ start: log.startTime, end: log.endTime }));

    if (currentTask?.id === taskId && currentTask.status === 'pending' && currentTask.startTime > 0) {
        actualLogs.push({ start: currentTask.startTime, end: now });
    }

    return actualLogs.reduce((total, log) => {
        const overlapStart = Math.max(startTime, log.start);
        const overlapEnd = Math.min(endTime, log.end);
        return overlapEnd > overlapStart ? total + (overlapEnd - overlapStart) / 60000 : total;
    }, 0);
}

export type TimeboxResult = 'empty' | 'planned' | 'in-progress' | 'partial' | 'completed' | 'overrun' | 'missed';

export function getTimeboxResult(
    taskId: string | undefined,
    actualMinutes: number,
    plannedMinutes: number,
    endTime: number,
    history: Task[],
    currentTask: Task | null,
    now: number,
): TimeboxResult {
    if (!taskId) return 'empty';
    if (currentTask?.id === taskId && currentTask.status === 'pending') return 'in-progress';
    if (history.some((task) => task.id === taskId)) return actualMinutes > plannedMinutes ? 'overrun' : 'completed';
    if (actualMinutes > plannedMinutes) return 'overrun';
    if (actualMinutes > 0) return 'partial';
    return endTime < now ? 'missed' : 'planned';
}
