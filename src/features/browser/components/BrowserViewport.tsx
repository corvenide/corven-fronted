// src/features/browser/components/BrowserViewport.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    RefreshCw,
    ExternalLink,
    AlertCircle,
    Send,
    Plus,
    CheckCircle2,
    Database,
    Zap,
    Play,
    Copy,
    Check,
} from 'lucide-react';
import type { BrowserTab, ConsoleLogEntry, NetworkLogEntry } from '../types/browser.types';
import { DEVICE_PRESETS } from '../data/presetApps';
import { useWorkspacePreview } from '../preview';

interface BrowserViewportProps {
    tab: BrowserTab;
    onLog: (log: ConsoleLogEntry) => void;
    onNetwork: (net: NetworkLogEntry) => void;
    onUpdateTitle: (title: string) => void;
    workspaceFiles?: Array<{ path: string; content?: string }>;
    /** When set, `localhost:<port>` URLs open that port inside the workspace. */
    workspaceId?: string;
}

export function BrowserViewport({
    tab,
    onLog,
    onNetwork,
    onUpdateTitle,
    workspaceFiles = [],
    workspaceId,
}: BrowserViewportProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeKey, setIframeKey] = useState(0);
    const preview = useWorkspacePreview(workspaceId, tab.url);

    // The address bar's reload button flips isLoading; remount the frame
    // (and fetch a fresh preview link) when it does.
    useEffect(() => {
        if (tab.isLoading) {
            setIframeKey((key) => key + 1);
            preview.reload();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab.isLoading]);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Sandbox DApp State
    const [ckbBalance, setCkbBalance] = useState(2500);
    const [faucetLoading, setFaucetLoading] = useState(false);
    const [contractCallStatus, setContractCallStatus] = useState<string | null>(null);
    const [dappTxs, setDappTxs] = useState([
        { hash: '0x3a9f...8821', type: 'Cell Transfer', capacity: '200 CKB', status: 'Confirmed', time: '2m ago' },
        { hash: '0x7e12...b940', type: 'Contract Deploy', capacity: '850 CKB', status: 'Confirmed', time: '12m ago' },
    ]);

    // Go Fiber Tester State
    const [fiberPosts, setFiberPosts] = useState([
        { id: 1, title: 'Building ultra high performance APIs', author: 'johndoe', time: '2 hours ago' },
        { id: 2, title: 'Nervos CKB Cell Model & Fiber Channels', author: 'ada_core', time: '45 mins ago' },
    ]);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostAuthor, setNewPostAuthor] = useState('');
    const [fiberEndpoint, setFiberEndpoint] = useState<'posts' | 'health' | 'users'>('posts');

    // Code Sandbox State
    const [sandboxHtml, setSandboxHtml] = useState(`<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 p-6 font-sans">
  <div class="max-w-md mx-auto bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
    <div class="flex items-center gap-2 mb-3">
      <div class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
      <h2 class="text-lg font-bold text-emerald-400">CKB Frontend App</h2>
    </div>
    <p class="text-sm text-slate-400 mb-4">Frontend running in Corven sandboxed browser runner.</p>
    <button onclick="handleClick()" class="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition">
      Trigger Web3 Event
    </button>
    <div id="output" class="mt-4 text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded">
      Click the button to test console bridge.
    </div>
  </div>
  <script>
    function handleClick() {
      console.log('Web3 interaction dispatched from sandbox frontend!');
      document.getElementById('output').innerText = 'Event executed at ' + new Date().toLocaleTimeString();
    }
  </script>
</body>
</html>`);

    // Listen for messages from iframe for console logging
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.source === 'corven-browser-bridge') {
                if (event.data.type === 'console') {
                    onLog({
                        id: `log-${Date.now()}-${Math.random()}`,
                        level: event.data.level || 'log',
                        message: event.data.message || '',
                        timestamp: Date.now(),
                    });
                }
                if (event.data.type === 'network') {
                    onNetwork({
                        id: `net-${Date.now()}-${Math.random()}`,
                        method: event.data.method || 'GET',
                        url: event.data.url || '',
                        status: event.data.status || 200,
                        durationMs: event.data.durationMs || 45,
                        timestamp: Date.now(),
                        type: 'fetch',
                    });
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onLog, onNetwork]);

    // Update title when url changes
    useEffect(() => {
        setLoadError(null);
        if (tab.url.startsWith('workspace://')) {
            onUpdateTitle('Workspace Frontend');
        } else if (tab.url.startsWith('sandbox://ckb')) {
            onUpdateTitle('CKB & Fiber DApp');
        } else if (tab.url.startsWith('sandbox://fiber')) {
            onUpdateTitle('Go Fiber API Client');
        } else if (tab.url.startsWith('sandbox://code')) {
            onUpdateTitle('Frontend Sandbox');
        } else if (tab.url.includes('localhost:5173')) {
            onUpdateTitle('Vite Frontend (:5173)');
        } else if (tab.url.includes('localhost:3000')) {
            onUpdateTitle('App Server (:3000)');
        } else if (tab.url.includes('localhost:8080')) {
            onUpdateTitle('Fiber Server (:8080)');
        }
    }, [tab.url, onUpdateTitle]);

    const activePreset = DEVICE_PRESETS.find((p) => p.id === tab.device) || DEVICE_PRESETS[0];

    // Compute dimensions based on device preset and landscape flag
    let targetWidth: number | string = '100%';
    let targetHeight: number | string = '100%';

    if (activePreset.width && activePreset.height) {
        if (tab.isLandscape) {
            targetWidth = `${activePreset.height}px`;
            targetHeight = `${activePreset.width}px`;
        } else {
            targetWidth = `${activePreset.width}px`;
            targetHeight = `${activePreset.height}px`;
        }
    }

    // Check if this is a workspace frontend URL
    const isWorkspaceUrl = tab.url.startsWith('workspace://');
    const isCkbDappUrl = tab.url.startsWith('sandbox://ckb');
    const isFiberApiUrl = tab.url.startsWith('sandbox://fiber');
    const isCodeSandboxUrl = tab.url.startsWith('sandbox://code');
    const isStandardUrl = !isWorkspaceUrl && !isCkbDappUrl && !isFiberApiUrl && !isCodeSandboxUrl;

    // Helper: generate workspace frontend HTML
    const getWorkspaceFrontendSrcDoc = () => {
        const htmlFile = workspaceFiles.find((f) => f.path.endsWith('index.html') || f.path.includes('frontend/'));
        const cssFile = workspaceFiles.find((f) => f.path.endsWith('.css'));
        const jsFile = workspaceFiles.find((f) => f.path.endsWith('.js') || f.path.endsWith('.ts'));

        const htmlContent = htmlFile?.content || `
            <div style="font-family: system-ui, sans-serif; padding: 2.5rem; text-align: center; color: #e0e2ea; background: #101419; min-height: 100vh;">
                <div style="max-width: 520px; margin: 0 auto; background: #1c2025; padding: 2rem; border-radius: 12px; border: 1px solid #3c4a42;">
                    <div style="width: 48px; height: 48px; border-radius: 10px; background: rgba(78, 222, 163, 0.1); color: #4edea3; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 24px; font-weight: bold;">
                        ⚡
                    </div>
                    <h2 style="font-size: 1.25rem; font-weight: 600; color: #4edea3; margin-bottom: 0.5rem;">Workspace Frontend Runner</h2>
                    <p style="font-size: 0.85rem; color: #bbcabf; line-height: 1.5; margin-bottom: 1.5rem;">
                        This sandboxed runner automatically renders HTML/CSS/JS frontend files located in your workspace (such as <code>frontend/index.html</code>).
                    </p>
                    <button onclick="console.log('Hello from Workspace Frontend!'); alert('Frontend connected to Corven Devnet!');" style="background: #4edea3; color: #003824; border: none; padding: 0.6rem 1.2rem; font-size: 0.85rem; font-weight: 600; border-radius: 6px; cursor: pointer;">
                        Click to Dispatch Devnet Action
                    </button>
                </div>
            </div>
        `;

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Corven Workspace Frontend</title>
  <style>
    ${cssFile?.content || ''}
  </style>
  <script>
    // Console proxy to parent DevTools
    (function() {
      const parentWin = window.parent;
      ['log', 'info', 'warn', 'error'].forEach(level => {
        const original = console[level];
        console[level] = function(...args) {
          try {
            parentWin.postMessage({
              source: 'corven-browser-bridge',
              type: 'console',
              level: level,
              message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
            }, '*');
          } catch(e) {}
          original.apply(console, args);
        };
      });
    })();
  </script>
</head>
<body style="margin: 0; background: #101419;">
  ${htmlContent}
  <script>
    ${jsFile?.content || ''}
  </script>
</body>
</html>`;
    };

    // Faucet claim handler
    const handleClaimFaucet = () => {
        setFaucetLoading(true);
        onLog({
            id: `log-${Date.now()}`,
            level: 'info',
            message: '[CKB Faucet] Requesting 500 CKB from local Devnet node (http://127.0.0.1:8114)...',
            timestamp: Date.now(),
        });
        onNetwork({
            id: `net-${Date.now()}`,
            method: 'POST',
            url: 'http://127.0.0.1:8114/rpc/claim_faucet',
            status: 200,
            durationMs: 78,
            timestamp: Date.now(),
            type: 'fetch',
        });

        setTimeout(() => {
            setCkbBalance((prev) => prev + 500);
            setFaucetLoading(false);
            const newTx = {
                hash: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
                type: 'Faucet Dispense',
                capacity: '+500 CKB',
                status: 'Confirmed',
                time: 'Just now',
            };
            setDappTxs([newTx, ...dappTxs]);
            onLog({
                id: `log-${Date.now()}`,
                level: 'log',
                message: `[CKB Faucet] Dispense successful! TxHash: ${newTx.hash}`,
                timestamp: Date.now(),
            });
        }, 600);
    };

    // Execute Smart Contract call
    const handleCallContract = () => {
        setContractCallStatus('Executing hello-world contract...');
        onLog({
            id: `log-${Date.now()}`,
            level: 'info',
            message: '[DApp] Invoking contract verification script with args: [0x01, 0x48, 0x65, 0x6c, 0x6c, 0x6f]',
            timestamp: Date.now(),
        });
        onNetwork({
            id: `net-${Date.now()}`,
            method: 'POST',
            url: 'http://127.0.0.1:8114/rpc/send_transaction',
            status: 200,
            durationMs: 142,
            timestamp: Date.now(),
            type: 'fetch',
        });

        setTimeout(() => {
            setContractCallStatus('Success! Cycles consumed: 11,482');
            onLog({
                id: `log-${Date.now()}`,
                level: 'log',
                message: '[DApp] Verification passed! Lock script satisfied. Cell capacity updated.',
                timestamp: Date.now(),
            });
            setTimeout(() => setContractCallStatus(null), 3000);
        }, 800);
    };

    // Add Go Fiber Post
    const handleAddFiberPost = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostTitle.trim()) return;
        const newPost = {
            id: fiberPosts.length + 1,
            title: newPostTitle.trim(),
            author: newPostAuthor.trim() || 'developer',
            time: 'Just now',
        };
        setFiberPosts([newPost, ...fiberPosts]);
        setNewPostTitle('');
        setNewPostAuthor('');

        onLog({
            id: `log-${Date.now()}`,
            level: 'info',
            message: `[Fiber API] POST /api/v1/posts 201 Created: ${JSON.stringify(newPost)}`,
            timestamp: Date.now(),
        });
        onNetwork({
            id: `net-${Date.now()}`,
            method: 'POST',
            url: 'http://localhost:8080/api/v1/posts',
            status: 201,
            durationMs: 18,
            timestamp: Date.now(),
            type: 'fetch',
        });
    };

    return (
        <div className="flex h-full w-full flex-col items-center justify-center overflow-auto bg-surface-container-lowest p-2 select-text">
            {/* Viewport Frame Container */}
            <div
                className={`relative flex flex-col overflow-hidden transition-all duration-200 ${
                    activePreset.deviceFrame
                        ? 'rounded-3xl border-4 border-surface-container-highest shadow-2xl bg-surface'
                        : 'w-full h-full'
                }`}
                style={{
                    width: targetWidth,
                    height: targetHeight,
                    transform: `scale(${tab.zoom})`,
                    transformOrigin: 'top center',
                }}
            >
                {/* Simulated Device Bezel Header for Mobile/Tablet */}
                {activePreset.deviceFrame && (
                    <div className="flex h-6 w-full items-center justify-between bg-surface-container-high px-5 select-none text-[10px] text-on-surface-variant font-mono">
                        <span>9:41</span>
                        <div className="h-3 w-16 rounded-full bg-surface-container-highest" />
                        <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">wifi</span>
                            <span className="material-symbols-outlined text-[12px]">battery_full</span>
                        </div>
                    </div>
                )}

                {/* Content Renderer based on URL Type */}
                <div className="flex-1 w-full h-full min-h-0 min-w-0 overflow-auto bg-surface">
                    {/* 1. CKB & FIBER DAPP CLIENT */}
                    {isCkbDappUrl && (
                        <div className="flex h-full flex-col overflow-y-auto bg-surface p-6 font-sans">
                            <div className="max-w-3xl mx-auto w-full space-y-6">
                                {/* DApp Header */}
                                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 border border-secondary/30 text-secondary">
                                            <span className="material-symbols-outlined text-[24px]">token</span>
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-on-surface">CKB &amp; Fiber DApp Client</h2>
                                            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
                                                <span className="flex items-center gap-1 text-primary">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                    Connected to Devnet (8114)
                                                </span>
                                                <span>•</span>
                                                <span>Block #14,892</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-surface-container px-3 py-1.5 text-right border border-outline-variant/30 font-mono">
                                            <span className="text-[10px] text-on-surface-variant block">Balance</span>
                                            <span className="text-[13px] font-bold text-primary">{ckbBalance.toLocaleString()} CKB</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClaimFaucet}
                                            disabled={faucetLoading}
                                            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-medium text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            <Zap className="h-3 w-3" />
                                            <span>{faucetLoading ? 'Dispensing...' : 'Faucet (+500)'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Contract Interaction Box */}
                                <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
                                    <h3 className="text-[12.5px] font-semibold text-on-surface font-mono uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-primary">deployed_code</span>
                                        <span>Execute Smart Contract (hello-world)</span>
                                    </h3>
                                    <p className="text-[11.5px] text-on-surface-variant mb-4">
                                        Invokes the compiled RISC-V binary deployed on your local devnet cell.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            defaultValue='{"action": "greet", "payload": "Nervos CKB"}'
                                            className="flex-1 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-[11px] font-mono text-on-surface focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCallContract}
                                            className="flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-1.5 text-[11px] font-medium text-on-secondary hover:bg-secondary/90 transition-colors shrink-0"
                                        >
                                            <Play className="h-3.5 w-3.5 fill-current" />
                                            <span>Send Tx</span>
                                        </button>
                                    </div>
                                    {contractCallStatus && (
                                        <div className="mt-3 rounded-lg bg-primary/10 border border-primary/30 p-2 text-[11px] font-mono text-primary flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>{contractCallStatus}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Transactions Feed */}
                                <div>
                                    <h4 className="text-[11.5px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold mb-2">
                                        Recent On-Chain Activity
                                    </h4>
                                    <div className="rounded-xl border border-outline-variant/30 overflow-hidden divide-y divide-outline-variant/20 bg-surface-container">
                                        {dappTxs.map((tx, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 text-[11.5px] font-mono hover:bg-surface-container-high transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-secondary font-medium">{tx.hash}</span>
                                                    <span className="text-[10px] text-on-surface-variant">({tx.type})</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-primary font-bold">{tx.capacity}</span>
                                                    <span className="text-[10px] text-on-surface-variant">{tx.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. GO FIBER REST TESTER */}
                    {isFiberApiUrl && (
                        <div className="flex h-full flex-col overflow-y-auto bg-surface p-6 font-sans">
                            <div className="max-w-3xl mx-auto w-full space-y-6">
                                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10 border border-tertiary/30 text-tertiary">
                                            <span className="material-symbols-outlined text-[24px]">api</span>
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-on-surface">Go Fiber Microservice Client</h2>
                                            <p className="text-[11px] text-on-surface-variant font-mono">
                                                Target: <code>http://localhost:8080/api/v1</code>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30">
                                        {(['posts', 'health', 'users'] as const).map((ep) => (
                                            <button
                                                key={ep}
                                                type="button"
                                                onClick={() => setFiberEndpoint(ep)}
                                                className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase transition-colors ${
                                                    fiberEndpoint === ep
                                                        ? 'bg-surface-container-high text-primary font-bold'
                                                        : 'text-on-surface-variant hover:text-on-surface'
                                                }`}
                                            >
                                                {ep}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Create Post Form */}
                                <form onSubmit={handleAddFiberPost} className="rounded-xl border border-outline-variant/30 bg-surface-container p-4">
                                    <h3 className="text-[12.5px] font-semibold text-on-surface font-mono uppercase tracking-wider mb-3">
                                        POST /api/v1/posts
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <input
                                            type="text"
                                            value={newPostTitle}
                                            onChange={(e) => setNewPostTitle(e.target.value)}
                                            placeholder="Post Title..."
                                            className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-[11px] font-mono text-on-surface focus:outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={newPostAuthor}
                                            onChange={(e) => setNewPostAuthor(e.target.value)}
                                            placeholder="Author handle..."
                                            className="rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-[11px] font-mono text-on-surface focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[11px] font-medium text-on-primary hover:bg-primary/90 transition-colors"
                                    >
                                        <Send className="h-3 w-3" />
                                        <span>Dispatch Request</span>
                                    </button>
                                </form>

                                {/* Results View */}
                                <div className="space-y-3">
                                    <h4 className="text-[11.5px] font-mono uppercase tracking-wider text-on-surface-variant font-semibold">
                                        Response Feed (GET /api/v1/posts)
                                    </h4>
                                    <div className="space-y-2">
                                        {fiberPosts.map((post) => (
                                            <div key={post.id} className="rounded-xl border border-outline-variant/30 bg-surface-container p-3 font-mono">
                                                <div className="flex items-center justify-between text-[12px] font-semibold text-on-surface mb-1">
                                                    <span>{post.title}</span>
                                                    <span className="text-[10px] text-primary">ID #{post.id}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10.5px] text-on-surface-variant">
                                                    <span>Author: @{post.author}</span>
                                                    <span>{post.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. CODE SANDBOX PLAYGROUND */}
                    {isCodeSandboxUrl && (
                        <div className="flex h-full flex-col">
                            <iframe
                                ref={iframeRef}
                                key={`sandbox-${iframeKey}`}
                                srcDoc={sandboxHtml}
                                sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
                                className="w-full h-full border-0 bg-surface"
                                title="Frontend Sandbox"
                            />
                        </div>
                    )}

                    {/* 4. WORKSPACE FRONTEND RUNNER */}
                    {isWorkspaceUrl && (
                        <iframe
                            ref={iframeRef}
                            key={`workspace-${iframeKey}`}
                            srcDoc={getWorkspaceFrontendSrcDoc()}
                            sandbox="allow-scripts allow-forms allow-modals allow-same-origin"
                            className="w-full h-full border-0 bg-surface"
                            title="Workspace Frontend"
                        />
                    )}

                    {/* 5. STANDARD URL / LOCALHOST DEV SERVER */}
                    {/* 5a. DEV SERVER INSIDE THE WORKSPACE (via the preview proxy) */}
                    {isStandardUrl && preview.active && (
                        <div className="relative w-full h-full bg-white">
                            {preview.state.status === 'ready' && (
                                <iframe
                                    ref={iframeRef}
                                    key={`preview-${iframeKey}-${preview.state.src}`}
                                    src={preview.state.src}
                                    // No allow-same-origin: workspace code is untrusted and
                                    // is served from the API's origin.
                                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                                    className="w-full h-full border-0 bg-white"
                                    title={tab.title}
                                />
                            )}

                            {preview.state.status === 'loading' && (
                                <div className="flex h-full items-center justify-center bg-surface font-mono text-[11.5px] text-on-surface-variant">
                                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    Connecting to your workspace…
                                </div>
                            )}

                            {preview.state.status === 'error' && (
                                <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface px-6 text-center">
                                    <AlertCircle className="h-6 w-6 text-error" />
                                    <p className="max-w-md font-mono text-[12px] leading-relaxed text-on-surface-variant">
                                        {preview.state.message}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={preview.reload}
                                        className="rounded bg-surface-container-high px-3 py-1 font-mono text-[11px] text-on-surface hover:text-primary"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}

                            {preview.state.status === 'ready' && (
                                <div className="pointer-events-auto absolute right-2 top-2 flex items-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-high/90 px-2.5 py-1 font-mono text-[10.5px] text-on-surface shadow-lg backdrop-blur">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                                    <span>Workspace {tab.displayUrl || tab.url}</span>
                                    <a
                                        href={preview.state.src}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        className="ml-1 flex items-center gap-0.5 text-primary hover:underline"
                                        title="Open in a new browser tab"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 5b. STANDARD URL / LOCALHOST DEV SERVER */}
                    {isStandardUrl && !preview.active && (
                        <div className="relative w-full h-full">
                            <iframe
                                ref={iframeRef}
                                key={`std-${iframeKey}`}
                                src={tab.url}
                                sandbox="allow-scripts allow-forms allow-modals allow-same-origin allow-popups"
                                onError={() => setLoadError(`Failed to load ${tab.url}. Ensure your local server is running.`)}
                                className="w-full h-full border-0 bg-white"
                                title={tab.title}
                            />

                            {/* Friendly banner overlay in case local dev server isn't running */}
                            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-lg bg-surface-container-high/90 backdrop-blur px-2.5 py-1 text-[10.5px] font-mono text-on-surface border border-outline-variant/40 shadow-lg pointer-events-auto">
                                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <span>Previewing {tab.displayUrl || tab.url}</span>
                                <a
                                    href={tab.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="ml-1 text-primary hover:underline flex items-center gap-0.5"
                                    title="Open directly in new tab"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
