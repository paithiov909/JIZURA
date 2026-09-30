import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { repo } from '../vite.config.mts';
import { EDITIONS, PUBLIC_BASE, type LocaleCode } from '../i18n/index.ts';

/** Copy original modules unchanged. Every locale uses the same source graph. */
async function copyModules(root: string, entries: string[]): Promise<void> {
  const seen = new Set<string>();
  async function visit(source: string): Promise<void> {
    if (seen.has(source)) return;
    seen.add(source);
    const content = await readFile(path.join(repo, source), 'utf8');
    const destination = path.join(root, source);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(repo, source), destination);
    for (const match of content.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
      await visit(path.posix.normalize(path.posix.join(path.posix.dirname(source), match[1]!)));
    }
  }
  for (const source of entries) await visit(source);
}
const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export async function prepareBrowser(root: string, version: string, language?: LocaleCode, cep = false, offline = false): Promise<void> {
  const body = (await readFile(path.join(repo, 'ui/body.html'), 'utf8')).replace('@VERSION@', version);
  const css = await readFile(path.join(repo, 'ui/style.css'), 'utf8');
  const muxer = '/*! mp4-muxer v5.2.2 | MIT License | (c) 2023 Vanilagy | see THIRD_PARTY_NOTICES.md */\n' + await readFile(path.join(repo, 'vendor/mp4-muxer.min.js'), 'utf8');
  for (const locale of EDITIONS) {
    if (language && locale.code !== language) continue;
    const directory = path.join(root, locale.folder);
    await mkdir(directory, { recursive: true });
    const canonical = PUBLIC_BASE + (locale.folder ? locale.folder + '/' : '');
    const alternates = EDITIONS.map(edition => `<link rel="alternate" hreflang="${edition.htmlLang}" href="${PUBLIC_BASE}${edition.folder ? edition.folder + '/' : ''}">`).join('\n');
    const html = `<!doctype html>
<html lang="${locale.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escape(locale.title)}</title>
<meta name="description" content="${escape(locale.description)}">
<link rel="canonical" href="${canonical}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="${escape(locale.title)}">
<meta property="og:description" content="${escape(locale.description)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
</head>
<body>
${body}
<script src="./mp4-muxer.js"></script>
<script type="module" src="./entry.ts"></script>
</body>
</html>
`;
    await copyModules(directory, ['engine/index.ts', 'ui/application.ts', cep ? 'cep/cep.js' : 'src/13_webmcp.js']);
    // Entry imports are authored as modules, never translated or assembled JS.
    await writeFile(path.join(directory, 'entry.ts'), `import './style.css';
import { createEngine } from './engine/index.ts';
import { createEditorApplication } from './ui/application.ts';
${cep ? "import installCEP from './cep/cep.js';" : "import installAdapter from './src/13_webmcp.js';"}
const engine = createEngine(${JSON.stringify(version)});
Object.assign(window, { J: engine });
const application = createEditorApplication(engine, ${JSON.stringify(locale.code)}, { offline: ${offline} });
Object.assign(window, { jizuraApp: application });
${cep ? 'installCEP(engine);' : 'installAdapter(engine);'}
`);
    await writeFile(path.join(directory, 'style.css'), css + (cep && locale.code === 'en' ? '\nhtml.cep .lang-switch{display:none}\n' : ''));
    await writeFile(path.join(directory, 'mp4-muxer.js'), muxer);
    await writeFile(path.join(directory, 'index.html'), html);
  }
  const alternatives = EDITIONS.map(edition => `<xhtml:link rel="alternate" hreflang="${edition.htmlLang}" href="${PUBLIC_BASE}${edition.folder ? edition.folder + '/' : ''}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${PUBLIC_BASE}"/>`;
  const date = new Date().toISOString().slice(0, 10);
  const urls = EDITIONS.map(locale => `<url><loc>${PUBLIC_BASE}${locale.folder ? locale.folder + '/' : ''}</loc><lastmod>${date}</lastmod>${alternatives}</url>`).join('\n');
  await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}\n</urlset>\n`);
}
