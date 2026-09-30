import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type InlineConfig } from 'vite';

export const repo = path.dirname(fileURLToPath(import.meta.url));
export const target = 'chrome88';
export const routes = ['', 'en', 'zh-hant', 'zh-hans', 'ko', 'id', 'vi'] as const;

const common: InlineConfig = {
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
};

export function webConfig(root = path.join(repo, 'dist/.inputs/web')): InlineConfig {
  return {
    ...common, root, base: process.env.JIZURA_WEB_BASE || '/JIZURA/',
    build: {
      outDir: path.join(repo, 'dist/web'), emptyOutDir: true,
      target, cssTarget: target,
      rollupOptions: { input: routes.map(route => path.join(root, route, 'index.html')) },
    },
  };
}

export function classicConfig(root: string, outDir: string): InlineConfig {
  return {
    ...common, root, base: './',
    build: {
      outDir, emptyOutDir: true, target, cssTarget: target,
      lib: { entry: path.join(root, 'entry.ts'), name: 'JizuraPanel', formats: ['iife'],
        fileName: () => 'panel.js', cssFileName: 'panel' },
    },
  };
}

export default defineConfig(webConfig());
