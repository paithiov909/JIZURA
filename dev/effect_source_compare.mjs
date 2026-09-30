import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { parse } from 'acorn';

const root = path.resolve(import.meta.dirname, '..');
// Migration-only comparison against the accepted task-04 source snapshot.
// Rendering comparisons use the immutable task-01 sources separately.
const reference = '9e85599b6aca6685fb96d91ef906be267afb02e5';
const mapping = {
  '05_anim.js': 'effects/core/animation.ts',
  '06_layouts.js': 'effects/core/layouts.ts',
  '07_decor.js': 'effects/core/decor.ts',
};
const packs = ['bgcamB', 'decor', 'decorB', 'enter', 'enterB', 'exit', 'exitB', 'fxB',
  'horror1', 'horror2', 'horror3', 'kinetic1', 'kinetic2', 'kinetic3', 'layoutsA', 'layoutsB',
  'layoutsC', 'layoutsD', 'looks', 'styles', 'treattrans', 'typo1', 'typo2', 'typo3'];
for (const name of packs) mapping[`11p_${name}.js`] = `effects/packs/${name}.ts`;
const parserOptions = { ecmaVersion: 'latest', sourceType: 'module' };

function clean(node) {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== 'object') return node;
  const result = {};
  for (const [key, value] of Object.entries(node)) {
    if (['start', 'end', 'raw'].includes(key)) continue;
    if (key === 'name' && value === 'registerBaseline') result[key] = 'register';
    // kinetic1's old helper ignored the optional third pack argument.
    else if (key === 'params') result[key] = value.filter(param => param.name !== '_pack').map(clean);
    else result[key] = clean(value);
  }
  return result;
}
function sources(old) {
  const previous = parse(execFileSync('git', ['show', `${reference}:src/${old}`], {
    cwd: root, encoding: 'utf8',
  }), parserOptions);
  const current = parse(stripTypeScriptTypes(readFileSync(path.join(root, mapping[old]), 'utf8')), parserOptions);
  current.body = current.body.filter(node => node.type !== 'ImportDeclaration');
  return [previous, current];
}
for (const name of packs) {
  const file = `11p_${name}.js`, [previous, current] = sources(file);
  assert.deepEqual(clean(current), clean(previous), `${file}: algorithm differs after type erasure`);
}
console.log(`All ${packs.length} pack algorithms are AST-equivalent after type erasure and registration rename`);

function normalizeCore(ast) {
  ast.body = ast.body.filter(node => node.type !== 'ImportDeclaration');
  const maps = { enter: 'ENTER', hold: 'HOLD', exit: 'EXIT', layout: 'LAYOUTS', decor: 'DECOR' };
  function normalizeBlock(statements) {
    return statements.flatMap(node => {
      const expression = node.type === 'ExpressionStatement' ? node.expression : null;
      if (expression?.type === 'CallExpression' && expression.callee.property?.name === 'registerBaselineAll') return [];
      if (expression?.type === 'AssignmentExpression' && expression.left.type === 'MemberExpression' &&
          /^(LAYOUT|ENTER|HOLD|EXIT|DECOR)_ORDER$/.test(expression.left.property.name)) return [];
      if (node.type === 'VariableDeclaration' && node.declarations.length === 1 && maps[node.declarations[0].id.name]) {
        const declaration = node.declarations[0];
        return [{ type: 'ExpressionStatement', expression: {
          type: 'AssignmentExpression', operator: '=',
          left: { type: 'MemberExpression', object: { type: 'Identifier', name: 'J' },
            property: { type: 'Identifier', name: maps[declaration.id.name] }, computed: false, optional: false },
          right: declaration.init,
        } }];
      }
      walk(node);
      return [node];
    });
  }
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'BlockStatement') node.body = normalizeBlock(node.body);
    else for (const [key, value] of Object.entries(node)) {
      if (['start', 'end'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  }
  ast.body = normalizeBlock(ast.body);
  return ast;
}
for (const file of ['05_anim.js', '06_layouts.js', '07_decor.js']) {
  const [previous, current] = sources(file);
  assert.deepEqual(clean(normalizeCore(current)), clean(normalizeCore(previous)), `${file}: core algorithm differs`);
}
console.log('All 3 core effect algorithms are AST-equivalent after explicit registry wiring normalization');
