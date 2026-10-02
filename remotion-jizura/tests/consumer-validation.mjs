// Install an actual tarball in a directory outside the repository. No workspace
// symlinks, tsconfig paths or repository node_modules are used by this consumer.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, mkdir, mkdtemp, cp, realpath, lstat, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
// The pinned Remotion CLI brings this parser; it is only a test dependency.
import {parse} from '@babel/parser';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage07');
const cache = process.env.JIZURA_NPM_CACHE ?? path.join(tmpdir(), 'jizura-remotion-npm-cache');
await mkdir(out, {recursive: true});
const packDir = path.join(out, 'pack'); await mkdir(packDir, {recursive: true});
const pack = JSON.parse(execFileSync('npm', ['pack', '--workspace', 'remotion-jizura', '--pack-destination', packDir, '--json', '--cache', cache], {cwd: repo, encoding: 'utf8'}))[0];
const files = pack.files.map(f => f.path);
for (const file of files) assert.ok(file === 'README.md' || file === 'LICENSE' || file === 'package.json' || /^dist\/.*\.(js|d\.ts)$/.test(file), `Unexpected packed file ${file}`);
const consumer = await mkdtemp(path.join(tmpdir(), 'jizura-stage07-consumer-'));
const manifest = {name: 'jizura-external-consumer', private: true, type: 'module', dependencies: {
  'remotion-jizura': `file:${path.join(packDir, pack.filename)}`, react: '19.3.0', 'react-dom': '19.3.0', remotion: '4.0.532',
}, devDependencies: {'@remotion/player': '4.0.532', '@remotion/bundler': '4.0.532', '@remotion/renderer': '4.0.532',
  '@types/react': '19.3.0', '@types/react-dom': '19.3.0', typescript: '7.0.2', vite: '8.3.1'}};
await writeFile(path.join(consumer, 'package.json'), JSON.stringify(manifest, null, 2));
const install = execFileSync('npm', ['install', '--cache', cache, '--prefer-offline', '--fetch-retries=0', '--fetch-timeout=15000', '--no-audit', '--no-fund'], {cwd: consumer, encoding: 'utf8'});
await writeFile(path.join(out, 'consumer-install.log'), install);
const installed = path.join(consumer, 'node_modules/remotion-jizura');
assert.equal((await lstat(installed)).isSymbolicLink(), false);
assert.ok((await realpath(installed)).startsWith(consumer + path.sep));
const installedManifest = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
assert.deepEqual(Object.keys(installedManifest.exports), ['.']);
assert.equal(installedManifest.dependencies, undefined);
// All emitted imports stay inside the packed dist/ or declared peer modules.
let importsChecked = 0;
for (const file of await readdir(path.join(installed, 'dist'), {recursive: true})) {
  if (!/\.(js|ts)$/.test(file)) continue;
  const full = path.join(installed, 'dist', file), source = await readFile(full, 'utf8');
  const specifiers = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source?.type === 'StringLiteral') specifiers.push(node.source.value);
    if (node.type === 'CallExpression' && node.callee.type === 'Import' && node.arguments[0]?.type === 'StringLiteral') specifiers.push(node.arguments[0].value);
    if (node.type === 'TSImportType' && node.argument.type === 'StringLiteral') specifiers.push(node.argument.value);
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child?.type) visit(child);
    }
  };
  visit(parse(source, {sourceType: 'module', plugins: ['typescript']}));
  for (const specifier of specifiers) {
    importsChecked++;
    if (specifier.startsWith('.')) {
      const target = path.resolve(path.dirname(full), specifier);
      assert.ok(target.startsWith(path.join(installed, 'dist') + path.sep), `Import escapes package: ${file}`);
      // Type-only imports of generated JS point at the matching .d.ts.
      await lstat(target);
    } else assert.ok(['react', 'react/jsx-runtime', 'remotion'].includes(specifier), `Undeclared dependency ${specifier}`);
  }
}
await cp(path.join(repo, 'remotion-jizura/examples/lyrics.tsx'), path.join(consumer, 'lyrics.tsx'));
await writeFile(path.join(consumer, 'entry.tsx'), `import {Composition, registerRoot} from 'remotion';
import {LyricsDemo} from './lyrics.tsx';
registerRoot(() => <Composition id="LyricsDemo" component={LyricsDemo} defaultProps={{seed:20260922,cutSeed:1234}} width={640} height={360} fps={24} durationInFrames={120} />);
`);
await writeFile(path.join(consumer, 'types.tsx'), `import {JizuraCut, JizuraScene, center, pop, wipe, drift, breathe, kasumi, checkerStrip, parseLines, type JizuraSceneProps, type JizuraCutProps} from 'remotion-jizura';
const cuts: JizuraCutProps[] = parseLines('*希望*の朝だ').map(text => ({text}));
const props: JizuraSceneProps = {durationInFrames:60};
export const Example = () => <JizuraScene {...props}>{cuts.map((cut,index) => <JizuraCut key={index} {...cut} layout={center()} enter={pop()} exit={drift()} hold={breathe()} decor={[kasumi(),checkerStrip()]} />)}</JizuraScene>;
wipe({seed:0});
// @ts-expect-error Internal plans are not public exports.
import {prepareScene} from 'remotion-jizura';
// @ts-expect-error Exports prohibit deep internal imports.
import {prepareScene as internal} from 'remotion-jizura/dist/core/scene-plan.js';
// @ts-expect-error Initial API rejects unknown effects.
const bad: JizuraCutProps = {text:'朝', enter:'unknown'};
`);
await writeFile(path.join(consumer, 'tsconfig.json'), JSON.stringify({compilerOptions: {target: 'ES2021', module: 'NodeNext', moduleResolution: 'NodeNext', jsx: 'react-jsx', strict: true, noEmit: true, allowImportingTsExtensions: true, skipLibCheck: true}, include: ['*.tsx']}, null, 2));
execFileSync(path.join(consumer, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], {cwd: consumer, stdio: 'pipe'});
const publicDir = path.join(consumer, 'public'); await mkdir(publicDir);
for (const file of ['NotoSansJP.ttf', 'OFL.txt']) await cp(path.join(repo, 'dist/remotion/stage04/assets', file), path.join(publicDir, file));
// This script resolves every library from the consumer's own installation.
await writeFile(path.join(consumer, 'render.mjs'), `import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import * as api from 'remotion-jizura';
assert.deepEqual(Object.keys(api).sort(), ['JizuraScene','JizuraCut','JizuraError','parseLines','center','pop','wipe','drift','breathe','kasumi','checkerStrip'].sort());
await assert.rejects(import('remotion-jizura/dist/core/scene-plan.js'), e=>e.code==='ERR_PACKAGE_PATH_NOT_EXPORTED');
const browserExecutable=process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
const serveUrl=await bundle({entryPoint:new URL('./entry.tsx',import.meta.url).pathname,outDir:new URL('./bundle',import.meta.url).pathname,publicDir:new URL('./public',import.meta.url).pathname});
const composition=await selectComposition({serveUrl,id:'LyricsDemo',browserExecutable});
const result=[];
for(const frame of [3,19,20,39,40,59,60,61,80,110,119]) {
  const output=new URL('./frame-'+frame+'.png',import.meta.url).pathname;
  await renderStill({serveUrl,composition,browserExecutable,frame,output,imageFormat:'png',logLevel:'error'});
  const pixels=execFileSync('ffmpeg',['-v','error','-i',output,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:2*1024*1024});
  result.push({frame,rgbaSHA256:createHash('sha256').update(pixels).digest('hex')});
}
await writeFile(new URL('./render-result.json',import.meta.url),JSON.stringify(result,null,2));
`);
const renderLog = execFileSync(process.execPath, ['render.mjs'], {cwd: consumer, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
await writeFile(path.join(out, 'consumer-render.log'), renderLog);
const result = JSON.parse(await readFile(path.join(consumer, 'render-result.json'), 'utf8'));
const expected = JSON.parse(await readFile(path.join(out, 'scene-result.json'), 'utf8')).exports.rgbaSHA256;
for (const frame of result) assert.equal(frame.rgbaSHA256, expected[frame.frame], `External consumer differs at ${frame.frame}`);
const report = {consumer, tarball: path.join(packDir, pack.filename), files, fileCount: files.length, importsChecked,
  installedPath: await realpath(installed), workspaceLink: false, typecheck: true, publicEntry: true, deepImportsRejected: true,
  dependencies: manifest, frames: result, differentPixels: 0};
await writeFile(path.join(out, 'consumer-result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({consumer, fileCount: files.length, importsChecked, typecheck: true, frames: result.length, differentPixels: 0}));
