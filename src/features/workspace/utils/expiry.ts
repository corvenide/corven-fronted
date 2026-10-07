// src/features/workspace/utils/expiry.ts

/** "in 23h", "in 40m", "soon" — how long until a temporary workspace is deleted. */
export function expiresIn(expiresAt: string | null | undefined, now = Date.now()): string | null {
    if (!expiresAt) return null;
    const ms = new Date(expiresAt).getTime() - now;
    if (Number.isNaN(ms)) return null;
    if (ms <= 60_000) return 'soon';
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 60) return `in ${minutes}m`;
    return `in ${Math.floor(minutes / 60)}h`;
}

/** "23h left", "40m left", "expiring" — for the temporary badge. */
export function timeLeft(expiresAt: string | null | undefined, now = Date.now()): string {
    const label = expiresIn(expiresAt, now);
    if (!label) return '24h left';
    return label === 'soon' ? 'expiring' : `${label.replace(/^in /, '')} left`;
}
