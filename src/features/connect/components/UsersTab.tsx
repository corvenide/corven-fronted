// Users: search the app's users, see how they sign in and their wallets,
// sign them out or delete them.

import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Fingerprint, KeyRound, LogOut, Mail, Phone, Search, Trash2, Wallet, X } from 'lucide-react';

import { ConfirmDialog } from '../../dashboard/components/ConfirmDialog';
import { connectApi, connectKeys, METHOD_LABEL, type ConnectApp, type ConnectUserRow } from '../connect.api';
import { Button, Card, CopyText, ErrorNote, EXPLORER, formatCkb, Loading, shortAddress, timeAgo } from './ui';

const KIND_ICON = { PHONE: Phone, EMAIL: Mail, GOOGLE: KeyRound, WALLET: Wallet } as const;

function primaryIdentity(u: ConnectUserRow) {
    const i = u.identities[0];
    if (!i) return { title: u.displayName ?? 'Passkey user', kind: null as null | keyof typeof KIND_ICON };
    return { title: i.kind === 'WALLET' && i.value ? shortAddress(i.value, 14, 6) : (i.value ?? '—'), kind: i.kind };
}

export function UsersTab({ app }: { app: ConnectApp }) {
    const [query, setQuery] = useState('');
    const [q, setQ] = useState('');
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setQ(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const users = useInfiniteQuery({
        queryKey: connectKeys.users(app.id, q),
        queryFn: ({ pageParam }) => connectApi.listUsers(app.id, { q, cursor: pageParam, limit: 25 }),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => last.nextCursor,
    });
    const rows = users.data?.pages.flatMap((p) => p.users) ?? [];
    const total = users.data?.pages[0]?.total ?? 0;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[14px] font-semibold text-on-surface">
                    Users <span className="font-normal text-on-surface-variant">· {total.toLocaleString()}</span>
                </h2>
                <div className="relative w-full sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
                    <input
                        aria-label="Search users"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Phone, email, address or user id"
                        className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-high py-2 pl-8 pr-3 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                    />
                </div>
            </div>

            <Card className="overflow-hidden p-0">
                {users.isLoading ? (
                    <Loading />
                ) : users.error ? (
                    <div className="p-4">
                        <ErrorNote error={users.error} />
                    </div>
                ) : rows.length === 0 ? (
                    <p className="px-5 py-14 text-center text-[13px] text-on-surface-variant">
                        {q ? 'No users match that search.' : 'No users yet. They appear here after their first sign-in.'}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-[12.5px]">
                            <thead className="border-b border-outline-variant/30 text-[11px] uppercase tracking-wide text-on-surface-variant">
                                <tr>
                                    <th className="px-4 py-2.5 font-medium">User</th>
                                    <th className="px-4 py-2.5 font-medium">Sign-in methods</th>
                                    <th className="px-4 py-2.5 font-medium">Wallet</th>
                                    <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                                    <th className="px-4 py-2.5 font-medium">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((u) => {
                                    const p = primaryIdentity(u);
                                    const Icon = p.kind ? KIND_ICON[p.kind] : Fingerprint;
                                    const wallet = u.embeddedWallets ? u.wallets.find((w) => w.network === 'TESTNET')?.address : u.identities.find((i) => i.kind === 'WALLET')?.value;
                                    return (
                                        <tr
                                            key={u.id}
                                            tabIndex={0}
                                            onClick={() => setSelected(u.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && setSelected(u.id)}
                                            className="cursor-pointer border-b border-outline-variant/15 last:border-0 hover:bg-surface-container-high/60 focus:bg-surface-container-high/60 focus:outline-none"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate font-mono text-on-surface">{p.title}</span>
                                                        {u.displayName && <span className="text-[11.5px] text-on-surface-variant">{u.displayName}</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {u.identities.map((i, n) => (
                                                        <span key={n} className="rounded border border-outline-variant/30 px-1.5 py-0.5 text-[10.5px] text-on-surface-variant">
                                                            {i.kind === 'WALLET' ? (i.label ?? 'Wallet') : METHOD_LABEL[i.kind]}
                                                        </span>
                                                    ))}
                                                    {u.passkeyCount > 0 && <span className="rounded border border-outline-variant/30 px-1.5 py-0.5 text-[10.5px] text-on-surface-variant">Passkey</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {wallet ? (
                                                    <span className="font-mono text-on-surface-variant">
                                                        {shortAddress(wallet)}
                                                        {!u.embeddedWallets && <span className="ml-1.5 rounded bg-secondary/10 px-1 text-[10px] text-secondary">own</span>}
                                                    </span>
                                                ) : (
                                                    <span className="text-on-surface-variant">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-on-surface-variant">{timeAgo(u.lastLoginAt)}</td>
                                            <td className="px-4 py-3 text-on-surface-variant">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {users.hasNextPage && (
                <div className="flex justify-center">
                    <Button busy={users.isFetchingNextPage} onClick={() => void users.fetchNextPage()}>
                        Load more
                    </Button>
                </div>
            )}

            {selected && <UserPanel app={app} userId={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}

function UserPanel({ app, userId, onClose }: { app: ConnectApp; userId: string; onClose: () => void }) {
    const queryClient = useQueryClient();
    const canManage = app.role !== 'VIEWER';
    const [confirm, setConfirm] = useState<'signout' | 'delete' | null>(null);
    const user = useQuery({ queryKey: connectKeys.user(app.id, userId), queryFn: () => connectApi.getUser(app.id, userId) });

    const signOut = useMutation({
        mutationFn: () => connectApi.signOutUser(app.id, userId),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: connectKeys.user(app.id, userId) }),
    });
    const remove = useMutation({
        mutationFn: () => connectApi.deleteUser(app.id, userId),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['connect', 'users', app.id] });
            onClose();
        },
    });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !confirm && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, confirm]);

    const u = user.data;
    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="User details">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-outline-variant/30 bg-surface-container-low">
                <div className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
                    <h2 className="text-[14px] font-semibold text-on-surface">User</h2>
                    <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {user.isLoading ? (
                    <Loading />
                ) : user.error ? (
                    <div className="p-5">
                        <ErrorNote error={user.error} />
                    </div>
                ) : u ? (
                    <div className="space-y-6 p-5 text-[12.5px]">
                        <Section title="Ids">
                            <Row label="User id">
                                <CopyText value={u.id} display={shortAddress(u.id, 8, 6)} />
                            </Row>
                            <Row label="Joined">{new Date(u.createdAt).toLocaleString()}</Row>
                            <Row label="Last sign-in">{timeAgo(u.lastLoginAt)}</Row>
                            <Row label="Active sessions">{u.activeSessions}</Row>
                        </Section>

                        <Section title="Sign-in methods">
                            {u.identities.map((i, n) => {
                                const Icon = KIND_ICON[i.kind];
                                return (
                                    <Row key={n} label={i.kind === 'WALLET' ? (i.label ?? 'Wallet') : METHOD_LABEL[i.kind]} icon={<Icon className="h-3.5 w-3.5" />}>
                                        {i.value ? <CopyText value={i.value} display={i.kind === 'WALLET' ? shortAddress(i.value) : i.value} /> : '—'}
                                    </Row>
                                );
                            })}
                            {u.passkeys.map((p) => (
                                <Row key={p.id} label={p.name ?? 'Passkey'} icon={<Fingerprint className="h-3.5 w-3.5" />}>
                                    <span className="font-mono text-on-surface-variant">{p.rpId}</span>
                                </Row>
                            ))}
                        </Section>

                        <Section title="Wallets">
                            {!u.embeddedWallets && <p className="text-on-surface-variant">Signs with their own wallet. Corven holds no keys for this user.</p>}
                            {u.wallets.map((w) => (
                                <Row key={w.network} label={w.network === 'MAINNET' ? 'Mainnet' : 'Testnet'}>
                                    <span className="flex items-center gap-1.5">
                                        <CopyText value={w.address} display={shortAddress(w.address)} />
                                        <a href={`${EXPLORER[w.network]}/address/${w.address}`} target="_blank" rel="noreferrer" aria-label="Open in explorer" className="text-on-surface-variant hover:text-primary">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </span>
                                </Row>
                            ))}
                        </Section>

                        <Section title={`Signed transactions · ${u.txSigned}`}>
                            {u.signatures.length === 0 ? (
                                <p className="text-on-surface-variant">None yet.</p>
                            ) : (
                                u.signatures.map((s) => (
                                    <Row key={s.txHash} label={`${timeAgo(s.createdAt)} · ${s.network === 'MAINNET' ? 'Mainnet' : 'Testnet'}`}>
                                        <a
                                            href={`${EXPLORER[s.network as 'TESTNET' | 'MAINNET'] ?? EXPLORER.TESTNET}/transaction/${s.txHash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-mono text-on-surface hover:text-primary"
                                        >
                                            {shortAddress(s.txHash, 8, 6)} · −{formatCkb(s.outflow)}
                                        </a>
                                    </Row>
                                ))
                            )}
                        </Section>

                        {canManage && (
                            <div className="space-y-2 border-t border-outline-variant/30 pt-5">
                                <Button className="w-full" busy={signOut.isPending} onClick={() => setConfirm('signout')}>
                                    <LogOut className="h-3.5 w-3.5" /> Sign out everywhere
                                </Button>
                                {signOut.data && <p className="text-center text-[11.5px] text-on-surface-variant">Ended {signOut.data.revoked} session(s).</p>}
                                <Button variant="danger" className="w-full" busy={remove.isPending} onClick={() => setConfirm('delete')}>
                                    <Trash2 className="h-3.5 w-3.5" /> Delete user
                                </Button>
                                <ErrorNote error={signOut.error ?? remove.error} />
                            </div>
                        )}
                    </div>
                ) : null}
            </aside>

            <ConfirmDialog
                isOpen={confirm === 'signout'}
                onClose={() => setConfirm(null)}
                onConfirm={() => {
                    setConfirm(null);
                    signOut.mutate();
                }}
                title="Sign this user out everywhere?"
                description="All their sessions end. They can sign in again any time."
                confirmLabel="Sign out"
                variant="warning"
            />
            <ConfirmDialog
                isOpen={confirm === 'delete'}
                onClose={() => setConfirm(null)}
                onConfirm={() => {
                    setConfirm(null);
                    remove.mutate();
                }}
                title="Delete this user?"
                description={
                    u?.embeddedWallets
                        ? 'This deletes their account and their Corven-held wallet keys. Any CKB still in those wallets is lost for good unless they exported their key. This can’t be undone.'
                        : 'This deletes their account. Their own wallet is not affected. This can’t be undone.'
                }
                confirmLabel="Delete user"
                variant="danger"
            />
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="mb-2 text-[11px] font-mono uppercase tracking-wide text-on-surface-variant">{title}</h3>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function Row({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="flex shrink-0 items-center gap-1.5 text-on-surface-variant">
                {icon}
                {label}
            </span>
            <span className="min-w-0 text-right text-on-surface">{children}</span>
        </div>
    );
}
