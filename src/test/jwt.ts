// Unsigned JWT with the given claims. The frontend only reads `exp`, so the
// signature doesn't matter in tests.
export function fakeJwt(claims: Record<string, unknown>): string {
    const encode = (value: object) =>
        btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.signature`;
}

/** A token that expires `seconds` from now. */
export function jwtExpiringIn(seconds: number): string {
    return fakeJwt({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + seconds });
}
