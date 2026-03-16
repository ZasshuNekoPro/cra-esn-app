import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@esn/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@esn/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
