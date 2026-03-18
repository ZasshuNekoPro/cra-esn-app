import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@esn/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@esn/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@esn/pdf-generator': path.resolve(__dirname, '../../packages/pdf-generator/src'),
    },
  },
  test: {
    globals: true,
    root: './',
    setupFiles: ['test/setup.ts'],
    include: ['test/e2e/**/*.e2e.spec.ts'],
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    server: {
      deps: {
        external: ['express', 'multer', 'supertest', 'fastify'],
      },
    },
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
