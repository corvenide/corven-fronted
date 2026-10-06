// src/features/wallet/corven-signer.ts
//
// A CCC signer for the user's Corven testnet wallet. It builds and prepares
// transactions in the browser like any CKB wallet, but the private key stays
// on the server: signing is a call to /wallet/sign-testnet. Testnet only;
// mainnet sends go through the wallet card, which Corven builds itself.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ccc } from '@ckb-ccc/connector-react';

import { useAuth } from '../auth/hooks/useAuth';
import { walletApi, walletKeys } from './wallet.api';

export class CorvenTestnetSigner extends ccc.SignerCkbPublicKey {
    async signOnlyTransaction(txLike: ccc.TransactionLike): Promise<ccc.Transaction> {
        const tx = ccc.Transaction.from(txLike);
        const signed = await walletApi.signTestnet(JSON.parse(ccc.stringify(tx)));
        return ccc.Transaction.from(signed as ccc.TransactionLike);
    }
}

/** The Corven testnet wallet as a signer, for Google accounts; null otherwise. */
export function useCorvenTestnetSigner(): CorvenTestnetSigner | null {
    const { user } = useAuth();
    const isGoogle = user?.authProvider === 'GOOGLE';

    const wallets = useQuery({
        queryKey: walletKeys.all,
        queryFn: () => walletApi.list(),
        enabled: isGoogle,
        staleTime: 30_000,
    });

    const publicKey = wallets.data?.wallets.find((w) => w.network === 'TESTNET')?.publicKey;

    return useMemo(
        () => (isGoogle && publicKey ? new CorvenTestnetSigner(new ccc.ClientPublicTestnet(), publicKey) : null),
        [isGoogle, publicKey],
    );
}
