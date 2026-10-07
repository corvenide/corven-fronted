import { describe, expect, it } from 'vitest';

import { expiresIn, timeLeft } from './expiry';

describe('expiresIn', () => {
    const now = Date.parse('2026-10-07T12:00:00Z');

    it('formats hours, minutes and soon', () => {
        expect(expiresIn('2026-10-08T11:30:00Z', now)).toBe('in 23h');
        expect(expiresIn('2026-10-07T12:40:30Z', now)).toBe('in 40m');
        expect(expiresIn('2026-10-07T12:00:30Z', now)).toBe('soon');
        expect(expiresIn('2026-10-07T11:00:00Z', now)).toBe('soon');
    });

    it('returns null for kept workspaces', () => {
        expect(expiresIn(null, now)).toBeNull();
        expect(expiresIn(undefined, now)).toBeNull();
        expect(expiresIn('nope', now)).toBeNull();
    });

    it('labels the badge', () => {
        expect(timeLeft('2026-10-08T11:30:00Z', now)).toBe('23h left');
        expect(timeLeft('2026-10-07T12:00:30Z', now)).toBe('expiring');
        expect(timeLeft(null, now)).toBe('24h left');
    });
});
