// src/features/dashboard/components/DonateTab.tsx
import { useState, useEffect, useCallback } from 'react';
import { ccc } from '@ckb-ccc/connector-react';

// Fallback rate used only until Coinbase responds (or if the request fails).
const FALLBACK_CKB_RATE = 0.0200;
const COINBASE_SPOT_URL = 'https://api.coinbase.com/v2/prices/CKB-USD/spot';

const DEPOSIT_ADDRESS = 'ckb1qzdcr9un5ezx8tkh03s46m9jymh22jruelq8svzr5krj2nx69dhjvqgjnwwhj6rdh5x73h663l9zdnxpntqzu5enqqj48cah';

// 1 CKB = 10^8 shannons
const SHANNONS_PER_CKB = 100_000_000n;

interface DonorRow {
    id: string;
    handle: string;
    isVerified?: boolean;
    initials: string;
    amountCkb: number;
    txHash: string;
    timeAgo: string;
    message: string;
    color: string;
}

const INITIAL_BACKERS: DonorRow[] = [];

export default function DonateTab() {
    // In this version of @ckb-ccc/connector-react the context exposes:
    //   { isOpen, open, close, disconnect, setClient, client, wallet?, signerInfo? }
    // The live signer lives on `signerInfo.signer` — NOT on `wallet`.
    const { open, wallet, signerInfo, client } = ccc.useCcc();

    const signer: ccc.Signer | undefined = signerInfo?.signer;
    const isConnected = !!signer;
    const walletName = wallet?.name;

    // ── Live CKB/USD rate from Coinbase ────────────────────────────────
    const [ckbRate, setCkbRate] = useState<number>(FALLBACK_CKB_RATE);
    const [rateStatus, setRateStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
    const [rateUpdatedAt, setRateUpdatedAt] = useState<Date | null>(null);

    const fetchRate = useCallback(async () => {
        try {
            setRateStatus((prev) => (prev === 'live' ? 'live' : 'loading'));
            const res = await fetch(COINBASE_SPOT_URL, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`Coinbase responded ${res.status}`);
            const json: { data?: { amount?: string } } = await res.json();
            const amount = parseFloat(json?.data?.amount ?? '');
            if (!Number.isFinite(amount) || amount <= 0) {
                throw new Error('Invalid rate payload');
            }
            setCkbRate(amount);
            setRateUpdatedAt(new Date());
            setRateStatus('live');
        } catch (err) {
            console.warn('Failed to fetch CKB rate from Coinbase, using fallback.', err);
            setRateStatus('fallback');
        }
    }, []);

    useEffect(() => {
        void fetchRate();
        // Refresh every 60s while the tab is open
        const id = setInterval(() => void fetchRate(), 60_000);
        return () => clearInterval(id);
    }, [fetchRate]);

    // Keep USD value in sync whenever the rate changes
    useEffect(() => {
        setUsdAmount((ckbAmount * ckbRate).toFixed(2));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ckbRate]);

    const [donationMode, setDonationMode] = useState<'onetime' | 'monthly'>('onetime');
    const [ckbAmount, setCkbAmount] = useState<number>(1000);
    const [usdAmount, setUsdAmount] = useState<string>((1000 * FALLBACK_CKB_RATE).toFixed(2));
    const [donorHandle, setDonorHandle] = useState('');
    const [donorMsg, setDonorMsg] = useState('');
    const [copied, setCopied] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleSetAmount = (amount: number) => {
        setCkbAmount(amount);
        setUsdAmount((amount * ckbRate).toFixed(2));
    };

    const handleCkbChange = (val: string) => {
        const num = parseFloat(val) || 0;
        setCkbAmount(num);
        setUsdAmount((num * ckbRate).toFixed(2));
    };

    const handleUsdChange = (val: string) => {
        const num = parseFloat(val) || 0;
        setUsdAmount(val);
        const ckb = Math.round(num / ckbRate);
        setCkbAmount(ckb);
    };

    const copyAddress = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(DEPOSIT_ADDRESS).then(() => {
                setCopied(true);
                showToast('Deposit address copied to clipboard');
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const triggerWeb3Donation = async () => {
        // 1. Wallet must be connected
        if (!signer) {
            showToast('Opening wallet connect — please pick a CKB wallet.');
            open();
            return;
        }

        // 2. Re-verify the signer is still connected (it can go stale)
        try {
            if (!(await signer.isConnected())) {
                showToast('Wallet disconnected. Please reconnect.');
                open();
                return;
            }
        } catch (err) {
            console.error('isConnected check failed', err);
            showToast('Could not verify wallet connection.');
            return;
        }

        // 3. Validate amount
        if (!ckbAmount || ckbAmount < 61) {
            showToast('Please enter at least 61 CKB (cell base capacity).');
            return;
        }

        // 4. Verify the wallet is on CKB Mainnet.
        try {
            const addrObj = await signer.getRecommendedAddressObj();
            const isMainnet = addrObj.prefix === 'ckb';

            if (!isMainnet) {
                showToast('Please switch your wallet to CKB Mainnet to donate.');
                return;
            }
        } catch (err) {
            console.error('Network check failed', err);
            showToast('Could not verify wallet network. Please try again.');
            return;
        }

        // 5. Read the connected address
        let fromAddress: string;
        try {
            fromAddress = await signer.getRecommendedAddress();
        } catch (err) {
            console.error('Failed to get signer address', err);
            showToast('Could not read your wallet address.');
            return;
        }

        if (!fromAddress) {
            showToast('Wallet returned an empty address.');
            return;
        }

        setIsSending(true);
        try {
            // 6. Resolve the deposit lock script on the signer's network.
            const { script: toLock } = await ccc.Address.fromString(
                DEPOSIT_ADDRESS,
                signer.client,
            );

            // 7. Optional on-chain message.
            const message = [
                donorHandle ? `@${donorHandle}` : '',
                donorMsg,
            ]
                .filter(Boolean)
                .join(' — ');
            const messageBytes = message
                ? new TextEncoder().encode(message)
                : new Uint8Array();

            // 8. Amount in shannons.
            const amountShannons = BigInt(Math.round(ckbAmount)) * SHANNONS_PER_CKB;

            // 9. Build the transfer tx.
            const tx = ccc.Transaction.from({
                outputs: [
                    {
                        lock: toLock,
                        capacity: amountShannons,
                    },
                ],
                outputsData: [messageBytes],
            });

            // 10. Complete inputs + fee using the signer.
            await tx.completeInputsByCapacity(signer);
            await tx.completeFeeBy(signer, 1000);

            // 11. Sign with the connected wallet.
            const signedTx = await signer.signTransaction(tx);

            // 12. Broadcast via the signer's client.
            const txHash = await signer.client.sendTransaction(signedTx);

            showToast(
                `Donation sent! Tx: ${txHash.slice(0, 10)}…${txHash.slice(-6)}`,
            );
        } catch (err: any) {
            console.error('Donation failed', err);
            const msg =
                err?.message?.includes('User rejected') ||
                    err?.message?.includes('rejected')
                    ? 'Transaction rejected in wallet.'
                    : err?.message || 'Donation failed. Please try again.';
            showToast(msg);
        } finally {
            setIsSending(false);
        }
    };

    // Pretty-print the live rate with more precision for small numbers
    const rateDisplay = ckbRate < 0.01
        ? ckbRate.toFixed(6)
        : ckbRate.toFixed(4);

    return (
        <div className="flex flex-col w-full min-h-screen bg-surface font-body-md text-on-surface antialiased">
            <div className="w-full max-w-[1440px] mx-auto px-space-md lg:px-space-xl py-space-lg flex flex-col gap-space-xl">
                {/* Hero Header & Value Proposition */}
                <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg lg:p-space-xl border border-outline-variant/30">
                    <div className="absolute -right-20 -top-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute right-1/3 -bottom-24 w-64 h-64 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
                        <div className="max-w-3xl flex flex-col gap-space-sm">
                            <div className="inline-flex items-center gap-2 self-start px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                                <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                                    Public Goods Infrastructure
                                </span>
                                <span className="text-outline-variant">•</span>
                                <span className="font-code-sm text-code-sm text-on-surface-variant">RISC-V VM Tooling</span>
                            </div>
                            <h1 className="font-headline-xl text-headline-xl text-on-surface font-semibold tracking-tight">
                                Support Corven IDE Development
                            </h1>
                            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
                                Corven is 100% open-source tooling built for the Nervos CKB developer ecosystem. Every contribution directly funds devnet nodes, cloud runner containers, and contract debugger maintenance.
                            </p>
                        </div>

                        <div className="flex items-center gap-space-md flex-shrink-0">
                            <div className="px-space-md py-space-sm bg-surface-container rounded-lg shadow-sm flex items-center gap-space-sm border border-outline-variant/30">
                                <span className="material-symbols-outlined text-secondary text-[22px]">currency_exchange</span>
                                <div className="flex flex-col">
                                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-1.5">
                                        Live Oracle Rate
                                        <span
                                            className={`inline-block w-1.5 h-1.5 rounded-full ${rateStatus === 'live'
                                                ? 'bg-primary animate-pulse'
                                                : rateStatus === 'loading'
                                                    ? 'bg-secondary animate-pulse'
                                                    : 'bg-outline-variant'
                                                }`}
                                            title={
                                                rateStatus === 'live'
                                                    ? 'Live from Coinbase'
                                                    : rateStatus === 'loading'
                                                        ? 'Fetching…'
                                                        : 'Fallback rate'
                                            }
                                        />
                                    </span>
                                    <span className="font-code-md text-code-md text-on-surface font-medium">
                                        1 CKB = ${rateDisplay} USD
                                    </span>
                                    <span className="font-code-sm text-code-sm text-on-surface-variant">
                                        {rateStatus === 'live'
                                            ? 'Source: Coinbase Spot'
                                            : rateStatus === 'loading'
                                                ? 'Fetching Coinbase…'
                                                : 'Fallback rate (Coinbase unreachable)'}
                                        {rateUpdatedAt && rateStatus === 'live' && (
                                            <> · {rateUpdatedAt.toLocaleTimeString()}</>
                                        )}
                                    </span>
                                </div>
                            </div>
                            <a
                                className="px-space-md py-space-sm bg-surface-container hover:bg-surface-bright rounded-lg text-on-surface font-body-sm text-body-sm transition-colors flex items-center gap-1.5 shadow-sm border border-outline-variant/30"
                                href="#backer-history"
                            >
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                <span>View Ledger</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Live Metric Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
                    {/* Stat 1 */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm relative overflow-hidden group border border-outline-variant/30">
                        <div className="flex items-center justify-between mb-space-sm">
                            <span className="font-label-md text-label-md text-on-surface-variant">Total Donated</span>
                            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-[18px]">savings</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="font-headline-lg text-headline-lg font-semibold text-on-surface font-code-lg">0</span>
                                <span className="font-label-md text-label-md text-primary font-code-sm">CKB</span>
                            </div>
                            <span className="font-code-sm text-code-sm text-on-surface-variant mt-0.5">≈ $0.00 USD</span>
                        </div>
                        <div className="w-full bg-surface-container h-1 rounded-full mt-space-md overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                    </div>

                    {/* Stat 2 */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm group border border-outline-variant/30">
                        <div className="flex items-center justify-between mb-space-sm">
                            <span className="font-label-md text-label-md text-on-surface-variant">Active Donors</span>
                            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                                <span className="material-symbols-outlined text-[18px]">group</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="font-headline-lg text-headline-lg font-semibold text-on-surface font-code-lg">0</span>
                                <span className="font-label-md text-label-md text-secondary font-code-sm">Supporters</span>
                            </div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Developers & Protocol Teams</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-space-md font-code-sm text-code-sm text-primary">
                            <span className="material-symbols-outlined text-[14px]">trending_up</span>
                            <span>No donations yet</span>
                        </div>
                    </div>

                    {/* Stat 3 */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm group border border-outline-variant/30">
                        <div className="flex items-center justify-between mb-space-sm">
                            <span className="font-label-md text-label-md text-on-surface-variant">Monthly Hosting Goal</span>
                            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-surface-tint">
                                <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="font-headline-lg text-headline-lg font-semibold text-on-surface font-code-lg">0%</span>
                                <span className="font-body-sm text-body-sm text-on-surface-variant">funded</span>
                            </div>
                            <span className="font-code-sm text-code-sm text-on-surface-variant mt-0.5">0 / 150,000 CKB Target</span>
                        </div>
                        <div className="w-full bg-surface-container h-1 rounded-full mt-space-md overflow-hidden">
                            <div className="bg-surface-tint h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                    </div>

                    {/* Stat 4 */}
                    <div className="p-space-lg rounded-xl bg-surface-container-low flex flex-col justify-between shadow-sm group border border-outline-variant/30">
                        <div className="flex items-center justify-between mb-space-sm">
                            <span className="font-label-md text-label-md text-on-surface-variant">Average Contribution</span>
                            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                                <span className="material-symbols-outlined text-[18px]">data_thresholding</span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="font-headline-lg text-headline-lg font-semibold text-on-surface font-code-lg">0</span>
                                <span className="font-label-md text-label-md text-tertiary font-code-sm">CKB</span>
                            </div>
                            <span className="font-code-sm text-code-sm text-on-surface-variant mt-0.5">≈ $0.00 USD median</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-space-md font-code-sm text-code-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            <span>Zero Platform Commission</span>
                        </div>
                    </div>
                </div>

                {/* Main Section: Donation Engine + Sidebars */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                    {/* Interactive Donation Core (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-space-lg">
                        {/* Interactive Widget Card */}
                        <div className="bg-surface-container-low rounded-xl p-space-lg lg:p-space-xl shadow-md flex flex-col gap-space-lg border border-outline-variant/30">
                            {/* Tab Navigation (One-time vs Monthly) */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                                <div className="inline-flex p-1 bg-surface-container rounded-lg border border-outline-variant/20">
                                    <button
                                        onClick={() => setDonationMode('onetime')}
                                        className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm font-medium transition-all flex items-center gap-1.5 ${donationMode === 'onetime'
                                            ? 'bg-surface-bright text-on-surface shadow-sm'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                                        <span>One-time Donation</span>
                                    </button>
                                    <button
                                        onClick={() => setDonationMode('monthly')}
                                        className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm transition-all flex items-center gap-1.5 ${donationMode === 'monthly'
                                            ? 'bg-surface-bright text-on-surface shadow-sm font-medium'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
                                        <span>Monthly Builder Sponsorship</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-code-sm bg-primary/20 text-primary">
                                            NFT Perk
                                        </span>
                                    </button>
                                </div>
                                <span className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-outline-variant'}`}></span>
                                    {isConnected ? `Connected${walletName ? ` · ${walletName}` : ''}` : 'No Wallet Connected'}
                                </span>
                            </div>

                            {/* Quick Preset Pills */}
                            <div className="flex flex-col gap-space-xs">
                                <label className="font-label-md text-label-md text-on-surface-variant">Select Amount (CKB)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
                                    {[250, 1000, 5000, 25000].map((amt) => {
                                        const isSelected = ckbAmount === amt;
                                        const usd = (amt * ckbRate).toFixed(2);
                                        return (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => handleSetAmount(amt)}
                                                className={`px-space-md py-3 rounded-lg text-left flex flex-col transition-all border ${isSelected
                                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                                    : 'bg-surface-container hover:bg-surface-bright border-transparent text-on-surface'
                                                    }`}
                                            >
                                                <span
                                                    className={`font-headline-sm text-headline-sm font-semibold font-code-md ${isSelected ? 'text-primary' : 'text-on-surface'
                                                        }`}
                                                >
                                                    {amt.toLocaleString()} CKB
                                                </span>
                                                <span
                                                    className={`font-code-sm text-code-sm ${isSelected ? 'text-primary/80' : 'text-on-surface-variant'
                                                        }`}
                                                >
                                                    ≈ ${usd} USD
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Dual Currency Calculator */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md bg-surface-container p-space-md rounded-xl border border-outline-variant/30">
                                <div className="flex flex-col gap-space-xs">
                                    <label className="font-label-md text-label-md text-on-surface-variant flex items-center justify-between" htmlFor="ckb-input">
                                        <span>Custom CKB Amount</span>
                                        <span className="font-code-sm text-code-sm text-primary">Min: 61 CKB (Cell Base)</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            id="ckb-input"
                                            type="number"
                                            value={ckbAmount || ''}
                                            onChange={(e) => handleCkbChange(e.target.value)}
                                            min={61}
                                            step={10}
                                            className="w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-on-surface font-code-md text-code-md border border-outline-variant/20 focus:outline-none focus:bg-surface-container-lowest focus:border-primary transition-colors pr-14"
                                        />
                                        <span className="absolute right-3 font-code-sm text-code-sm text-primary font-medium pointer-events-none">
                                            CKB
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-space-xs">
                                    <label className="font-label-md text-label-md text-on-surface-variant flex items-center justify-between" htmlFor="usd-input">
                                        <span>Equivalent USD Value</span>
                                        <span className="font-code-sm text-code-sm text-on-surface-variant">
                                            @ ${rateDisplay}
                                        </span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            id="usd-input"
                                            type="number"
                                            value={usdAmount}
                                            onChange={(e) => handleUsdChange(e.target.value)}
                                            min={1.22}
                                            step={1}
                                            className="w-full bg-surface-container-low px-space-md py-2.5 rounded-lg text-on-surface font-code-md text-code-md border border-outline-variant/20 focus:outline-none focus:bg-surface-container-lowest focus:border-secondary transition-colors pr-14"
                                        />
                                        <span className="absolute right-3 font-code-sm text-code-sm text-on-surface-variant font-medium pointer-events-none">
                                            USD
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Donor Public Note / Handle */}
                            <div className="flex flex-col gap-space-xs">
                                <label className="font-label-md text-label-md text-on-surface-variant flex items-center justify-between" htmlFor="donor-handle">
                                    <span>Public Attribution & Message (Optional)</span>
                                    <span className="font-code-sm text-code-sm text-on-surface-variant">Displayed on-chain & IDE splash</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                                    <input
                                        id="donor-handle"
                                        value={donorHandle}
                                        onChange={(e) => setDonorHandle(e.target.value)}
                                        placeholder="Handle or .bit alias"
                                        type="text"
                                        className="w-full bg-surface-container px-space-md py-2.5 rounded-lg text-on-surface font-code-md text-code-md border border-outline-variant/20 focus:outline-none focus:bg-surface-bright transition-colors"
                                    />
                                    <input
                                        id="donor-msg"
                                        value={donorMsg}
                                        onChange={(e) => setDonorMsg(e.target.value)}
                                        placeholder="e.g. Keep up the RISC-V debugger!"
                                        type="text"
                                        className="sm:col-span-2 w-full bg-surface-container px-space-md py-2.5 rounded-lg text-on-surface font-body-sm text-body-sm border border-outline-variant/20 focus:outline-none focus:bg-surface-bright transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Web3 Wallet Quick CTA */}
                            <div className="flex flex-col sm:flex-row items-center gap-space-md pt-space-xs">
                                <button
                                    onClick={triggerWeb3Donation}
                                    disabled={isSending}
                                    type="button"
                                    className="w-full sm:flex-1 py-3 px-space-lg rounded-lg bg-primary hover:bg-surface-tint text-on-primary font-headline-sm text-headline-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.008] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {isSending ? 'hourglass_top' : 'account_balance_wallet'}
                                    </span>
                                    <span>
                                        {isSending
                                            ? 'Awaiting signature…'
                                            : isConnected
                                                ? donationMode === 'monthly'
                                                    ? `Sponsor ${ckbAmount.toLocaleString()} CKB / Month`
                                                    : `Donate ${ckbAmount.toLocaleString()} CKB`
                                                : 'Connect Wallet to Donate'}
                                    </span>
                                </button>
                                <div className="flex items-center gap-2 text-on-surface-variant font-code-sm text-code-sm">
                                    <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                                    <span>Hardware & Passkey Native</span>
                                </div>
                            </div>
                        </div>

                        {/* Direct CKB Deposit Address card & QR Code */}
                        <div className="bg-surface-container-low rounded-xl p-space-lg lg:p-space-xl shadow-md flex flex-col md:flex-row gap-space-lg items-center border border-outline-variant/30">
                            {/* High-Contrast SVG QR Code */}
                            <div className="p-3 bg-surface-container rounded-xl flex-shrink-0 flex flex-col items-center justify-center border border-outline-variant/20">
                                <svg className="w-36 h-36" fill="none" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
                                    <rect fill="#0a0e13" height="140" rx="8" width="140"></rect>
                                    <rect fill="#4edea3" height="32" rx="4" width="32" x="12" y="12"></rect>
                                    <rect fill="#0a0e13" height="20" rx="2" width="20" x="18" y="18"></rect>
                                    <rect fill="#4edea3" height="10" rx="1" width="10" x="23" y="23"></rect>
                                    <rect fill="#4edea3" height="32" rx="4" width="32" x="96" y="12"></rect>
                                    <rect fill="#0a0e13" height="20" rx="2" width="20" x="102" y="18"></rect>
                                    <rect fill="#4edea3" height="10" rx="1" width="10" x="107" y="23"></rect>
                                    <rect fill="#4edea3" height="32" rx="4" width="32" x="12" y="96"></rect>
                                    <rect fill="#0a0e13" height="20" rx="2" width="20" x="18" y="102"></rect>
                                    <rect fill="#4edea3" height="10" rx="1" width="10" x="23" y="107"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="8" x="52" y="14"></rect>
                                    <rect fill="#4cd7f6" height="14" rx="1" width="8" x="68" y="14"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="8" x="80" y="22"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="12" x="52" y="30"></rect>
                                    <rect fill="#4cd7f6" height="12" rx="1" width="8" x="14" y="52"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="14" x="30" y="56"></rect>
                                    <rect fill="#4edea3" height="8" rx="1" width="8" x="52" y="52"></rect>
                                    <rect fill="#4edea3" height="14" rx="1" width="14" x="66" y="52"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="8" x="88" y="52"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="14" x="104" y="56"></rect>
                                    <rect fill="#4cd7f6" height="14" rx="1" width="6" x="124" y="52"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="16" x="52" y="74"></rect>
                                    <rect fill="#4edea3" height="14" rx="1" width="8" x="76" y="74"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="8" x="92" y="70"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="18" x="110" y="74"></rect>
                                    <rect fill="#4edea3" height="14" rx="1" width="8" x="52" y="96"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="14" x="68" y="96"></rect>
                                    <rect fill="#4cd7f6" height="12" rx="1" width="8" x="90" y="96"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="8" x="106" y="96"></rect>
                                    <rect fill="#e0e2ea" height="14" rx="1" width="8" x="122" y="96"></rect>
                                    <rect fill="#e0e2ea" height="8" rx="1" width="14" x="60" y="118"></rect>
                                    <rect fill="#4edea3" height="8" rx="1" width="10" x="82" y="118"></rect>
                                    <rect fill="#4edea3" height="12" rx="1" width="12" x="100" y="114"></rect>
                                </svg>
                                <span className="font-code-sm text-code-sm text-on-surface-variant mt-2">CKB Native Address</span>
                            </div>

                            {/* Address Info & Direct Transfer Details */}
                            <div className="flex-1 flex flex-col gap-space-sm min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-label-md text-label-md font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-primary">qr_code_scanner</span>
                                        Direct CKB Deposit Address
                                    </span>
                                    <span className="font-code-sm text-code-sm text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                                        Mainnet Secp256k1
                                    </span>
                                </div>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                    Transfer funds directly from Neuron, JoyID, Portal Wallet, or any CKB CLI signer. Transactions are verified and posted to the community board within two block cycles.
                                </p>
                                <div className="bg-surface-container rounded-lg p-space-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm border border-outline-variant/30">
                                    <code className="font-code-sm text-code-sm text-on-surface truncate select-all px-1">
                                        {DEPOSIT_ADDRESS}
                                    </code>
                                    <button
                                        onClick={copyAddress}
                                        className="flex-shrink-0 px-space-md py-1.5 bg-surface-bright hover:bg-surface-container-highest text-on-surface rounded font-code-sm text-code-sm flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/30"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                        <span>{copied ? 'Copied!' : 'Copy Address'}</span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-space-md pt-1">
                                    <span className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px] text-secondary">memory</span>
                                        Cell Capacity: Auto-reclaimed
                                    </span>
                                    <span className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px] text-primary">speed</span>
                                        Instant Mempool Indexing
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What Your Donation Funds Sidebar (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-space-md">

                        {/* Ecosystem Allocation Breakdown */}
                        <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm border border-outline-variant/30">
                            <span className="font-label-md text-label-md font-semibold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-secondary">pie_chart</span>
                                Monthly Expense Transparency
                            </span>
                            <div className="flex flex-col gap-2 font-code-sm text-code-sm">
                                <div className="flex items-center justify-between text-on-surface-variant">
                                    <span>Cloud Hosting payaments</span>
                                </div>
                                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full rounded-full" style={{ width: '0%' }}></div>
                                </div>

                                <div className="flex items-center justify-between text-on-surface-variant pt-1">
                                    <span>New features implementation</span>
                                </div>
                                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-secondary h-full rounded-full" style={{ width: '0%' }}></div>
                                </div>

                                <div className="flex items-center justify-between text-on-surface-variant pt-1">
                                    <span>Community Onboarding and Events</span>
                                </div>
                                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-tertiary h-full rounded-full" style={{ width: '0%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Backers & Transparency On-chain Table */}
                <div className="bg-surface-container-low rounded-xl shadow-md p-space-lg flex flex-col gap-space-md border border-outline-variant/30" id="backer-history">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
                        <div className="flex flex-col">
                            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
                                Recent Backers & On-chain Transparency
                            </h2>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                                Live verifiable stream of Nervos CKB cells directed to the Corven open-source treasury lock script.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded bg-surface-container font-code-sm text-code-sm text-primary flex items-center gap-1.5 border border-outline-variant/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Block #—
                            </span>
                            <button
                                onClick={() => showToast('Syncing latest blocks from Nervos Devnet RPC...')}
                                className="p-1.5 rounded bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface transition-colors border border-outline-variant/20"
                                title="Refresh Ledger"
                            >
                                <span className="material-symbols-outlined text-[16px]">refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left font-body-sm text-body-sm">
                            <thead>
                                <tr className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider bg-surface-container/60">
                                    <th className="py-3 px-space-md rounded-l-lg">Donor / Handle</th>
                                    <th className="py-3 px-space-md">Amount (CKB)</th>
                                    <th className="py-3 px-space-md">USD Value</th>
                                    <th className="py-3 px-space-md">Tx Hash</th>
                                    <th className="py-3 px-space-md">Time</th>
                                    <th className="py-3 px-space-md rounded-r-lg">Message</th>
                                </tr>
                            </thead>
                            <tbody className="text-on-surface divide-y-0">
                                {INITIAL_BACKERS.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-on-surface-variant font-body-sm">
                                            No recorded donations yet. Be the first backer to support Corven IDE!
                                        </td>
                                    </tr>
                                ) : (
                                    INITIAL_BACKERS.map((row) => (
                                        <tr key={row.id} className="hover:bg-surface-container/40 transition-colors">
                                            <td className="py-3 px-space-md flex items-center gap-2 font-code-md text-code-md">
                                                <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${row.color}`}>
                                                    {row.initials}
                                                </div>
                                                <span className={`font-medium ${row.isVerified ? 'text-primary' : ''}`}>
                                                    {row.handle}
                                                </span>
                                                {row.isVerified && (
                                                    <span className="material-symbols-outlined text-secondary text-[14px]" title="Ecosystem Partner">
                                                        verified
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-space-md font-code-md text-code-md font-semibold text-on-surface">
                                                {row.amountCkb.toLocaleString()} CKB
                                            </td>
                                            <td className="py-3 px-space-md font-code-sm text-code-sm text-on-surface-variant">
                                                ${(row.amountCkb * ckbRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-space-md font-code-sm text-code-sm">
                                                <a
                                                    className="text-secondary hover:underline inline-flex items-center gap-1"
                                                    href={`https://pudge.explorer.nervos.org/transaction/${row.txHash}`}
                                                    target="_blank"
                                                    rel="noreferrer noopener"
                                                >
                                                    <span>{`${row.txHash.slice(0, 6)}...${row.txHash.slice(-4)}`}</span>
                                                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                                </a>
                                            </td>
                                            <td className="py-3 px-space-md font-code-sm text-code-sm text-on-surface-variant">
                                                {row.timeAgo}
                                            </td>
                                            <td className="py-3 px-space-md text-on-surface-variant truncate max-w-xs">
                                                {row.message}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Toast Notification Container */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-space-md py-3 rounded-lg bg-surface-container-highest text-on-surface shadow-xl border border-outline-variant/40 animate-fade-in">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <span className="font-body-sm text-body-sm font-medium">{toastMessage}</span>
                </div>
            )}
        </div>
    );
}