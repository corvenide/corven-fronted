import { expect, test } from './support/fixtures';

const DONATION_ADDRESS =
    'ckt1qrejnmlar3r452tcg57gvq8patctcgy8acync0hxfnyka35ywafvkqgjnwwhj6rdh5x73h663l9zdnxpntqzu5enqq9f6ccr';

test.describe('donate', () => {
    test('shows the donation address, QR code and network', async ({ page }) => {
        await page.goto('/donate');

        await expect(page.getByRole('heading', { name: /Help shape/ })).toBeVisible();
        await expect(page.getByTestId('donation-address')).toHaveText(DONATION_ADDRESS);
        await expect(page.getByRole('img', { name: 'QR code of the donation address' })).toBeVisible();
        await expect(page.getByText('CKB Testnet').first()).toBeVisible();
    });

    test('copies the address', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.goto('/donate');

        await page.getByRole('button', { name: 'Copy address' }).click();

        await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(DONATION_ADDRESS);
    });

    test('offers preset amounts and asks to connect a wallet', async ({ page }) => {
        await page.goto('/donate');

        await page.getByRole('radio', { name: '1,000' }).click();
        await expect(page.getByRole('radio', { name: '1,000' })).toHaveAttribute('aria-checked', 'true');
        await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
    });

    test('is also reachable at /community', async ({ page }) => {
        await page.goto('/community?tab=news');
        await expect(page.getByText('Releases and announcements from the Corven team.')).toBeVisible();
    });
});

test.describe('feedback & proposals', () => {
    test('invites signed-out visitors to sign in before posting', async ({ page }) => {
        await page.goto('/donate?tab=community');

        await expect(page.getByRole('heading', { name: 'Be the first to share an idea' })).toBeVisible();
        await page.getByRole('button', { name: 'Sign in to post' }).first().click();

        await expect(page).toHaveURL(/\/auth$/);
    });

    test('a signed-in user posts feedback, upvotes it and comments', async ({ page, api }) => {
        api.signedIn = true;
        await page.goto('/donate?tab=community');

        await page.getByRole('button', { name: 'New post' }).click();
        await page.getByLabel('Title').fill('Build output should keep colours');
        await page.getByLabel('Details').fill('The build panel strips ANSI colours, so errors are hard to spot.');
        await page.getByRole('button', { name: 'Post', exact: true }).click();

        // Opens the new post.
        await expect(page.getByRole('heading', { name: 'Build output should keep colours' })).toBeVisible();
        await expect(page).toHaveURL(/post=post-1/);
        expect(api.sent('POST', '/community/posts')[0].body).toEqual({
            kind: 'FEEDBACK',
            title: 'Build output should keep colours',
            body: 'The build panel strips ANSI colours, so errors are hard to spot.',
        });

        // Upvote, then remove the upvote.
        await page.getByRole('button', { name: 'Upvote (0)' }).click();
        await expect(page.getByRole('button', { name: 'Remove upvote (1)' })).toBeVisible();
        await page.getByRole('button', { name: 'Remove upvote (1)' }).click();
        await expect(page.getByRole('button', { name: 'Upvote (0)' })).toBeVisible();

        // Comment.
        await page.getByLabel('Add a comment').fill('Same here, especially for test failures.');
        await page.getByRole('button', { name: 'Comment', exact: true }).click();
        await expect(page.getByText('Same here, especially for test failures.')).toBeVisible();
        await expect(page.getByRole('heading', { name: '1 comment' })).toBeVisible();

        // Back on the board, the post is listed with its comment count.
        await page.getByRole('button', { name: 'Back' }).click();
        await expect(page.getByRole('button', { name: 'Build output should keep colours' })).toBeVisible();
    });

    test('filters proposals from feedback', async ({ page, api }) => {
        const now = new Date().toISOString();
        const author = { id: 'someone', name: 'Grace', walletAddress: null, isAdmin: false };
        api.communityPosts = [
            { id: 'p1', kind: 'FEEDBACK', title: 'Terminal font is small', body: 'x', status: 'OPEN', pinned: false, voteCount: 2, votedByMe: false, createdAt: now, updatedAt: now, author, comments: [] },
            { id: 'p2', kind: 'PROPOSAL', title: 'Add a Rust formatter', body: 'y', status: 'PLANNED', pinned: false, voteCount: 5, votedByMe: false, createdAt: now, updatedAt: now, author, comments: [] },
        ];
        await page.goto('/donate?tab=community');

        await expect(page.getByRole('button', { name: 'Terminal font is small' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add a Rust formatter' })).toBeVisible();

        await page.getByRole('tab', { name: 'Proposals' }).click();
        await expect(page.getByRole('button', { name: 'Add a Rust formatter' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Terminal font is small' })).toHaveCount(0);
        await expect(page.getByText('Planned')).toBeVisible();
    });
});

test.describe('news', () => {
    test('only maintainers see "Publish news"', async ({ page, api }) => {
        api.signedIn = true;
        api.communityAdmin = false;
        await page.goto('/donate?tab=news');

        await expect(page.getByText('Releases and announcements from the Corven team.')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'No news yet' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Publish news' })).toHaveCount(0);
    });

    test('a maintainer publishes news', async ({ page, api }) => {
        api.signedIn = true;
        api.communityAdmin = true;
        await page.goto('/donate?tab=news');

        await page.getByRole('button', { name: 'Publish news' }).click();
        await page.getByLabel('Title').fill('Corven now installs as a desktop app');
        await page.getByLabel('Details').fill('Open corvanide.space in Chrome and choose **Install Corven app**.');
        await page.getByRole('button', { name: 'Publish', exact: true }).click();

        await expect(page.getByRole('heading', { name: 'Corven now installs as a desktop app' })).toBeVisible();
        await expect(page.getByText('Maintainer').first()).toBeVisible();
        expect(api.sent('POST', '/community/posts')[0].body).toMatchObject({ kind: 'NEWS' });

        await page.getByRole('button', { name: 'Back' }).click();
        await expect(page.getByRole('button', { name: 'Corven now installs as a desktop app' })).toBeVisible();
    });
});

