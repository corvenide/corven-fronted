import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig({ command: 'serve', mode: 'test' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // src/config/env.ts throws without these.
      env: {
        VITE_API_URL: 'http://api.test/api',
        VITE_TERMINAL_URL: 'http://terminal.test',
      },
      restoreMocks: true,
    },
  }),
);
