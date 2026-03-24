import { builtinModules } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';

const PACKAGE_ROOT = __dirname;

export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': path.resolve(PACKAGE_ROOT, 'src') + '/',
    },
    conditions: ['node'],
    mainFields: ['module', 'main'],
  },
  build: {
    sourcemap: 'inline',
    target: 'esnext',
    outDir: 'dist',
    assetsDir: '.',
    minify: process.env.MODE === 'production' ? 'esbuild' : false,
    lib: {
      entry: 'src/entrypoint.ts',
      formats: ['es'],
    },
    rolldownOptions: {
      platform: 'node',
      external: [...builtinModules.flatMap(p => [p, `node:${p}`])],
      output: {
        entryFileNames: '[name].js',
      },
    },
    emptyOutDir: true,
    reportCompressedSize: false,
  },
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      include: ['src/**/*.ts'],
    },
    exclude: ['dist/**'],
  },
});
