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
    const actualLogs = getActualTaskLogs(taskId, startTime, endTime, logs, currentTask, now);

    return actualLogs.reduce((total, log) => {
        const overlapStart = Math.max(startTime, log.startTime);
        const overlapEnd = Math.min(endTime, log.endTime);
        return overlapEnd > overlapStart ? total + (overlapEnd - overlapStart) / 60000 : total;
    }, 0);
}

/**
 * Returns the actual task sessions shown by the timeline and used for timebox totals.
 * Keeping this in one place prevents the task label and the duration/result from diverging.
 */
export function getActualTaskLogs(
    taskId: string | undefined,
    startTime: number,
    endTime: number,
    logs: TaskLogEntry[],
    currentTask: Task | null,
    now: number,
): Array<Pick<TaskLogEntry, 'id' | 'taskId' | 'name' | 'startTime' | 'endTime'>> {
    if (!taskId) return [];

    const actualLogs = logs
        .filter((log) => log.taskId === taskId && log.endTime > log.startTime)
        .map(({ id, taskId: logTaskId, name, startTime: logStart, endTime: logEnd }) => ({
            id,
            taskId: logTaskId,
            name,
            startTime: logStart,
            endTime: logEnd,
        }));

    if (currentTask?.id === taskId && currentTask.status === 'pending' && currentTask.startTime > 0) {
        actualLogs.unshift({
            id: 'current-active-task',
            taskId,
            name: currentTask.name,
            startTime: currentTask.startTime,
            endTime: now,
        });
    }

    return actualLogs.filter((log) => log.endTime > startTime && log.startTime < endTime);
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
