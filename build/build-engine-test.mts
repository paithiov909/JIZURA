import { build } from 'vite';
import path from 'node:path';
import { repo, target } from '../vite.config.mts';
await build({ configFile: false, root: repo, publicDir: false, logLevel: 'warn', build: {
  outDir: path.join(repo, 'dist/task04/engine'), emptyOutDir: true, target,
  lib: { entry: path.join(repo, 'tests/engine/browser-entry.ts'), formats: ['iife'], name: 'EngineTest', fileName: () => 'engine.js' },
} });
