import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatRelativeTime } from './formatRelativeTime';

const NOW = new Date('2026-09-28T12:00:00Z');

function ago(ms: number): Date {
    return new Date(NOW.getTime() - ms);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it.each([undefined, null, '', 'not a date'])('returns "Unknown" for %j', (input) => {
        expect(formatRelativeTime(input)).toBe('Unknown');
    });

    it.each([
        [30 * SECOND, 'Updated just now'],
        [5 * MINUTE, 'Updated 5m ago'],
        [59 * MINUTE, 'Updated 59m ago'],
        [3 * HOUR, 'Updated 3h ago'],
        [2 * DAY, 'Updated 2d ago'],
        [29 * DAY, 'Updated 29d ago'],
    ])('formats %i ms ago as "%s"', (elapsed, expected) => {
        expect(formatRelativeTime(ago(elapsed))).toBe(expected);
    });

    it('shows the date after 30 days', () => {
        const date = ago(45 * DAY);
        expect(formatRelativeTime(date)).toBe(`Updated ${date.toLocaleDateString()}`);
    });

    it('accepts ISO strings', () => {
        expect(formatRelativeTime(ago(2 * HOUR).toISOString())).toBe('Updated 2h ago');
    });
});
