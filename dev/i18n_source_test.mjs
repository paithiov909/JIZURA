// Optional forensic comparison: requires the immutable integration-base git object.
// Legacy substitution is executed only on git reference files in a temporary directory,
// never on production source or build inputs. Not part of the orphan/clean-clone gates.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { parse } from 'acorn';
const { LOCALES } = await import('../i18n/index.ts');
const { CEP_MESSAGES } = await import('../i18n/cep.ts');
const reference = 'ce6a4a2a3074e768981d2dc877acb45366e176ed';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'jizura-i18n-reference-'));
let legacy;
try {
  for (const file of ['app/english.py', 'app/i18n.py', 'app/i18n_zh_hant.py', 'app/i18n_zh_hans.py', 'app/i18n_ko.py', 'app/i18n_id.py', 'app/i18n_vi.py', 'app/chinese.py', 'app/korean.py', 'src/12_ui.js', 'src/11_export.js', 'cep/cep.js']) {
    const destination = path.join(temporary, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, execFileSync('git', ['show', reference + ':' + file]));
  }
  const python = `import json
from pathlib import Path
from app import english, i18n
result = {}
for code, _, _, _ in i18n.EDITIONS:
    sources = {}
    for file in ['src/12_ui.js', 'src/11_export.js', 'cep/cep.js']:
        source = Path(file).read_text()
        if file.startswith('cep/'):
            source = english.localize_cep(source) if code == 'en' else source
        elif code == 'en': source = english.localize_js(source, file)
        elif code != 'ja': source = i18n.localize_js(code, source, file)
        sources[file] = source
    result[code] = {'sources': sources}
print(json.dumps(result, ensure_ascii=False))`;
  legacy = JSON.parse(execFileSync(process.env.PYTHON || 'python3', ['-c', python], { cwd: temporary, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
function normalize(node, dictionary) {
  if (Array.isArray(node)) return node.map(value => normalize(value, dictionary));
  if (!node || typeof node !== 'object') return node;
  if (node.type === 'CallExpression' && node.callee.name === 'translate' && node.arguments[0]?.type === 'Literal') {
    const key = node.arguments[0].value;
    const messages = key.startsWith('cep.') ? CEP_MESSAGES[dictionary.code] : dictionary.messages;
    const message = messages[key], parameters = node.arguments[1]?.elements;
    if (!parameters?.length) return { type: 'Literal', value: message };
    const chunks = message.split(/\{p\d+\}/);
    const indices = [...message.matchAll(/\{p(\d+)\}/g)].map(match => Number(match[1]));
    return {
      type: 'TemplateLiteral',
      expressions: indices.map(index => normalize(parameters[index], dictionary)),
      quasis: chunks.map((value, index) => ({
        type: 'TemplateElement', value: { cooked: value }, tail: index === chunks.length - 1,
      })),
    };
  }
  return Object.fromEntries(Object.entries(node)
    .filter(([key]) => !['start', 'end', 'raw'].includes(key))
    .map(([key, value]) => [key, normalize(value, dictionary)]));
}

function functions(node, output = []) {
  if (!node || typeof node !== 'object') return output;
  if (node.type === 'FunctionDeclaration') output.push(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => functions(child, output));
    else if (value && typeof value === 'object') functions(value, output);
  }
  return output;
}

let count = 0;
for (const [code, data] of Object.entries(legacy)) {
  for (const file of ['src/12_ui.js', 'src/11_export.js', 'cep/cep.js']) {
    if (file === 'cep/cep.js' && !['ja', 'en'].includes(code)) continue;
    const options = { ecmaVersion: 2021, sourceType: 'module' };
    const original = functions(parse(data.sources[file], options));
    const current = functions(parse(fs.readFileSync(file, 'utf8'), options));
    // These three changes have separate startup/UI/project-export evidence.
    for (const node of original) {
      if (['install', 'syncLoopBtn', 'projectData'].includes(node.id.name)) continue;
      const candidate = current.find(value => value.id.name === node.id.name);
      assert.ok(candidate, `${code}/${file}/${node.id.name}: missing function`);
      assert.deepEqual(normalize(candidate, LOCALES[code]), normalize(node, LOCALES[code]), `${code}/${file}/${node.id.name}`);
      count++;
    }
  }
}
console.log('Localized function AST comparisons passed:', count);
