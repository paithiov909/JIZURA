import {createReadStream, existsSync} from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../../../dist/remotion');
// Serve only the authored catalog's generated movies; no arbitrary workspace files.
export function catalogMedia(req, res, next) {
  const match = /^\/catalog-media\/(stage(?:08|09|10))\/([A-Za-z0-9-]+\.mp4)$/.exec(req.url ?? '');
  if (!match) return next();
  const file = path.join(root, match[1], match[2]);
  if (!existsSync(file)) {res.statusCode = 404; return res.end('Generate the stage08/09/10 visual examples first. See examples/catalog/README.md.');}
  res.setHeader('Content-Type', 'video/mp4');
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy()); stream.pipe(res);
}
