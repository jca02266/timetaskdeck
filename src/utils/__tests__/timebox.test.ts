import { describe, expect, it } from 'vitest';
import { parseISO } from 'date-fns';
import {
    getActualMinutes,
    getLogicalDayStart,
    getTimeboxResult,
    getTimeboxSlots,
} from '@/utils/timebox';

describe('timebox utilities', () => {
    it('creates 96 slots from the configured logical day start', () => {
        const slots = getTimeboxSlots(parseISO('2026-08-10'), 5);

        expect(slots).toHaveLength(96);
        expect(slots[0].label).toBe('05:00');
        expect(slots[0].startTime).toBe(getLogicalDayStart(parseISO('2026-08-10'), 5).getTime());
        expect(slots[95].label).toBe('04:45');
    });

    it('counts only the overlap between a planned box and activity logs', () => {
        const start = parseISO('2026-08-10T09:00:00').getTime();
        const end = parseISO('2026-08-10T10:00:00').getTime();
        const actual = getActualMinutes('task-1', start, end, [{
            id: 'log-1',
            taskId: 'task-1',
            name: 'Task',
            startTime: parseISO('2026-08-10T09:15:00').getTime(),
            endTime: parseISO('2026-08-10T09:45:00').getTime(),
            duration: 30 * 60 * 1000,
            status: 'completed',
        }], null, end);

        expect(actual).toBe(30);
    });

    it('marks a completed task and a missed task correctly', () => {
        const end = parseISO('2026-08-10T10:00:00').getTime();
        const history = [{
            id: 'task-1',
            name: 'Task',
            startTime: 1,
            endTime: end,
            duration: 60 * 60 * 1000,
            status: 'completed' as const,
        }];

        expect(getTimeboxResult('task-1', 60, 60, end, history, null, end)).toBe('completed');
        expect(getTimeboxResult('task-2', 0, 15, end, history, null, end + 1)).toBe('missed');
    });
});
