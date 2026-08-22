import { describe, expect, it } from 'vitest';
import { formatTimeboxDropSchedule, getTimeboxDropStartMinute } from '../timeboxDrag';

describe('timebox drag positioning', () => {
    it('snaps the pointer position down to a 15 minute slot', () => {
        expect(getTimeboxDropStartMinute(159, 100, 24, 30)).toBe(30);
    });

    it('keeps the complete task duration inside the logical day', () => {
        expect(getTimeboxDropStartMinute(5000, 0, 24, 30)).toBe(1410);
        expect(getTimeboxDropStartMinute(5000, 0, 24, 90)).toBe(1350);
    });

    it('converts a logical-day offset into a clock time', () => {
        expect(formatTimeboxDropSchedule(0, 5)).toBe('05:00');
        expect(formatTimeboxDropSchedule(1140, 5)).toBe('00:00');
    });
});
