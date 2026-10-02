import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../../dist/remotion/stage04/assets', import.meta.url)),
  build: {outDir: fileURLToPath(new URL('../../../dist/remotion/stage07/player', import.meta.url))},
});
