import { defineConfig } from 'tsup';
import { cp } from 'node:fs/promises';

export default defineConfig({
  entry: ['src/index.ts', 'src/astro/index.ts', 'src/server/index.ts'],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
  // Flatten src/astro/index.ts → dist/astro.js so the subpath works
  esbuildOptions(opts) {
    opts.outbase = 'src';
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@verevoir/schema',
    '@verevoir/storage',
    '@verevoir/editor',
  ],
  // Copy CSS files alongside the JS output so consumers can import
  // them via `@verevoir/admin/styles/*.css`.
  async onSuccess() {
    await cp('src/styles', 'dist/styles', { recursive: true });
  },
});
