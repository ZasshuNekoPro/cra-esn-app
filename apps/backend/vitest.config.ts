import swc from 'unplugin-swc';
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
    root: './',
    setupFiles: ['test/setup.ts'],
    include: ['src/**/*.spec.ts', 'test/unit/**/*.spec.ts'],
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          decoratorMetadata: true,
          legacyDecorator: true,
        },
      },
    }),
  ],
});
