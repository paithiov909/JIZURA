import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {catalogMedia} from '../catalog/media.mjs';
export default defineConfig({
  plugins: [{name: 'catalog-media', configureServer(server) {server.middlewares.use(catalogMedia);}}],
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../../dist/remotion/stage04/assets', import.meta.url)),
  build: {outDir: fileURLToPath(new URL('../../../dist/remotion/stage07/player', import.meta.url))},
});
