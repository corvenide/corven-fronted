// Overview: usage over time, how people sign in, and the SDK snippet.

import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { connectApi, connectKeys, METHOD_LABEL, type AppStats, type ConnectApp, type StatsDay } from '../connect.api';
import { Card, CopyText, ErrorNote, Loading } from './ui';

type Metric = 'signIns' | 'signUps' | 'codesSent' | 'txSigned';
const METRICS: { key: Metric; label: string }[] = [
    { key: 'signIns', label: 'Sign-ins' },
    { key: 'signUps', label: 'New users' },
    { key: 'codesSent', label: 'Codes sent' },
    { key: 'txSigned', label: 'Transactions signed' },
];

export function OverviewTab({ app }: { app: ConnectApp }) {
    const [days, setDays] = useState(30);
    const [metric, setMetric] = useState<Metric>('signIns');
    const stats = useQuery({ queryKey: connectKeys.stats(app.id, days), queryFn: () => connectApi.stats(app.id, days) });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] font-semibold text-on-surface">Usage</h2>
                <div className="flex rounded-lg border border-outline-variant/40 bg-surface-container-low p-0.5" role="group" aria-label="Period">
                    {[7, 30, 90].map((d) => (
                        <button
                            key={d}
                            type="button"
                            aria-pressed={days === d}
                            onClick={() => setDays(d)}
                            className={`rounded-md px-2.5 py-1 text-[12px] ${days === d ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            {d} days
                        </button>
                    ))}
                </div>
            </div>

            {stats.isLoading ? (
                <Loading />
            ) : stats.error ? (
                <ErrorNote error={stats.error} />
            ) : stats.data ? (
                <>
                    <Tiles stats={stats.data} />
                    <div className="grid gap-5 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-[13px] font-semibold text-on-surface">{METRICS.find((m) => m.key === metric)!.label} per day</h3>
                                <div className="flex flex-wrap gap-1" role="group" aria-label="Metric">
                                    {METRICS.map((m) => (
                                        <button
                                            key={m.key}
                                            type="button"
                                            aria-pressed={metric === m.key}
                                            onClick={() => setMetric(m.key)}
                                            className={`rounded-md border px-2 py-0.5 text-[11.5px] ${metric === m.key ? 'border-primary/40 bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant hover:text-on-surface'}`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <BarChart series={stats.data.series} metric={metric} label={METRICS.find((m) => m.key === metric)!.label} />
                        </Card>
                        <Card>
                            <h3 className="text-[13px] font-semibold text-on-surface">How people sign in</h3>
                            <p className="mt-0.5 text-[11.5px] text-on-surface-variant">Sign-ins and sign-ups, last {days} days</p>
                            <Methods methods={stats.data.methods} />
                        </Card>
                    </div>
                </>
            ) : null}

            <QuickStart app={app} />
        </div>
    );
}

function Tiles({ stats }: { stats: AppStats }) {
    const tiles = [
        { label: 'Total users', value: stats.totals.users },
        { label: `New users · ${stats.days}d`, value: stats.totals.newUsers },
        { label: 'Active users · 7d', value: stats.totals.activeUsers7d },
        { label: `Sign-ins · ${stats.days}d`, value: stats.totals.signIns },
        { label: `Codes sent · ${stats.days}d`, value: stats.totals.codesSent },
        { label: `Transactions · ${stats.days}d`, value: stats.totals.txSigned },
    ];
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {tiles.map((t) => (
                <div key={t.label} className="rounded-xl border border-outline-variant/30 bg-surface-container px-4 py-3">
                    <div className="text-[11px] text-on-surface-variant">{t.label}</div>
                    <div className="mt-1 text-[24px] font-semibold tabular-nums tracking-tight text-on-surface">{t.value.toLocaleString()}</div>
                </div>
            ))}
        </div>
    );
}

/** One series of daily bars with a hover tooltip; values are in the table view for screen readers. */
function BarChart({ series, metric, label }: { series: StatsDay[]; metric: Metric; label: string }) {
    const [hover, setHover] = useState<number | null>(null);
    const values = series.map((d) => d[metric]);
    const max = Math.max(1, ...values);
    const niceMax = max <= 4 ? max : Math.ceil(max / 4) * 4;
    const W = 640;
    const H = 180;
    const pad = { l: 28, r: 6, t: 10, b: 22 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const step = iw / Math.max(1, series.length);
    const bw = Math.max(2, Math.min(18, step - 2));
    const ticks = [0, niceMax / 2, niceMax].map((v) => Math.round(v));
    const total = values.reduce((a, b) => a + b, 0);

    return (
        <div className="relative mt-4">
            {total === 0 && <div className="absolute inset-0 z-10 flex items-center justify-center text-[12.5px] text-on-surface-variant">No {label.toLowerCase()} in this period yet.</div>}
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label} per day`} onMouseLeave={() => setHover(null)}>
                {ticks.map((t) => {
                    const y = pad.t + ih - (t / niceMax) * ih;
                    return (
                        <g key={t}>
                            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--color-outline-variant)" strokeOpacity={t === 0 ? 0.8 : 0.3} strokeWidth={1} />
                            <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={10} fill="var(--color-on-surface-variant)" className="tabular-nums">
                                {t}
                            </text>
                        </g>
                    );
                })}
                {series.map((d, i) => {
                    const v = d[metric];
                    const h = (v / niceMax) * ih;
                    const x = pad.l + i * step + (step - bw) / 2;
                    return (
                        <g key={d.day} onMouseEnter={() => setHover(i)}>
                            <rect x={pad.l + i * step} y={pad.t} width={step} height={ih} fill="transparent" />
                            {v > 0 && <rect x={x} y={pad.t + ih - h} width={bw} height={h} rx={Math.min(4, bw / 2)} fill="var(--color-primary)" opacity={hover === null || hover === i ? 1 : 0.45} />}
                        </g>
                    );
                })}
                {[0, Math.floor((series.length - 1) / 2), series.length - 1].filter((v, i, a) => a.indexOf(v) === i && series[v]).map((i) => (
                    <text key={i} x={pad.l + i * step + step / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-on-surface-variant)">
                        {fmtDay(series[i].day)}
                    </text>
                ))}
            </svg>
            {hover !== null && series[hover] && (
                <div
                    className="pointer-events-none absolute top-0 rounded-lg border border-outline-variant/40 bg-surface-container-highest px-2.5 py-1.5 text-[11.5px] shadow-lg"
                    style={{ left: `clamp(0px, calc(${((pad.l + hover * step + step / 2) / W) * 100}% - 60px), calc(100% - 120px))` }}
                >
                    <div className="text-on-surface-variant">{fmtDay(series[hover].day)}</div>
                    <div className="font-semibold tabular-nums text-on-surface">
                        {series[hover][metric].toLocaleString()} {label.toLowerCase()}
                    </div>
                </div>
            )}
            <table className="sr-only">
                <caption>{label} per day</caption>
                <tbody>
                    {series.map((d) => (
                        <tr key={d.day}>
                            <th>{d.day}</th>
                            <td>{d[metric]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Methods({ methods }: { methods: AppStats['methods'] }) {
    const total = methods.reduce((n, m) => n + m.count, 0);
    if (total === 0) return <p className="mt-6 text-[12.5px] text-on-surface-variant">No sign-ins yet.</p>;
    return (
        <ul className="mt-4 space-y-3">
            {methods.map((m) => {
                const pct = Math.round((m.count / total) * 100);
                return (
                    <li key={m.method}>
                        <div className="flex items-baseline justify-between text-[12.5px]">
                            <span className="text-on-surface">{METHOD_LABEL[m.method] ?? m.method}</span>
                            <span className="tabular-nums text-on-surface-variant">
                                {m.count.toLocaleString()} · {pct}%
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function QuickStart({ app }: { app: ConnectApp }) {
    const install = `npm install @corven/connect-react @ckb-ccc/core${app.loginMethods.includes('WALLET') ? ' @ckb-ccc/ccc' : ''}`;
    const code = `import { CorvenConnectProvider, ConnectButton, useCorvenConnect } from '@corven/connect-react';

export default function App() {
  return (
    <CorvenConnectProvider appId="${app.id}" theme="dark">
      <ConnectButton />
    </CorvenConnectProvider>
  );
}

// Anywhere inside the provider:
// const { user, getSigner } = useCorvenConnect();
// const signer = getSigner('TESTNET'); // a CCC signer`;
    return (
        <Card>
            <h3 className="text-[13px] font-semibold text-on-surface">Quick start</h3>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">
                Add the SDK to a React app served from one of the allowed origins.{' '}
                <Link to="/connect/docs/quickstart" className="text-primary hover:underline">
                    Read the docs
                </Link>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant">
                App id <CopyText value={app.id} />
            </div>
            <div className="mt-3">
                <CopyText value={install} className="w-full justify-between py-2" />
            </div>
            <div className="relative mt-3">
                <pre className="overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-4 font-mono text-[12px] leading-relaxed text-emerald-300">{code}</pre>
                <div className="absolute right-2 top-2">
                    <CopyText value={code} display="Copy" />
                </div>
            </div>
        </Card>
    );
}

function fmtDay(day: string): string {
    return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
