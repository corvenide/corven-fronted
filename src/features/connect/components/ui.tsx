// Small building blocks for the Connect dashboard, in the IDE's style.

import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';

import { ApiError } from '../../../lib/api-client';
import { ROLE_LABEL, type AppRole } from '../connect.api';

export const inputClass =
    'w-full rounded-lg border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none';
export const labelClass = 'block text-[11px] font-mono uppercase tracking-wide text-on-surface-variant';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`rounded-xl border border-outline-variant/30 bg-surface-container p-5 ${className}`}>{children}</div>;
}

export function Button({
    children,
    variant = 'secondary',
    busy,
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; busy?: boolean }) {
    const styles = {
        primary: 'bg-primary text-on-primary hover:brightness-110 disabled:bg-surface-container-high disabled:text-on-surface-variant',
        secondary: 'border border-outline-variant/50 bg-surface-container-high text-on-surface hover:bg-surface-container-highest disabled:opacity-50',
        danger: 'border border-error/40 bg-error/10 text-error hover:bg-error/20 disabled:opacity-50',
        ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-50',
    }[variant];
    return (
        <button
            type="button"
            {...props}
            disabled={props.disabled || busy}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
        >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {children}
        </button>
    );
}

export function CopyText({ value, display, className = '' }: { value: string; display?: string; className?: string }) {
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(t);
    }, [copied]);
    return (
        <button
            type="button"
            title={copied ? 'Copied' : 'Copy'}
            onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard?.writeText(value).then(() => setCopied(true), () => undefined);
            }}
            className={`inline-flex min-w-0 items-center gap-1.5 rounded-md bg-surface-container-high px-2 py-1 font-mono text-[11.5px] text-on-surface hover:bg-surface-container-highest ${className}`}
        >
            <span className="truncate">{display ?? value}</span>
            {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />}
        </button>
    );
}

export function RoleBadge({ role }: { role: AppRole }) {
    const style = role === 'OWNER' ? 'bg-primary/10 text-primary border-primary/30' : role === 'ADMIN' ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/40';
    return <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${style}`}>{ROLE_LABEL[role]}</span>;
}

export function AppLogo({ name, logoUrl, size = 40 }: { name: string; logoUrl?: string | null; size?: number }) {
    const [broken, setBroken] = useState(false);
    if (logoUrl && !broken) {
        return <img src={logoUrl} alt="" width={size} height={size} onError={() => setBroken(true)} className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
    }
    return (
        <div className="flex shrink-0 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-high font-semibold text-primary" style={{ width: size, height: size, fontSize: size * 0.42 }}>
            {name.slice(0, 1).toUpperCase()}
        </div>
    );
}

export function ErrorNote({ error }: { error: unknown }) {
    if (!error) return null;
    const message = error instanceof ApiError || error instanceof Error ? error.message : String(error);
    return <div role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">{message}</div>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" /> {label}
        </div>
    );
}

export function timeAgo(iso: string | null): string {
    if (!iso) return 'never';
    const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
    return new Date(iso).toLocaleDateString();
}

export function shortAddress(address: string, head = 10, tail = 6): string {
    return address.length > head + tail + 1 ? `${address.slice(0, head)}…${address.slice(-tail)}` : address;
}

export function formatCkb(shannons: string): string {
    const v = BigInt(shannons);
    const whole = v / 100_000_000n;
    const frac = (v % 100_000_000n).toString().padStart(8, '0').slice(0, 2);
    return `${whole.toLocaleString('en-US')}.${frac}`;
}

export const EXPLORER = { TESTNET: 'https://testnet.explorer.nervos.org', MAINNET: 'https://explorer.nervos.org' } as const;
