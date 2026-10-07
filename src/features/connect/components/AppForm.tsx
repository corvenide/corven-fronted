// Fields shared by "New app" and the Settings tab.

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { LOGIN_METHODS, METHOD_LABEL, type LoginMethod } from '../connect.api';
import { inputClass, labelClass } from './ui';

const METHOD_HINT: Record<LoginMethod, string> = {
    PHONE: 'SMS, WhatsApp or call code',
    EMAIL: 'Code by email',
    GOOGLE: 'Needs a Google client id',
    PASSKEY: 'Face ID, fingerprint, security key',
    WALLET: 'JoyID, MetaMask, UniSat… (needs @ckb-ccc/ccc)',
};

export function OriginsEditor({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
    const [draft, setDraft] = useState('');
    const add = () => {
        const v = draft.trim().replace(/\/+$/, '');
        if (!v || value.includes(v)) return setDraft('');
        onChange([...value, v]);
        setDraft('');
    };
    return (
        <div>
            <div className="flex flex-wrap gap-1.5">
                {value.map((origin) => (
                    <span key={origin} className="inline-flex items-center gap-1 rounded-md border border-outline-variant/40 bg-surface-container-high py-1 pl-2 pr-1 font-mono text-[12px] text-on-surface">
                        {origin}
                        {!disabled && (
                            <button type="button" aria-label={`Remove ${origin}`} className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface" onClick={() => onChange(value.filter((o) => o !== origin))}>
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </span>
                ))}
                {value.length === 0 && <span className="text-[12px] text-on-surface-variant">No origins yet.</span>}
            </div>
            {!disabled && (
                <div className="mt-2 flex gap-2">
                    <input
                        aria-label="Add origin"
                        className={`${inputClass} font-mono`}
                        placeholder="https://myapp.xyz"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                add();
                            }
                        }}
                    />
                    <button type="button" onClick={add} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 text-[12.5px] text-on-surface hover:bg-surface-container-highest">
                        <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                </div>
            )}
            <p className="mt-1.5 text-[11.5px] text-on-surface-variant">Pages allowed to use this app: scheme + host (+ port). http only for localhost.</p>
        </div>
    );
}

export function MethodsEditor({ value, onChange, disabled }: { value: LoginMethod[]; onChange: (v: LoginMethod[]) => void; disabled?: boolean }) {
    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {LOGIN_METHODS.map((m) => {
                const on = value.includes(m);
                return (
                    <label
                        key={m}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${on ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/30 bg-surface-container-low'} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                        <input
                            type="checkbox"
                            className="mt-0.5 accent-[var(--color-primary)]"
                            checked={on}
                            disabled={disabled}
                            onChange={(e) => onChange(e.target.checked ? LOGIN_METHODS.filter((x) => x === m || value.includes(x)) : value.filter((x) => x !== m))}
                        />
                        <span>
                            <span className="block text-[13px] font-medium text-on-surface">{METHOD_LABEL[m]}</span>
                            <span className="text-[11.5px] text-on-surface-variant">{METHOD_HINT[m]}</span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
    return (
        <label htmlFor={htmlFor} className={`${labelClass} mb-1.5`}>
            {children}
        </label>
    );
}
