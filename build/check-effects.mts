import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createEngine } from '../engine/index.ts';
import { AE_IMPLEMENTATIONS } from '../effects/ae-implementations.ts';
import { validateEffects } from '../effects/registry.ts';
import type { EffectGroup } from '../engine/types.ts';

// Engine initialization only needs font measurement; this is not an AE mock run.
Object.assign(globalThis, { document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }) } });
const root = path.resolve(import.meta.dirname, '..');
const engine = createEngine(readFileSync(path.join(root, 'VERSION'), 'utf8').trim());
const validation = validateEffects(engine);
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--ae')) throw new Error('usage: node build/check-effects.mts [--ae JSX_FILE]');
let aeRegistryChecked = false;
if (args.length) {
  const source = readFileSync(args[1]!, 'utf8').replace(/^#target.*\n/, '')
    .replace(/jzUI\(thisObj\);\s*\}\)\(this\);\s*$/, 'thisObj.__registry = JZ_REG;\n})(this);');
  const context = vm.createContext({}) as vm.Context & { __registry: Record<EffectGroup, Record<string, unknown>> };
  vm.runInContext(source, context, { filename: args[1]!, timeout: 10000 });
  assert(context.__registry, 'AE registry was not captured from the freshly built bundle');
  for (const group of engine.GROUP_KEYS) {
    const expected = [...AE_IMPLEMENTATIONS[group]].sort(), actual = Object.keys(context.__registry[group]).sort();
    assert.equal(expected.length, new Set(expected).size, `${group}: duplicate AE declaration`);
    assert.deepEqual(actual, expected, `${group}: declared AE ports differ from built ES3 registry`);
  }
  aeRegistryChecked = true;
}
const directory = path.join(root, 'dist/task05');
mkdirSync(directory, { recursive: true });
writeFileSync(path.join(directory, 'effect-validation.json'), JSON.stringify({ ...validation, aeRegistryChecked,
  evidence: 'Source metadata and optionally loaded ES3 registry; no actual After Effects execution or rendering.' }, null, 2) + '\n');
console.log(`Effects validated: ${validation.effects} (${validation.implementations} AE implementations, ${validation.fallbacks.length} declared fallbacks); built AE registry checked: ${aeRegistryChecked}`);
for (const fallback of validation.fallbacks) console.warn(`AE fallback ${fallback.group}.${fallback.id} -> ${fallback.target}: ${fallback.reason}`);
