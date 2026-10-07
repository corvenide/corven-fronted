// src/pages/ConnectInvitePage.tsx — accept an invite to manage a Connect app.

import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../features/auth/hooks/useAuth';
import { connectApi, connectKeys, ROLE_LABEL } from '../features/connect/connect.api';
import { AppLogo, Button, Card, ErrorNote, Loading } from '../features/connect/components/ui';

export default function ConnectInvitePage() {
    const { token = '' } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const preview = useQuery({ queryKey: ['connect', 'invite', token], queryFn: () => connectApi.previewInvite(token), retry: false });
    const accept = useMutation({
        mutationFn: () => connectApi.acceptInvite(token),
        onSuccess: ({ appId }) => {
            void queryClient.invalidateQueries({ queryKey: connectKeys.apps });
            navigate(`/connect/apps/${appId}`, { replace: true });
        },
    });

    const p = preview.data;
    return (
        <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
            <Card className="p-7 text-center">
                {preview.isLoading ? (
                    <Loading label="Checking the invite…" />
                ) : preview.error || !p?.app ? (
                    <>
                        <h1 className="text-[17px] font-semibold text-on-surface">Invite not found</h1>
                        <p className="mt-2 text-[13px] text-on-surface-variant">The link may be wrong or the app was deleted.</p>
                    </>
                ) : (
                    <>
                        <div className="flex justify-center">
                            <AppLogo name={p.app.name} logoUrl={p.app.logoUrl} size={56} />
                        </div>
                        <h1 className="mt-4 text-[18px] font-semibold text-on-surface">Join {p.app.name}</h1>
                        <p className="mt-2 text-[13px] text-on-surface-variant">
                            {p.invitedBy} invited you to manage this Corven Connect app as <span className="text-on-surface">{ROLE_LABEL[p.role].toLowerCase()}</span>.
                        </p>
                        {p.status !== 'pending' ? (
                            <p className="mt-5 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-[12.5px] text-on-surface-variant">
                                This invite was {p.status === 'accepted' ? 'already used' : p.status}. Ask for a new one.
                            </p>
                        ) : p.alreadyMember ? (
                            <Button variant="primary" className="mt-6 w-full" onClick={() => navigate(`/connect/apps/${p.app!.id}`)}>
                                You're already a member. Open the app
                            </Button>
                        ) : (
                            <>
                                <Button variant="primary" className="mt-6 w-full" busy={accept.isPending} onClick={() => accept.mutate()}>
                                    Accept and join
                                </Button>
                                <p className="mt-3 text-[11.5px] text-on-surface-variant">
                                    You'll join as {user?.name}
                                    {p.email && user?.email && p.email !== user.email ? ` (the invite was sent to ${p.email})` : ''}.
                                </p>
                            </>
                        )}
                        <div className="mt-3">
                            <ErrorNote error={accept.error} />
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
