// src/pages/SettingsPage.tsx
import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Check,
    Copy,
    Loader2,
    User,
    Sliders,
    Globe,
    Bot,
    Key,
    Shield,
    Terminal,
    Trash2,
    RefreshCw,
    Code2,
    FileCode,
    Sparkles,
    AlertTriangle,
    ShieldCheck,
    Zap,
    Cpu,
} from 'lucide-react';

import { Avatar, displayName } from '../components/layout/UserMenu';
import { aiApi } from '../features/ai/api/ai.api';
import { useAuth } from '../features/auth/hooks/useAuth';
import { ConfirmDialog } from '../features/dashboard/components/ConfirmDialog';
import { CorvenWalletCard } from '../features/wallet/CorvenWalletCard';

const MODEL_KEY = 'corven.ai.model';
const CHAT_PREFIX = 'corven.ai.chat.';
const PREF_THEME_KEY = 'corven.editor.theme';
const PREF_FONT_KEY = 'corven.editor.font';
const PREF_FONT_SIZE_KEY = 'corven.editor.fontSize';
const PREF_TAB_SIZE_KEY = 'corven.editor.tabSize';
const PREF_WORD_WRAP_KEY = 'corven.editor.wordWrap';
const PREF_AUTO_SAVE_KEY = 'corven.editor.autoSave';
const PREF_DEVNET_RPC_KEY = 'corven.devnet.rpc';
const PREF_FAUCET_AMOUNT_KEY = 'corven.devnet.faucetAmount';

function readStorage(key: string, fallback: string): string {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

function countSavedChats(): number {
    try {
        return Object.keys(localStorage).filter((key) => key.startsWith(CHAT_PREFIX)).length;
    } catch {
        return 0;
    }
}

type SettingsTab = 'account' | 'preferences' | 'cors' | 'ai' | 'devnet' | 'security';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { user, logoutEverywhere } = useAuth();
    const ai = useQuery({ queryKey: ['ai', 'status'], queryFn: aiApi.status, staleTime: 5 * 60_000, retry: 1 });

    const [activeTab, setActiveTab] = useState<SettingsTab>('account');
    const [copied, setCopied] = useState<string | null>(null);

    // AI settings
    const [model, setModel] = useState(() => readStorage(MODEL_KEY, ''));
    const [savedChats, setSavedChats] = useState(countSavedChats);
    const [temperature, setTemperature] = useState(0.7);

    // Editor settings
    const [editorTheme, setEditorTheme] = useState(() => readStorage(PREF_THEME_KEY, 'cyber-dark'));
    const [editorFont, setEditorFont] = useState(() => readStorage(PREF_FONT_KEY, 'JetBrains Mono'));
    const [editorFontSize, setEditorFontSize] = useState(() => readStorage(PREF_FONT_SIZE_KEY, '13'));
    const [tabSize, setTabSize] = useState(() => readStorage(PREF_TAB_SIZE_KEY, '4'));
    const [wordWrap, setWordWrap] = useState(() => readStorage(PREF_WORD_WRAP_KEY, 'on'));
    const [autoSaveDelay, setAutoSaveDelay] = useState(() => readStorage(PREF_AUTO_SAVE_KEY, '1000'));

    // Devnet settings
    const [devnetRpc, setDevnetRpc] = useState(() => readStorage(PREF_DEVNET_RPC_KEY, 'http://127.0.0.1:8114'));
    const [faucetAmount, setFaucetAmount] = useState(() => readStorage(PREF_FAUCET_AMOUNT_KEY, '1000'));
    const [autoMineOnDeploy, setAutoMineOnDeploy] = useState(true);

    // CORS & Preview Diagnostics
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const isGeminiPreview =
        currentOrigin.includes('run.app') ||
        currentOrigin.includes('googleusercontent.com') ||
        currentOrigin.includes('aistudio');
    const [corsTestEndpoint, setCorsTestEndpoint] = useState('/api/cors-check');
    const [corsTestStatus, setCorsTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
    const [corsTestResult, setCorsTestResult] = useState<any>(null);
    const [copiedCorsFw, setCopiedCorsFw] = useState<string | null>(null);

    // Auth & confirmation
    const [confirmSignOut, setConfirmSignOut] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

    if (!user) return null;

    const selectedModel = model || ai.data?.defaultModel || '';

    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            setTimeout(() => setCopied(null), 1500);
        } catch {
            /* clipboard blocked */
        }
    };

    const chooseModel = (id: string) => {
        setModel(id);
        try {
            localStorage.setItem(MODEL_KEY, id);
        } catch {
            /* storage blocked */
        }
    };

    const clearChats = () => {
        try {
            Object.keys(localStorage)
                .filter((key) => key.startsWith(CHAT_PREFIX))
                .forEach((key) => localStorage.removeItem(key));
        } catch {
            /* storage blocked */
        }
        setSavedChats(countSavedChats());
    };

    const updateEditorPref = (key: string, value: string, setter: (v: string) => void) => {
        setter(value);
        try {
            localStorage.setItem(key, value);
            setSavedFeedback('Preferences saved');
            setTimeout(() => setSavedFeedback(null), 2000);
        } catch {
            /* storage blocked */
        }
    };

    const testCorsConnectivity = async () => {
        setCorsTestStatus('testing');
        const start = performance.now();
        try {
            const res = await fetch(corsTestEndpoint, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const latencyMs = Math.round(performance.now() - start);
            const data = await res.json();
            setCorsTestStatus(res.ok ? 'success' : 'failed');
            setCorsTestResult({
                status: res.status,
                latencyMs,
                data,
                timestamp: new Date().toLocaleTimeString(),
            });
        } catch (err: any) {
            const latencyMs = Math.round(performance.now() - start);
            setCorsTestStatus('failed');
            setCorsTestResult({
                status: 'Error',
                latencyMs,
                error: err?.message || 'CORS Network Blocked or unreachable',
                timestamp: new Date().toLocaleTimeString(),
            });
        }
    };

    const signOutEverywhere = async () => {
        setSigningOut(true);
        try {
            await logoutEverywhere();
            navigate('/auth', { replace: true });
        } finally {
            setSigningOut(false);
        }
    };

    const tabs: Array<{ id: SettingsTab; label: string; icon: any }> = [
        { id: 'account', label: 'Account & Wallet', icon: User },
        { id: 'preferences', label: 'Editor Preferences', icon: Sliders },
        { id: 'cors', label: 'CORS & Gemini Preview', icon: Globe },
        { id: 'ai', label: 'AI Assistant', icon: Bot },
        { id: 'devnet', label: 'Devnet & Node', icon: Cpu },
        { id: 'security', label: 'Security & Sessions', icon: Shield },
    ];

    // CORS Snippets for Settings
    const fiberCorsCode = `// Go Fiber CORS Configuration
app.Use(cors.New(cors.Config{
    AllowOriginsFunc: func(origin string) bool { return true }, // Reflects request origin
    AllowCredentials: true,
    AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
    AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Requested-With,X-Workspace-Id",
    ExposeHeaders:    "Content-Length,Content-Range,Content-Type,Authorization",
    MaxAge:           86400,
}))`;

    const expressCorsCode = `// Express CORS Configuration
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
    } else {
        res.header("Access-Control-Allow-Origin", "*");
    }
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept,Origin");
    res.header("Access-Control-Allow-Private-Network", "true");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
});`;

    return (
        <div className="min-h-full bg-surface px-4 py-8 text-on-surface sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1100px]">
                {/* Header */}
                <div className="flex flex-col gap-2 border-b border-outline-variant/30 pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">Settings</h1>
                        <p className="mt-1 text-[13px] text-on-surface-variant">
                            Manage your wallet account, editor preferences, CORS preview setup, and node connections.
                        </p>
                    </div>
                    {savedFeedback && (
                        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-[12px] font-mono text-primary animate-fade-in">
                            <Check className="h-3.5 w-3.5" />
                            <span>{savedFeedback}</span>
                        </div>
                    )}
                </div>

                {/* Main Navigation Tabs */}
                <div className="mt-6 flex gap-1 overflow-x-auto border-b border-outline-variant/30 pb-px">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        const active = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${active
                                        ? 'border-primary text-primary font-semibold'
                                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                                    }`}
                            >
                                <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-on-surface-variant'}`} />
                                <span>{t.label}</span>
                                {t.id === 'cors' && isGeminiPreview && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content Areas */}
                <div className="mt-6">
                    {/* TAB 1: Account */}
                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20">
                                    <div className="flex items-center gap-4">
                                        <Avatar user={user} size={48} />
                                        <div>
                                            <div className="text-[16px] font-semibold text-on-surface">{displayName(user)}</div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[12.5px] text-on-surface-variant">
                                                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-medium text-primary">
                                                    CKB Devnet Active
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    {user.authProvider === 'CKB_WALLET'
                                                        ? 'Wallet authenticated'
                                                        : user.authProvider === 'GOOGLE'
                                                            ? 'Signed in with Google'
                                                            : 'Email session'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[12px] text-on-surface-variant sm:text-right font-mono">
                                        Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                </div>

                                <dl className="mt-6 space-y-4 text-[13px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <dt className="text-on-surface-variant font-mono text-[12px]">Wallet Address</dt>
                                        <dd className="min-w-0">
                                            {user.walletAddress ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleCopy('addr', user.walletAddress)}
                                                    className="inline-flex items-center gap-2 rounded bg-surface-container-high px-3 py-1.5 font-mono text-[12px] text-primary hover:bg-surface-container-highest transition-colors select-all max-w-full"
                                                >
                                                    <span className="truncate">{user.walletAddress}</span>
                                                    {copied === 'addr' ? (
                                                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-on-surface-variant">No wallet connected</span>
                                            )}
                                        </dd>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-outline-variant/15 pt-4">
                                        <dt className="text-on-surface-variant font-mono text-[12px]">Primary Email</dt>
                                        <dd className="font-mono text-on-surface text-[12.5px]">{user.email || 'None'}</dd>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-outline-variant/15 pt-4">
                                        <dt className="text-on-surface-variant font-mono text-[12px]">Cryptographic Signer</dt>
                                        <dd className="flex items-center gap-1.5 font-mono text-secondary text-[12.5px]">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>secp256k1_blake160_sighash_all</span>
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            {user.authProvider === 'GOOGLE' && <CorvenWalletCard />}
                        </div>
                    )}

                    {/* TAB 2: Editor Preferences */}
                    {activeTab === 'preferences' && (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-6">
                                <h3 className="text-[14px] font-semibold text-on-surface font-mono">Editor &amp; Syntax</h3>
                                <p className="mt-1 text-[12px] text-on-surface-variant">
                                    Configure typography, indentation, and live workspace behaviors.
                                </p>

                                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-[12px] font-mono uppercase text-on-surface-variant">Font Family</label>
                                        <select
                                            value={editorFont}
                                            onChange={(e) => updateEditorPref(PREF_FONT_KEY, e.target.value, setEditorFont)}
                                            className="mt-1.5 w-full rounded border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] font-mono text-on-surface focus:border-primary focus:outline-none"
                                        >
                                            <option value="JetBrains Mono">JetBrains Mono</option>
                                            <option value="Fira Code">Fira Code</option>
                                            <option value="Source Code Pro">Source Code Pro</option>
                                            <option value="monospace">Standard Monospace</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-mono uppercase text-on-surface-variant">Font Size</label>
                                        <select
                                            value={editorFontSize}
                                            onChange={(e) => updateEditorPref(PREF_FONT_SIZE_KEY, e.target.value, setEditorFontSize)}
                                            className="mt-1.5 w-full rounded border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] font-mono text-on-surface focus:border-primary focus:outline-none"
                                        >
                                            <option value="12">12 px (Compact)</option>
                                            <option value="13">13 px (Default)</option>
                                            <option value="14">14 px (Comfortable)</option>
                                            <option value="16">16 px (Large)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-mono uppercase text-on-surface-variant">Tab Size</label>
                                        <select
                                            value={tabSize}
                                            onChange={(e) => updateEditorPref(PREF_TAB_SIZE_KEY, e.target.value, setTabSize)}
                                            className="mt-1.5 w-full rounded border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] font-mono text-on-surface focus:border-primary focus:outline-none"
                                        >
                                            <option value="2">2 Spaces</option>
                                            <option value="4">4 Spaces (Standard Rust / Go)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-mono uppercase text-on-surface-variant">Auto-Save Delay</label>
                                        <select
                                            value={autoSaveDelay}
                                            onChange={(e) => updateEditorPref(PREF_AUTO_SAVE_KEY, e.target.value, setAutoSaveDelay)}
                                            className="mt-1.5 w-full rounded border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] font-mono text-on-surface focus:border-primary focus:outline-none"
                                        >
                                            <option value="500">500 ms (Fast)</option>
                                            <option value="1000">1000 ms (Default)</option>
                                            <option value="2000">2000 ms (Relaxed)</option>
                                            <option value="manual">Manual (Ctrl + S only)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Live Code Preview */}
                                <div className="mt-6 pt-5 border-t border-outline-variant/20">
                                    <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant mb-2">
                                        <span>LIVE PREVIEW</span>
                                        <span>{editorFont} · {editorFontSize}px</span>
                                    </div>
                                    <pre
                                        style={{ fontFamily: editorFont, fontSize: `${editorFontSize}px` }}
                                        className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 text-emerald-300 overflow-x-auto"
                                    >
                                        {`pub fn verify_witness(witness: &[u8]) -> Result<(), Error> {
    if witness.is_empty() {
        return Err(Error::EmptyWitness);
    }
    ckb_std::debug!("Witness verified with ${tabSize} spaces indentation");
    Ok(())
}`}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: CORS & Gemini Preview */}
                    {activeTab === 'cors' && (
                        <div className="space-y-6">
                            {/* Gemini Preview Origin Box */}
                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
                                            <Globe className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[14px] font-semibold text-on-surface">
                                                    Gemini Studio Preview CORS Configuration
                                                </h3>
                                                {isGeminiPreview && (
                                                    <span className="rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-mono text-primary font-medium">
                                                        Active Preview
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-[12px] text-on-surface-variant leading-relaxed">
                                                Frontend requests originate from{' '}
                                                <code className="font-mono text-primary px-1.5 py-0.5 rounded bg-surface-container-high">{currentOrigin || 'unknown'}</code>.
                                                To avoid <code className="text-error">CORS Preflight</code> and <code className="text-error">Credentials Wildcard</code> errors, configure your backend with the rules below.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleCopy('origin', currentOrigin)}
                                        className="inline-flex items-center gap-1.5 self-start sm:self-center h-8 px-3 rounded-md bg-surface-container-high border border-outline-variant/30 text-on-surface font-mono text-[11.5px] hover:bg-surface-container-highest transition-colors shrink-0"
                                    >
                                        {copied === 'origin' ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                                        <span>Copy Origin</span>
                                    </button>
                                </div>
                            </div>

                            {/* Live CORS Preflight Checker */}
                            <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 font-mono text-[13px] font-semibold text-on-surface">
                                        <Terminal className="h-4 w-4 text-primary" />
                                        <span>Live CORS Preflight &amp; Request Tester</span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={corsTestEndpoint}
                                        onChange={(e) => setCorsTestEndpoint(e.target.value)}
                                        placeholder="Endpoint (e.g. /api/cors-check or http://localhost:8080/api)"
                                        className="flex-1 rounded border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 font-mono text-[12px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={testCorsConnectivity}
                                        disabled={corsTestStatus === 'testing'}
                                        className="h-9 px-4 rounded bg-primary text-on-primary font-mono text-[12px] font-medium hover:bg-primary-fixed transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
                                    >
                                        {corsTestStatus === 'testing' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-current" />}
                                        <span>Test Request</span>
                                    </button>
                                </div>

                                {corsTestResult && (
                                    <div className="mt-4 rounded border border-outline-variant/20 bg-surface-container-lowest p-3 font-mono text-[11.5px]">
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold text-[11px] ${corsTestStatus === 'success'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                {corsTestStatus === 'success' ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                                <span>Status: {corsTestResult.status}</span>
                                            </span>
                                            <span className="text-on-surface-variant">Latency: {corsTestResult.latencyMs}ms</span>
                                            <span className="text-on-surface-variant/60 text-[10px]">{corsTestResult.timestamp}</span>
                                        </div>
                                        {corsTestResult.data && (
                                            <pre className="mt-2 text-emerald-300 max-h-36 overflow-auto">
                                                {JSON.stringify(corsTestResult.data, null, 2)}
                                            </pre>
                                        )}
                                        {corsTestResult.error && (
                                            <div className="mt-2 text-rose-300">{corsTestResult.error}</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Backend Snippets */}
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[12.5px] font-semibold text-on-surface font-mono">Go Fiber (v2 / v3)</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleCopy('fiber-code', fiberCorsCode);
                                                setCopiedCorsFw('fiber');
                                                setTimeout(() => setCopiedCorsFw(null), 1500);
                                            }}
                                            className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                                        >
                                            {copiedCorsFw === 'fiber' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            <span>{copiedCorsFw === 'fiber' ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>
                                    <pre className="rounded bg-surface-container-lowest p-3 font-mono text-[11px] text-on-surface-variant overflow-x-auto">
                                        {fiberCorsCode}
                                    </pre>
                                </div>

                                <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[12.5px] font-semibold text-on-surface font-mono">Node.js Express</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleCopy('express-code', expressCorsCode);
                                                setCopiedCorsFw('express');
                                                setTimeout(() => setCopiedCorsFw(null), 1500);
                                            }}
                                            className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                                        >
                                            {copiedCorsFw === 'express' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            <span>{copiedCorsFw === 'express' ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>
                                    <pre className="rounded bg-surface-container-lowest p-3 font-mono text-[11px] text-on-surface-variant overflow-x-auto">
                                        {expressCorsCode}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: AI Assistant */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-6">
                                <h3 className="text-[14px] font-semibold text-on-surface font-mono">AI Models &amp; Agent Engine</h3>
                                <p className="mt-1 text-[12px] text-on-surface-variant">
                                    Select the language model used for contract generation, audit, and explain tools.
                                </p>

                                {ai.isLoading ? (
                                    <div className="mt-4 h-24 animate-pulse rounded-lg border border-outline-variant/20 bg-surface-container-low" />
                                ) : !ai.data?.enabled ? (
                                    <div className="mt-4 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-[12.5px] text-on-surface-variant">
                                        The assistant server is not enabled. Add API keys in server environment variables to activate full AI code assistance.
                                    </div>
                                ) : (
                                    <div className="mt-5 space-y-4">
                                        <div className="overflow-hidden rounded-lg border border-outline-variant/30">
                                            {ai.data.models.map((m) => (
                                                <label
                                                    key={m.id}
                                                    className={`flex cursor-pointer items-start gap-3 border-b border-outline-variant/20 p-4 last:border-b-0 transition-colors ${selectedModel === m.id ? 'bg-primary/10' : 'bg-surface-container-low hover:bg-surface-container-high'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="model"
                                                        value={m.id}
                                                        checked={selectedModel === m.id}
                                                        onChange={() => chooseModel(m.id)}
                                                        className="mt-1 accent-primary"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="text-[13.5px] font-medium text-on-surface">
                                                            {m.name}
                                                            {m.id === ai.data.defaultModel && (
                                                                <span className="ml-2 rounded bg-surface-container-high px-2 py-0.5 text-[10.5px] font-mono text-primary">
                                                                    server default
                                                                </span>
                                                            )}
                                                        </div>
                                                        {m.description && (
                                                            <div className="mt-0.5 text-[12px] text-on-surface-variant">
                                                                {m.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                                            <div>
                                                <div className="text-[13px] font-medium text-on-surface">Saved Workspace Conversations</div>
                                                <div className="text-[11.5px] text-on-surface-variant">
                                                    {savedChats === 0
                                                        ? 'No chat history stored in this browser.'
                                                        : `${savedChats} conversation${savedChats === 1 ? '' : 's'} stored locally.`}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearChats}
                                                disabled={savedChats === 0}
                                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-outline-variant/40 bg-surface-container text-[12px] font-mono text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-error" />
                                                <span>Clear History</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Devnet & Node */}
                    {activeTab === 'devnet' && (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-6">
                                <h3 className="text-[14px] font-semibold text-on-surface font-mono">CKB Devnet &amp; Node Settings</h3>
                                <p className="mt-1 text-[12px] text-on-surface-variant">
                                    Configure RPC targets, faucet dispenser defaults, and devnet mining behaviors.
                                </p>

                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="block text-[12px] font-mono uppercase text-on-surface-variant">Default RPC Endpoint</label>
                                        <input
                                            type="text"
                                            value={devnetRpc}
                                            onChange={(e) => updateEditorPref(PREF_DEVNET_RPC_KEY, e.target.value, setDevnetRpc)}
                                            className="mt-1.5 w-full rounded border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] font-mono text-on-surface focus:border-primary focus:outline-none"
                                        />
                                        <p className="mt-1 text-[11px] text-on-surface-variant">
                                            Workspace internal devnets relay via <code className="text-primary font-mono">/workspaces/:id/devnet/rpc</code>.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-mono uppercase text-on-surface-variant">Faucet Dispense Amount (CKB)</label>
                                        <input
                                            type="number"
                                            value={faucetAmount}
                                            onChange={(e) => updateEditorPref(PREF_FAUCET_AMOUNT_KEY, e.target.value, setFaucetAmount)}
                                            className="mt-1.5 w-full rounded border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] font-mono text-on-surface focus:border-primary focus:outline-none"
                                        />
                                    </div>

                                    <div className="pt-2 flex items-center justify-between border-t border-outline-variant/20">
                                        <div>
                                            <div className="text-[13px] font-medium text-on-surface">Auto-Mine On Transaction</div>
                                            <div className="text-[11.5px] text-on-surface-variant">
                                                Instantly produces a new block whenever a contract or transaction is submitted.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAutoMineOnDeploy(!autoMineOnDeploy)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoMineOnDeploy ? 'bg-primary' : 'bg-surface-container-highest'
                                                }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${autoMineOnDeploy ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: Security & Sessions */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-6">
                                <h3 className="text-[14px] font-semibold text-on-surface font-mono">Active Sessions &amp; Security</h3>
                                <p className="mt-1 text-[12px] text-on-surface-variant">
                                    Manage your browser tokens, cached authentication credentials, and session lifecycles.
                                </p>

                                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
                                    <div>
                                        <div className="text-[13px] font-medium text-on-surface">End All Active Sessions</div>
                                        <div className="text-[11.5px] text-on-surface-variant mt-0.5">
                                            Sign out of all browsers, dev environments, and device tokens immediately.
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmSignOut(true)}
                                        disabled={signingOut}
                                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-rose-500/40 px-3 text-[12px] font-mono text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
                                    >
                                        {signingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                        <span>Sign out everywhere</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmSignOut}
                onClose={() => setConfirmSignOut(false)}
                onConfirm={() => {
                    setConfirmSignOut(false);
                    void signOutEverywhere();
                }}
                title="Sign out everywhere?"
                description="Every browser and workspace signed in to your account will need to connect wallet authentication again."
                confirmLabel="Sign out everywhere"
                variant="danger"
            />
        </div>
    );
}
