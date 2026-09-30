/* Print the browser edition's localized metadata for the AE build. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
// Use the same explicit, UI-free engine graph as the browser and Node tests.
global.window = global;
global.document = { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }) };
async function main() {
const { createEngine } = await import('../engine/index.ts');
const J = createEngine(fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim());
vm.runInNewContext(fs.readFileSync(path.join(root, 'app/english.js'), 'utf8'), { J }, { filename: 'english.js' });
const labels = { styles: {}, moods: {}, groups: {} };
for (const key of J.STYLE_ORDER) labels.styles[key] = { name: J.STYLES[key].name, desc: J.STYLES[key].desc };
for (const key of Object.keys(J.MOODS)) labels.moods[key] = J.MOODS[key].name;
for (const group of J.GROUP_KEYS) labels.groups[group] = Object.fromEntries(J.order(group).map(key => [key, J.registry(group)[key].name]));
process.stdout.write(JSON.stringify(labels));

}
main().catch(error => { console.error(error); process.exitCode = 1; });
