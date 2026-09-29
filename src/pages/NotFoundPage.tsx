// src/pages/NotFoundPage.tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
    const location = useLocation();
    const [copied, setCopied] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const currentPath = location.pathname || '/undefined-path';

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const copyDiagnostics = () => {
        const diagnostics = `$ corven-router resolve ${currentPath} --telemetry\n[WARN] No matching route registered in src/app/router.tsx (Uncaught RouteResolutionError)\n[INFO] Fallback resolution initialized. Evaluated 18 cell indexes, 0 active bindings found.\n[ROUTE] Available protected routes: /workspaces, /community, /donate, /contracts, /logs\nSTATUS_CODE: ERR_ROUTE_NOT_FOUND`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(diagnostics).then(() => {
                setCopied(true);
                showToast('Diagnostic logs copied to clipboard.');
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                showToast('Diagnostics captured.');
            });
        } else {
            showToast('Diagnostics captured.');
        }
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-surface font-body-md text-on-surface antialiased">
            <div className="relative w-full overflow-hidden p-space-md lg:p-space-xl flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">
                {/* Background decorative glows */}
                <div className="absolute inset-0 pointer-events-none opacity-25">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-80 h-80 rounded-full bg-secondary/10 blur-3xl"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]"></div>
                </div>

                <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                    {/* Status code pill */}
                    <div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface-variant mb-space-lg shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
                        <span className="font-label-sm text-label-sm tracking-wider uppercase text-error font-medium">STATUS_CODE: ERR_ROUTE_NOT_FOUND</span>
                        <span className="text-on-surface-variant/40">/</span>
                        <span className="font-code-sm text-code-sm text-on-surface-variant">{currentPath}</span>
                    </div>

                    {/* Big Typographic 404 */}
                    <div className="relative select-none flex items-center justify-center">
                        <span className="font-code-lg text-[110px] md:text-[140px] leading-none font-bold tracking-tighter text-surface-container-highest/60 drop-shadow-sm">404</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-code-lg text-[106px] md:text-[136px] leading-none font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-primary via-primary-container to-surface-container-highest opacity-90 filter blur-[0.6px]">404</span>
                        </div>
                    </div>

                    {/* Heading & description */}
                    <div className="text-center mt-space-xs max-w-2xl">
                        <div className="inline-flex items-center gap-space-xs mb-space-sm text-secondary">
                            <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
                            <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">Consensus Cell Not Resolved</span>
                        </div>
                        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">Cell or Route Out of Range</h1>
                        <p className="mt-space-sm font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                            The requested route does not exist in the Corven IDE routing table, or your devnet session URL has expired. Please verify your workspace URL or return to your active workspaces.
                        </p>
                    </div>

                    {/* Terminal Diagnostic Trace Card */}
                    <div className="w-full max-w-2xl mt-space-xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border border-outline-variant/30">
                        <div className="flex items-center justify-between px-space-md py-space-sm bg-surface-container-low border-b border-outline-variant/20">
                            <div className="flex items-center gap-space-sm">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-error/70"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-secondary/70"></span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-primary/70"></span>
                                </div>
                                <span className="ml-space-xs font-code-sm text-code-sm text-on-surface-variant">corven-runtime-trace.log</span>
                            </div>
                            <div className="flex items-center gap-space-xs">
                                <span className="px-1.5 py-0.5 rounded font-code-sm text-code-sm bg-surface-container-high text-on-surface-variant">CKB-VM 0.21.3</span>
                                <button
                                    onClick={copyDiagnostics}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                                    title="Copy Diagnostic Trace"
                                >
                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-space-md font-code-sm text-code-sm space-y-space-xs bg-surface-container-lowest text-on-surface">
                            <div className="flex items-center gap-space-sm">
                                <span className="text-primary font-medium">$</span>
                                <span className="text-on-surface font-code-sm text-code-sm">corven-router resolve {currentPath} --telemetry</span>
                            </div>
                            <div className="flex items-start gap-space-sm text-error">
                                <span className="font-semibold text-error-container bg-error/10 px-1 py-0.2 rounded font-label-sm text-label-sm">[WARN]</span>
                                <span className="leading-relaxed">No matching route registered in <span className="text-on-surface font-medium underline underline-offset-2 decoration-outline-variant">src/app/router.tsx</span> (Uncaught RouteResolutionError)</span>
                            </div>
                            <div className="flex items-start gap-space-sm text-secondary">
                                <span className="font-semibold text-on-secondary-fixed-variant bg-secondary/10 px-1 py-0.2 rounded font-label-sm text-label-sm">[INFO]</span>
                                <span className="leading-relaxed">Fallback resolution initialized. Evaluated 18 cell indexes, 0 active bindings found.</span>
                            </div>
                            <div className="flex items-start gap-space-sm text-on-surface-variant">
                                <span className="font-semibold text-primary bg-primary/10 px-1 py-0.2 rounded font-label-sm text-label-sm">[ROUTE]</span>
                                <span className="leading-relaxed">Available protected routes: <span className="text-primary">/workspaces</span>, <span className="text-primary">/community</span>, <span className="text-primary">/donate</span>, <span className="text-primary">/nodes</span></span>
                            </div>
                            <div className="pt-space-xs flex items-center justify-between text-on-surface-variant/70 text-[10px]">
                                <span>CELL_TX: 0x98f244...bc170d</span>
                                <span>NODE_LATENCY: 22ms [Devnet-Local]</span>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-space-xl flex flex-wrap items-center justify-center gap-space-md w-full max-w-2xl">
                        <Link
                            to="/dashboard"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary text-on-primary hover:bg-surface-tint font-body-md text-body-md font-medium shadow-md transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">terminal</span>
                            <span>Return to Workspaces</span>
                        </Link>
                        <Link
                            to="/dashboard?tab=community"
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-body-md text-body-md font-medium shadow-sm transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">forum</span>
                            <span>Open Community Support</span>
                        </Link>
                        <button
                            onClick={() => showToast('Bug ticket draft generated with current session dump.')}
                            type="button"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high font-body-md text-body-md transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">bug_report</span>
                            <span>Report Router Issue</span>
                        </button>
                    </div>

                    {/* Recent Workspace Snapshot footer */}
                    <div className="mt-space-xl w-full max-w-2xl bg-surface-container rounded-xl p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md shadow-sm border border-outline-variant/30">
                        <div className="flex items-center gap-space-md">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                                <span className="material-symbols-outlined text-[20px]">layers</span>
                            </div>
                            <div>
                                <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">Recent Workspace Snapshot</div>
                                <div className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                    <span>ckb-godwoken-bridge / contracts/token_lock.rs</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-space-xs w-full md:w-auto justify-end">
                            <Link
                                to="/dashboard"
                                className="px-space-md py-1.5 rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-bright font-body-sm text-body-sm font-medium transition-colors flex items-center gap-1"
                            >
                                <span>Restore State</span>
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Toast notification */}
                {toastMessage && (
                    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-surface-container-highest text-on-surface shadow-2xl border border-outline-variant/40 animate-fade-in">
                        <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                        <span className="font-body-sm text-body-sm">{toastMessage}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
