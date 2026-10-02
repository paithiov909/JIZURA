import {readdirSync, rmSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {spawnSync} from 'node:child_process';

// Keep the current entry available while Studio watches the built package.
const result = spawnSync('tsc', ['--project', 'tsconfig.build.json', '--listEmittedFiles'], {
  encoding: 'utf8', shell: false,
});
if (result.error) throw result.error;
const output = result.stdout ?? '';
process.stdout.write(output.split('\n').filter((line) => !line.startsWith('TSFILE: ')).join('\n'));
process.stderr.write(result.stderr ?? '');
if (result.status !== 0) process.exit(result.status ?? 1);

// Remove obsolete outputs only after a successful compilation.
const emitted = new Set(output.split('\n').filter((line) => line.startsWith('TSFILE: '))
  .map((line) => resolve(line.slice('TSFILE: '.length).trim())));
if (emitted.size === 0) throw new Error('TypeScript reported no emitted package files.');
const outDir = resolve('dist');
for (const entry of readdirSync(outDir, {recursive: true, withFileTypes: true})) {
  if (!entry.isFile()) continue;
  const path = join(entry.parentPath, entry.name);
  if (!emitted.has(path)) rmSync(path);
}
