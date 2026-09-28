import { ccc } from '@ckb-ccc/core';

import { CommunityAdmins, DEFAULT_COMMUNITY_ADMIN, adminAddressesFromEnv } from './community-admins';

const client = new ccc.ClientPublicTestnet();

async function addressOf(privateKey: string) {
    return new ccc.SignerCkbPrivateKey(client, privateKey).getRecommendedAddress();
}

describe('CommunityAdmins', () => {
    let admin: string;
    let other: string;

    beforeAll(async () => {
        admin = await addressOf('0x' + '31'.repeat(32));
        other = await addressOf('0x' + '32'.repeat(32));
    });

    it('recognises an admin wallet', async () => {
        await expect(new CommunityAdmins([admin]).isAdmin(admin)).resolves.toBe(true);
    });

    it('rejects any other wallet', async () => {
        await expect(new CommunityAdmins([admin]).isAdmin(other)).resolves.toBe(false);
    });

    it.each([null, undefined, '', 'not-an-address', 'ckt1qqqq'])('rejects %j', async (value) => {
        await expect(new CommunityAdmins([admin]).isAdmin(value as string)).resolves.toBe(false);
    });

    it('matches by lock script, ignoring surrounding spaces', async () => {
        await expect(new CommunityAdmins([`  ${admin}  `]).isAdmin(admin)).resolves.toBe(true);
    });

    it('ignores invalid entries in the admin list', async () => {
        await expect(new CommunityAdmins(['garbage', admin]).isAdmin(admin)).resolves.toBe(true);
    });

    it('treats Corven’s donation wallet as the default admin', async () => {
        await expect(new CommunityAdmins().isAdmin(DEFAULT_COMMUNITY_ADMIN)).resolves.toBe(true);
    });
});

describe('adminAddressesFromEnv', () => {
    it('defaults to the donation wallet', () => {
        expect(adminAddressesFromEnv({})).toEqual([DEFAULT_COMMUNITY_ADMIN]);
    });

    it('reads a comma-separated list', () => {
        expect(adminAddressesFromEnv({ COMMUNITY_ADMIN_WALLETS: ' ckt1aaa, ckt1bbb ,' })).toEqual(['ckt1aaa', 'ckt1bbb']);
    });
});

