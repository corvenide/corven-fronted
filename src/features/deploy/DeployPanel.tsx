// src/features/deploy/DeployPanel.tsx
//
// Deploy built contracts from the IDE.
//   Devnet:  one click; the workspace devnet's test account pays (offckb).
//   Testnet: built and signed in the user's wallet (CCC), then recorded.
//            Google accounts without a connected wallet use their Corven
//            testnet wallet (signed on the server, see features/wallet).
// Upgradable deploys use a Type ID, so redeploying keeps the code hash.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ccc } from '@ckb-ccc/connector-react';
import {
    AlertTriangle,
    Check,
    ChevronDown,
    ChevronRight,
    Copy,
    ExternalLink,
    Loader2,
    Play,
    RefreshCw,
    Rocket,
    Wallet,
} from 'lucide-react';

import { workspaceApi } from '../workspace/api/workspace.api';
import { workspaceKeys } from '../workspace/queries/workspace.keys';
import { base64ToBytes, deployApi, type ContractDeployment, type DeployNetwork } from './deploy.api';
import { deployFromWallet, estimateCapacity, formatCkb } from './wallet-deploy';
import { useCorvenTestnetSigner } from '../wallet/corven-signer';

const TESTNET_EXPLORER = 'https://testnet.explorer.nervos.org';
const TESTNET_FAUCET = 'https://faucet.nervos.org/';

const NETWORK_LABEL: Record<DeployNetwork, string> = { DEVNET: 'Devnet', TESTNET: 'Testnet', MAINNET: 'Mainnet' };
const NETWORK_BADGE: Record<DeployNetwork, string> = {
    DEVNET: 'text-on-surface-variant',
    TESTNET: 'text-secondary',
    MAINNET: 'text-primary',
};

const keys = {
    contracts: (id: string) => [...workspaceKeys.detail(id), 'contracts'] as const,
    deployments: (id: string) => [...workspaceKeys.detail(id), 'deployments'] as const,
};

function short(hash: string, head = 8, tail = 6) {
    return hash.length > head + tail + 2 ? `${hash.slice(0, head + 2)}…${hash.slice(-tail)}` : hash;
}

function timeAgo(iso: string) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatBytes(bytes: number) {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function camel(name: string) {
    return name.replace(/[-_]+(\w)/g, (_, c: string) => c.toUpperCase());
}

/** Script + cell dep, ready to paste into a CCC transaction. */
export function cccSnippet(d: ContractDeployment) {
    const id = camel(d.contractName);
    return [
        `// ${d.contractName} on ${NETWORK_LABEL[d.network].toLowerCase()}`,
        `const ${id}Script = ccc.Script.from({`,
        `  codeHash: "${d.codeHash}",`,
        `  hashType: "${d.hashType}",`,
        `  args: "0x", // your script args`,
        `});`,
        ``,
        `tx.addCellDeps({`,
        `  outPoint: { txHash: "${d.txHash}", index: ${d.outputIndex} },`,
        `  depType: "code",`,
        `});`,
    ].join('\n');
}

function CopyButton({ value, label, children }: { value: string; label: string; children?: ReactNode }) {
    const [copied, setCopied] = useState(false);

    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={async (event) => {
                event.stopPropagation();
                try {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1400);
                } catch {
                    /* clipboard blocked */
                }
            }}
            className="inline-flex items-center gap-1 rounded px-1 text-gray-500 hover:bg-[#21262d] hover:text-gray-200"
        >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {children}
        </button>
    );
}

function Field({ label, value, copy, href }: { label: string; value: string; copy?: boolean; href?: string }) {
    return (
        <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2 py-0.5 font-mono text-[10.5px]">
            <span className="text-on-surface-variant/70 uppercase text-[9.5px]">{label}</span>
            <span className="flex min-w-0 items-center gap-1 text-on-surface">
                {href ? (
                    <a href={href} target="_blank" rel="noreferrer noopener" className="truncate text-secondary hover:underline">
                        {value}
                    </a>
                ) : (
                    <span className="truncate">{value}</span>
                )}
                {copy && <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />}
            </span>
        </div>
    );
}

function DeploymentRow({ deployment, open, onToggle }: { deployment: ContractDeployment; open: boolean; onToggle: () => void }) {
    const explorerTx = deployment.network === 'TESTNET' ? `${TESTNET_EXPLORER}/transaction/${deployment.txHash}` : undefined;

    return (
        <li className="border-b border-outline-variant/20 last:border-b-0 font-mono text-[10.5px]">
            <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-container">
                {open ? <ChevronDown className="h-3 w-3 shrink-0 text-on-surface-variant" /> : <ChevronRight className="h-3 w-3 shrink-0 text-on-surface-variant" />}
                <span className="min-w-0 truncate font-medium text-on-surface">{deployment.contractName}</span>
                <span className="text-on-surface-variant/40">·</span>
                <span className={`shrink-0 text-[10px] ${NETWORK_BADGE[deployment.network]}`}>{NETWORK_LABEL[deployment.network]}</span>
                {deployment.upgradeOfId && <span className="shrink-0 text-[10px] text-secondary">upgrade</span>}
                {deployment.typeId && !deployment.upgradeOfId && <span className="shrink-0 text-[10px] text-on-surface-variant/60">upgradable</span>}
                <span className="ml-auto shrink-0 text-[10px] text-on-surface-variant">{short(deployment.codeHash, 6, 4)}</span>
                <span className="w-14 shrink-0 text-right text-[9.5px] text-on-surface-variant/60">{timeAgo(deployment.createdAt)}</span>
            </button>

            {open && (
                <div className="space-y-2 px-3 pb-3 pl-7 text-[10.5px]">
                    <div>
                        <Field label="Code hash" value={deployment.codeHash} copy />
                        <Field label="Hash type" value={deployment.hashType} />
                        <Field label="Tx hash" value={deployment.txHash} copy href={explorerTx} />
                        <Field label="Cell dep" value={`${short(deployment.txHash)} · index ${deployment.outputIndex} · code`} />
                        {deployment.typeId && <Field label="Type ID" value={deployment.typeId} copy />}
                        <Field label="Size" value={`${formatBytes(deployment.sizeBytes)} · ${formatCkb(deployment.capacity)} CKB locked`} />
                        {deployment.deployerAddress && <Field label="Owner" value={deployment.deployerAddress} copy />}
                    </div>
                    <div className="overflow-hidden rounded border border-outline-variant/30">
                        <div className="flex h-6 items-center justify-between border-b border-outline-variant/20 bg-surface-container px-2">
                            <span className="text-[9px] uppercase tracking-wide text-on-surface-variant font-mono">Use with CCC</span>
                            <CopyButton value={cccSnippet(deployment)} label="Copy snippet">
                                <span className="text-[10px]">Copy</span>
                            </CopyButton>
                        </div>
                        <pre className="overflow-x-auto bg-surface-container-lowest p-2 font-mono text-[10px] leading-relaxed text-on-surface">{cccSnippet(deployment)}</pre>
                    </div>
                    {deployment.typeId && (
                        <p className="text-[10px] text-on-surface-variant/70">
                            Upgradable: redeploying keeps this code hash. The old cell dep is spent on upgrade.
                        </p>
                    )}
                </div>
            )}
        </li>
    );
}

export function DeployPanel({ workspaceId, active }: { workspaceId: string; active: boolean }) {
    const queryClient = useQueryClient();
    const { open: openWallet, setClient } = ccc.useCcc();
    const connectedSigner = ccc.useSigner();
    const corvenSigner = useCorvenTestnetSigner();
    // A connected wallet wins; otherwise a Google account's Corven wallet.
    const signer = connectedSigner ?? corvenSigner ?? undefined;
    const usingCorvenWallet = !connectedSigner && Boolean(corvenSigner);

    const [network, setNetwork] = useState<'DEVNET' | 'TESTNET'>('DEVNET');
    const [contract, setContract] = useState('');
    const [upgradable, setUpgradable] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [phase, setPhase] = useState<string | null>(null);

    const contracts = useQuery({
        queryKey: keys.contracts(workspaceId),
        queryFn: () => deployApi.contracts(workspaceId),
        enabled: active,
    });

    const deployments = useQuery({
        queryKey: keys.deployments(workspaceId),
        queryFn: () => deployApi.deployments(workspaceId),
        enabled: active,
    });

    const status = useQuery({
        queryKey: workspaceKeys.status(workspaceId),
        queryFn: () => workspaceApi.status(workspaceId),
        enabled: active,
    });

    // Pick up new builds when the tab is opened.
    useEffect(() => {
        if (active) void contracts.refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    useEffect(() => {
        const list = contracts.data ?? [];
        if (list.length && !list.some((c) => c.name === contract)) setContract(list[0].name);
    }, [contracts.data, contract]);

    const selected = contracts.data?.find((c) => c.name === contract);
    const node = status.data?.containers.find((c) => c.type === 'CKB_NODE');
    const devnetState = !node || node.status === 'STOPPED' ? 'off' : node.status === 'RUNNING' ? 'running' : node.status === 'FAILED' ? 'failed' : 'starting';

    // -- Wallet (testnet) ---------------------------------------------------------
    const onTestnet = signer?.client.addressPrefix === 'ckt';

    const wallet = useQuery({
        queryKey: ['wallet', signer ? (usingCorvenWallet ? 'corven' : 'connected') : 'none', signer?.client.addressPrefix],
        queryFn: async () => {
            if (!signer) return null;
            const [address, balance] = await Promise.all([signer.getRecommendedAddress(), signer.getBalance()]);
            return { address, balance: balance.toString() };
        },
        enabled: active && network === 'TESTNET' && Boolean(signer) && onTestnet,
        refetchInterval: network === 'TESTNET' ? 15_000 : false,
    });

    // The newest upgradable deploy of this contract that we can upgrade.
    const previous = useMemo(() => {
        if (!upgradable || !selected) return null;
        return (
            (deployments.data ?? []).find(
                (d) =>
                    d.contractName === selected.name &&
                    d.network === network &&
                    d.typeId &&
                    (network === 'DEVNET' || (d.typeArgs && d.deployerAddress === wallet.data?.address)),
            ) ?? null
        );
    }, [deployments.data, selected, network, upgradable, wallet.data?.address]);

    const estimate = selected ? estimateCapacity(selected.sizeBytes, upgradable) : 0n;
    // An upgrade gets the old cell's capacity back.
    const needed = previous && network === 'TESTNET' ? estimate - BigInt(previous.capacity) + 100_000_000n : estimate + 100_000_000n;
    const insufficient = network === 'TESTNET' && wallet.data ? BigInt(wallet.data.balance) < needed : false;

    const startDevnet = useMutation({
        mutationFn: () => workspaceApi.startDevnet(workspaceId),
        onSuccess: (next) => queryClient.setQueryData(workspaceKeys.status(workspaceId), next),
    });

    // Poll while the devnet starts.
    useEffect(() => {
        if (!active || devnetState !== 'starting') return;
        const timer = window.setInterval(() => void status.refetch(), 3000);
        return () => window.clearInterval(timer);
    }, [active, devnetState, status]);

    const deploy = useMutation({
        mutationFn: async (): Promise<ContractDeployment> => {
            if (!selected) throw new Error('Choose a contract to deploy.');

            if (network === 'DEVNET') {
                setPhase('Deploying and waiting for the block…');
                return deployApi.deployDevnet(workspaceId, selected.name, upgradable);
            }

            if (!signer) throw new Error('Connect a wallet first.');
            if (!onTestnet) throw new Error('Switch your wallet to CKB Testnet first.');

            setPhase('Preparing the transaction…');
            const { base64 } = await deployApi.binary(workspaceId, selected.name);

            setPhase(usingCorvenWallet ? 'Signing with your Corven wallet…' : 'Confirm the transaction in your wallet…');
            const result = await deployFromWallet(signer, {
                data: base64ToBytes(base64),
                upgradable,
                previous: previous?.typeArgs
                    ? { txHash: previous.txHash, outputIndex: previous.outputIndex, typeArgs: previous.typeArgs }
                    : null,
            });

            setPhase('Saving…');
            return deployApi.record(workspaceId, selected.name, result);
        },
        onSuccess: (saved) => {
            queryClient.setQueryData<ContractDeployment[]>(keys.deployments(workspaceId), (list) => [saved, ...(list ?? [])]);
            setExpanded(saved.id);
            void wallet.refetch();
        },
        onSettled: () => setPhase(null),
    });

    // ------------------------------------------------------------------ render
    const canDeploy =
        Boolean(selected) &&
        !deploy.isPending &&
        (network === 'DEVNET' ? devnetState === 'running' : Boolean(signer) && onTestnet && !insufficient);

    const deployLabel = previous ? 'Upgrade' : 'Deploy';

    return (
        <div className="grid h-full min-h-0 grid-cols-[minmax(240px,320px)_minmax(0,1fr)] font-mono text-[10.5px] bg-surface-container-lowest">
            {/* ---------------------------------------------------- Form */}
            <div className="min-h-0 space-y-2.5 overflow-y-auto border-r border-outline-variant/30 p-3 bg-surface-container-low">
                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <label htmlFor="deploy-contract" className="text-[9.5px] font-semibold uppercase tracking-wider text-on-surface-variant/80">
                            Contract
                        </label>
                        <button
                            type="button"
                            onClick={() => void contracts.refetch()}
                            title="Refresh built contracts"
                            aria-label="Refresh built contracts"
                            className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                        >
                            <RefreshCw className={`h-3 w-3 ${contracts.isFetching ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {contracts.isError ? (
                        <p className="text-error">{(contracts.error as Error).message}</p>
                    ) : contracts.data && contracts.data.length === 0 ? (
                        <p className="rounded border border-dashed border-outline-variant/30 px-2.5 py-2 text-on-surface-variant/60">
                            No built contracts. Run a build in the Build tab.
                        </p>
                    ) : (
                        <select
                            id="deploy-contract"
                            value={contract}
                            onChange={(event) => setContract(event.target.value)}
                            className="h-7 w-full rounded border border-outline-variant/30 bg-surface px-2 text-[10.5px] text-on-surface focus:border-secondary focus:outline-none"
                        >
                            {(contracts.data ?? []).map((c) => (
                                <option key={c.name} value={c.name}>
                                    {c.name} · {formatBytes(c.sizeBytes)} · {timeAgo(c.builtAt)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div>
                    <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-on-surface-variant/80">Network</div>
                    <div role="radiogroup" className="grid grid-cols-2 rounded border border-outline-variant/30 p-0.5 bg-surface">
                        {(['DEVNET', 'TESTNET'] as const).map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={network === n}
                                onClick={() => setNetwork(n)}
                                className={`h-6 rounded text-[10px] font-mono transition-colors ${network === n ? 'bg-surface-container-high font-medium text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                            >
                                {NETWORK_LABEL[n]}
                            </button>
                        ))}
                    </div>
                </div>

                <label className="flex cursor-pointer items-start gap-2">
                    <input type="checkbox" checked={upgradable} onChange={(e) => setUpgradable(e.target.checked)} className="mt-0.5 accent-primary" />
                    <span>
                        <span className="text-on-surface">Upgradable (Type ID)</span>
                        <span className="block text-[9.5px] text-on-surface-variant/70">Redeploying preserves code hash.</span>
                    </span>
                </label>

                {/* Network-specific state */}
                {network === 'DEVNET' ? (
                    devnetState === 'running' ? (
                        <p className="text-[10px] text-on-surface-variant">
                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                            Devnet active · test account pays
                        </p>
                    ) : devnetState === 'starting' ? (
                        <p className="flex items-center gap-1.5 text-[10px] text-secondary">
                            <Loader2 className="h-3 w-3 animate-spin" /> Devnet starting…
                        </p>
                    ) : (
                        <div className="flex items-center justify-between gap-2 rounded border border-outline-variant/30 px-2 py-1.5 bg-surface">
                            <span className="text-on-surface-variant">{devnetState === 'failed' ? 'Devnet failed' : 'Devnet offline'}</span>
                            <button
                                type="button"
                                onClick={() => startDevnet.mutate()}
                                disabled={startDevnet.isPending}
                                className="inline-flex h-5 items-center gap-1 rounded bg-surface-container px-2 text-[10px] text-on-surface hover:bg-surface-container-high disabled:opacity-50"
                            >
                                <Play className="h-2.5 w-2.5" /> Start
                            </button>
                        </div>
                    )
                ) : !signer ? (
                    <button
                        type="button"
                        onClick={() => openWallet()}
                        className="flex h-7 w-full items-center justify-center gap-1.5 rounded border border-outline-variant/30 bg-surface text-on-surface hover:bg-surface-container"
                    >
                        <Wallet className="h-3 w-3" /> Connect wallet
                    </button>
                ) : !onTestnet ? (
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-amber-200">
                        Wallet on mainnet.{' '}
                        <button type="button" onClick={() => setClient(new ccc.ClientPublicTestnet())} className="font-medium underline-offset-2 hover:underline">
                            Switch to testnet
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1 rounded border border-outline-variant/30 bg-surface px-2 py-1.5">
                        {usingCorvenWallet && (
                            <div className="flex items-center justify-between gap-2 text-[9.5px] text-on-surface-variant/80">
                                <span>Corven wallet (testnet)</span>
                                <button type="button" onClick={() => openWallet()} className="underline-offset-2 hover:text-on-surface hover:underline">
                                    Use another wallet
                                </button>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-on-surface-variant">{wallet.data ? short(wallet.data.address, 8, 4) : '…'}</span>
                            <span className="shrink-0 text-on-surface">
                                {wallet.data ? `${formatCkb(wallet.data.balance)} CKB` : '—'}
                            </span>
                        </div>
                        {insufficient && (
                            <p className="text-[9.5px] text-amber-300">
                                Low CKB balance.{' '}
                                <a href={TESTNET_FAUCET} target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">
                                    Faucet
                                </a>
                            </p>
                        )}
                    </div>
                )}

                {selected && (
                    <p className="text-[10px] text-on-surface-variant/70">
                        Capacity: <span className="text-on-surface">{formatCkb(estimate)} CKB</span>
                        {previous && network === 'TESTNET' ? ' (old cell returned)' : ''}.
                    </p>
                )}

                <button
                    type="button"
                    onClick={() => deploy.mutate()}
                    disabled={!canDeploy}
                    className="flex h-7 w-full items-center justify-center gap-1.5 rounded bg-primary font-medium text-on-primary transition hover:bg-primary-fixed disabled:bg-surface-container disabled:text-on-surface-variant/50"
                >
                    {deploy.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                    {deploy.isPending ? 'Deploying…' : `${deployLabel} to ${NETWORK_LABEL[network]}`}
                </button>

                {phase && <p className="text-center text-[10px] text-on-surface-variant">{phase}</p>}

                {deploy.isError && (
                    <div className="flex items-start gap-1.5 rounded border border-error/30 bg-error/10 p-2 text-error">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="whitespace-pre-wrap break-words text-[10px]">{(deploy.error as Error).message}</span>
                    </div>
                )}
            </div>

            {/* ---------------------------------------------------- History */}
            <div className="flex min-h-0 flex-col bg-surface-container-lowest">
                <div className="flex h-8 shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface-container px-3">
                    <span className="text-[9.5px] font-semibold uppercase tracking-wider text-on-surface-variant">Deployments</span>
                    <span className="text-[10px] text-on-surface-variant/70">{deployments.data?.length ?? 0}</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {deployments.isLoading ? (
                        <div className="space-y-1.5 p-3">
                            <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-container" />
                            <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-container" />
                        </div>
                    ) : !deployments.data?.length ? (
                        <div className="flex h-full items-center justify-center p-6 text-center text-[11px] text-on-surface-variant/60">
                            Deployed contracts appear here with code hash and cell deps.
                        </div>
                    ) : (
                        <ul>
                            {deployments.data.map((d) => (
                                <DeploymentRow key={d.id} deployment={d} open={expanded === d.id} onToggle={() => setExpanded(expanded === d.id ? null : d.id)} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
