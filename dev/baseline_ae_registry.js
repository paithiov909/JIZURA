/* Capture the effective AE registry after the generated ES3 bundle has loaded. */
const fs = require('fs'), vm = require('vm');
const jsx = process.argv[2];
if (!jsx) throw new Error('usage: node dev/baseline_ae_registry.js /path/to/JIZURA_AE.jsx');
const source = fs.readFileSync(jsx, 'utf8').replace(/^#target.*\n/, '')
  .replace(/jzUI\(thisObj\);\s*\}\)\(this\);\s*$/, 'thisObj.__registry = JZ_REG;\n})(this);');
const context = {};
vm.createContext(context);
vm.runInContext(source, context, {filename: jsx});
const groups = {};
for (const g of Object.keys(context.__registry)) groups[g] = Object.keys(context.__registry[g]);
process.stdout.write(JSON.stringify(groups));
