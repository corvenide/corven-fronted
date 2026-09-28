import { afterEach, describe, expect, it, vi } from 'vitest';

import { fakeJwt } from '../test/jwt';
import { tokenExpiry, tokenStorage } from './token-storage';

describe('tokenStorage', () => {
    afterEach(() => {
        tokenStorage.remove();
    });

    it('keeps the token in memory, not in localStorage', () => {
        tokenStorage.set('abc');

        expect(tokenStorage.get()).toBe('abc');
        expect(Object.values({ ...localStorage })).not.toContain('abc');
    });

    it('notifies subscribers on set and remove', () => {
        const listener = vi.fn();
        const unsubscribe = tokenStorage.subscribe(listener);

        tokenStorage.set('abc');
        tokenStorage.remove();
        unsubscribe();
        tokenStorage.set('def');

        expect(listener.mock.calls).toEqual([['abc'], [null]]);
    });
});

describe('tokenExpiry', () => {
    it('reads exp from a JWT', () => {
        expect(tokenExpiry(fakeJwt({ exp: 1_790_000_000 }))).toBe(1_790_000_000);
    });

    it('returns null without an exp claim', () => {
        expect(tokenExpiry(fakeJwt({ sub: 'user-1' }))).toBeNull();
    });

    it.each(['', 'not-a-jwt', 'a.!!!.c'])('returns null for malformed token %j', (token) => {
        expect(tokenExpiry(token)).toBeNull();
    });
});
