import { test as base } from '@playwright/test';

import { MockApi } from './mock-api';

/** `api` is a fresh mock backend for each test, installed before navigation. */
export const test = base.extend<{ api: MockApi }>({
    api: async ({ page }, use) => {
        const api = new MockApi(page);
        await api.install();
        await use(api);
    },
});

export { expect } from '@playwright/test';
