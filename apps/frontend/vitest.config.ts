import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['src/**/*.spec.tsx', 'jsdom'],
    ],
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    exclude: ['test/e2e/**'],
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@esn/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@esn/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
    },
  },
});
