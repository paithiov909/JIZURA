// Legacy CLI single-file/dev output uses the same module graph as npm builds.
import { build } from 'vite';
import path from 'node:path';
import { classicConfig } from '../vite.config.mts';
const root = process.argv[2];
if (!root) throw new Error('usage: node build/bundle-input.mts INPUT_DIRECTORY');
const config = classicConfig(root, path.join(root, '.bundle'));
config.build!.write = false;
const result = await build(config);
const outputs = Array.isArray(result) ? result : [result];
const chunks = outputs.flatMap(output => {
  if ('close' in output) throw new Error('Expected a build, not a watcher');
  return output.output.filter(item => item.type === 'chunk');
});
if (chunks.length !== 1) throw new Error('Expected one classic chunk');
process.stdout.write(chunks[0]!.code);
