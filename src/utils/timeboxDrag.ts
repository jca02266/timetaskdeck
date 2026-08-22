import { TIMEBOX_SLOT_MINUTES, TIMEBOX_TOTAL_MINUTES } from './timebox';

export function getTimeboxDropStartMinute(
    clientY: number,
    timelineTop: number,
    slotHeight: number,
    durationMinutes: number,
): number {
    const normalizedDuration = Math.max(
        TIMEBOX_SLOT_MINUTES,
        Math.round(durationMinutes / TIMEBOX_SLOT_MINUTES) * TIMEBOX_SLOT_MINUTES,
    );
    const slotIndex = Math.floor(Math.max(0, clientY - timelineTop) / slotHeight);
    const requestedStart = slotIndex * TIMEBOX_SLOT_MINUTES;
    return Math.max(0, Math.min(TIMEBOX_TOTAL_MINUTES - normalizedDuration, requestedStart));
}

export function formatTimeboxDropSchedule(startMinute: number, dayStartHour: number): string {
    const clockMinute = (dayStartHour * 60 + startMinute) % TIMEBOX_TOTAL_MINUTES;
    const hours = Math.floor(clockMinute / 60);
    const minutes = clockMinute % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
