// Team: who can manage the app (Corven IDE accounts), roles, invites.

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Link2, Mail, Trash2, UserPlus } from 'lucide-react';

import { useAuth } from '../../auth/hooks/useAuth';
import { connectApi, connectKeys, ROLE_LABEL, type AppRole, type ConnectApp } from '../connect.api';
import { Button, Card, CopyText, ErrorNote, Loading, RoleBadge, inputClass, shortAddress, timeAgo } from './ui';

const ROLE_HELP: Record<AppRole, string> = {
    OWNER: 'Everything, including mainnet, roles and deleting the app',
    ADMIN: 'Settings, users and inviting admins or viewers',
    VIEWER: 'Read-only: settings, users and stats',
};

export function TeamTab({ app }: { app: ConnectApp }) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const team = useQuery({ queryKey: connectKeys.team(app.id), queryFn: () => connectApi.team(app.id) });
    const refresh = () => void queryClient.invalidateQueries({ queryKey: connectKeys.team(app.id) });

    const changeRole = useMutation({ mutationFn: (v: { id: string; role: AppRole }) => connectApi.changeRole(app.id, v.id, v.role), onSuccess: refresh });
    const remove = useMutation({
        mutationFn: (v: { id: string; self: boolean }) => connectApi.removeMember(app.id, v.id),
        onSuccess: (_d, v) => {
            refresh();
            if (v.self) {
                void queryClient.invalidateQueries({ queryKey: connectKeys.apps });
                window.location.assign('/connect');
            }
        },
    });
    const revoke = useMutation({ mutationFn: (id: string) => connectApi.revokeInvite(app.id, id), onSuccess: refresh });

    const isOwner = app.role === 'OWNER';
    const canInvite = app.role !== 'VIEWER';

    return (
        <div className="space-y-5">
            {canInvite && <InviteCard app={app} onInvited={refresh} />}

            <Card className="p-0">
                <div className="border-b border-outline-variant/30 px-5 py-3.5">
                    <h2 className="text-[14px] font-semibold text-on-surface">Members</h2>
                    <p className="text-[12px] text-on-surface-variant">Corven accounts that can manage {app.name}.</p>
                </div>
                {team.isLoading ? (
                    <Loading />
                ) : team.error ? (
                    <div className="p-4">
                        <ErrorNote error={team.error} />
                    </div>
                ) : (
                    <ul>
                        {team.data!.members.map((m) => {
                            const canRemove = m.isYou || (app.role === 'OWNER') || (app.role === 'ADMIN' && m.role !== 'OWNER');
                            return (
                                <li key={m.id} className="flex flex-col gap-3 border-b border-outline-variant/15 px-5 py-3.5 last:border-0 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">
                                            {m.name.slice(0, 1).toUpperCase()}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-[13px] text-on-surface">
                                                {m.name} {m.isYou && <span className="text-on-surface-variant">(you)</span>}
                                            </span>
                                            <span className="block truncate font-mono text-[11.5px] text-on-surface-variant">{m.email ?? (m.walletAddress ? shortAddress(m.walletAddress) : '')}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isOwner ? (
                                            <select
                                                aria-label={`Role of ${m.name}`}
                                                value={m.role}
                                                disabled={changeRole.isPending}
                                                onChange={(e) => changeRole.mutate({ id: m.id, role: e.target.value as AppRole })}
                                                className="rounded-lg border border-outline-variant/40 bg-surface-container-high px-2 py-1.5 text-[12px] text-on-surface"
                                            >
                                                {(['OWNER', 'ADMIN', 'VIEWER'] as AppRole[]).map((r) => (
                                                    <option key={r} value={r}>
                                                        {ROLE_LABEL[r]}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <RoleBadge role={m.role} />
                                        )}
                                        {canRemove && (
                                            <Button
                                                variant="ghost"
                                                aria-label={m.isYou ? 'Leave app' : `Remove ${m.name}`}
                                                title={m.isYou ? 'Leave' : 'Remove'}
                                                onClick={() => {
                                                    if (window.confirm(m.isYou ? `Leave ${app.name}? You'll lose access.` : `Remove ${m.name} from ${app.name}?`)) remove.mutate({ id: m.id, self: m.isYou });
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                {m.isYou ? 'Leave' : ''}
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div className="px-5 pb-4">
                    <ErrorNote error={changeRole.error ?? remove.error} />
                </div>
            </Card>

            {canInvite && team.data && team.data.invites.length > 0 && (
                <Card className="p-0">
                    <div className="border-b border-outline-variant/30 px-5 py-3.5">
                        <h2 className="text-[14px] font-semibold text-on-surface">Pending invites</h2>
                    </div>
                    <ul>
                        {team.data.invites.map((i) => (
                            <li key={i.id} className="flex items-center gap-3 border-b border-outline-variant/15 px-5 py-3 last:border-0">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                                    {i.email ? <Mail className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] text-on-surface">{i.email ?? 'Invite link'}</span>
                                    <span className="flex items-center gap-1 text-[11.5px] text-on-surface-variant">
                                        <Clock className="h-3 w-3" /> sent {timeAgo(i.createdAt)} · expires {new Date(i.expiresAt).toLocaleDateString()}
                                    </span>
                                </span>
                                <RoleBadge role={i.role} />
                                <Button variant="ghost" busy={revoke.isPending && revoke.variables === i.id} onClick={() => revoke.mutate(i.id)}>
                                    Revoke
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <p className="text-[11.5px] text-on-surface-variant">
                Signed in as {user?.name}. Members sign in to Corven with their own accounts; an invite link works for one person.
            </p>
        </div>
    );
}

function InviteCard({ app, onInvited }: { app: ConnectApp; onInvited: () => void }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<AppRole>('VIEWER');
    const invite = useMutation({
        mutationFn: () => connectApi.invite(app.id, { email: email.trim() || undefined, role }),
        onSuccess: () => {
            setEmail('');
            onInvited();
        },
    });
    const roles: AppRole[] = app.role === 'OWNER' ? ['VIEWER', 'ADMIN', 'OWNER'] : ['VIEWER', 'ADMIN'];

    return (
        <Card>
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-on-surface">
                <UserPlus className="h-4 w-4 text-primary" /> Invite someone
            </h2>
            <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                    e.preventDefault();
                    invite.mutate();
                }}
            >
                <input aria-label="Email (optional)" type="email" className={inputClass} placeholder="teammate@example.com (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
                <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="rounded-lg border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-[13px] text-on-surface sm:w-36">
                    {roles.map((r) => (
                        <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                        </option>
                    ))}
                </select>
                <Button variant="primary" type="submit" busy={invite.isPending} className="sm:w-40">
                    {email.trim() ? 'Send invite' : 'Create invite link'}
                </Button>
            </form>
            <p className="mt-2 text-[11.5px] text-on-surface-variant">{ROLE_HELP[role]}.</p>
            <div className="mt-3">
                <ErrorNote error={invite.error} />
            </div>
            {invite.data && (
                <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                    <p className="text-[12.5px] text-on-surface">
                        {invite.data.emailed ? `Invite emailed to ${invite.data.invite.email}. ` : invite.data.invite.email ? 'Email isn’t set up on the server, so send this link yourself. ' : 'Send this link to the person you’re inviting. '}
                        It works once, for 7 days.
                    </p>
                    <div className="mt-2">
                        <CopyText value={invite.data.link} className="w-full justify-between py-1.5" />
                    </div>
                </div>
            )}
        </Card>
    );
}
