"""Task 02 local-file/CEP browser mock; requires Playwright and installed Chrome.
Run after npm run build. No Adobe software or missing legacy cep_test assets required.
"""
import argparse
import asyncio
import functools
import http.server
import json
from pathlib import Path
import threading
from playwright.async_api import async_playwright

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / 'dist/task02'
REGISTER = """
window.__tools = [];
Object.defineProperty(document, 'modelContext', {configurable: true, value: {
  registerTool(tool) { window.__tools.push(tool.name); }
}});
"""
CEP_MOCK = r"""
window.__H = { calls: [], files: {'/fake/song.wav': [0,127,128,255]}, reads: [], writes: [], transfers: [], requires: [], hostErrors: [] };
(() => {
  const H = window.__H;
  const modules = {
    fs: {
      writeFileSync(p, d, encoding) {
        H.writes.push({path: p, encoding: encoding || null});
        H.files[p] = typeof d === 'string' ? d : Array.from(d);
      },
      readFileSync(p) { H.reads.push(p); if (!(p in H.files)) throw Error('ENOENT'); return H.files[p]; }
    },
    os: {tmpdir: () => '/tmp'},
    path: {join: (...parts) => parts.join('/')}
  };
  const require = name => { H.requires.push(name); if (!modules[name]) throw Error(name); return modules[name]; };
  const Buffer = {from: bytes => new Uint8Array(bytes)};
  if (window.__nodeMode === 'dual') window.cep_node = {require, Buffer};
  if (window.__nodeMode === 'mixed') { window.require = require; window.Buffer = Buffer; window.module = {exports: {}}; }
  window.cep = {
    fs: {showSaveDialogEx: (title, initial, types, name) => ({data: window.__decline ? '' : '/out/' + name, err: 0})},
    util: {openURLInDefaultBrowser() {}}
  };
  window.__adobe_cep__ = {
    getSystemPath: () => 'file:///fake/JIZURA%20extension',
    evalScript(code, callback) {
      H.calls.push(code);
      const host = {
        init(root) { if (root !== '/fake/JIZURA extension') throw Error(root); return JSON.stringify({ok: true, app: '22.0 mock'}); },
        selectedAudio() { return JSON.stringify({ok: true, path: '/fake/song.wav', name: 'song.wav', id: 7, start: 0}); },
        startFromFile(p, aid, light) {
          const text = H.files[p]; delete H.files[p];
          const plan = JSON.parse(text); H.transfers.push({mode: 'file', plan, aid, light});
          return JSON.stringify({ok: true, total: plan.cuts.length});
        },
        startFromString(text, aid, light) {
          const plan = JSON.parse(decodeURIComponent(text)); H.transfers.push({mode: 'string', plan, aid, light});
          return JSON.stringify({ok: true, total: plan.cuts.length});
        },
        step(ms) {
          if (ms !== 1200) throw Error(ms);
          return JSON.stringify({ok: true, done: true, name: 'JIZURA mock', cuts: H.transfers.at(-1).plan.cuts.length, secs: 0.1});
        }
      };
      setTimeout(() => {
        try { callback(code === 'typeof JZCEP' ? 'object' : new Function('JZCEP', 'return ' + code)(host)); }
        catch (e) { H.hostErrors.push(String(e)); callback('EvalScript error.'); }
      }, 0);
    }
  };
})();
"""

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--browser', default='/usr/bin/google-chrome')
    args = ap.parse_args()
    report = {'evidence': 'modern Chrome; CEP/Node API mocks, not Chromium 88 or actual AE', 'cases': []}
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(OUT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(executable_path=args.browser, args=['--no-sandbox'])
            report['browser'] = browser.version
            async def open_page(url, mode=None, block_network=False):
                page = await browser.new_page()
                errors, console, failed, network = [], [], [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda e: console.append(e.text) if e.type == 'error' else None)
                page.on('requestfailed', lambda r: failed.append({'url': r.url, 'failure': r.failure}))
                page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
                if block_network:
                    await page.route('http://**/*', lambda r: r.abort())
                    await page.route('https://**/*', lambda r: r.abort())
                await page.add_init_script(REGISTER)
                if mode:
                    await page.add_init_script(f'window.__nodeMode = {json.dumps(mode)};\n' + CEP_MOCK)
                await page.goto(url, wait_until='load')
                return page, errors, console, failed, network

            async def startup(page):
                await page.wait_for_function('window.__spike && __spike.started && __spike.probe')
                await page.wait_for_function("document.querySelector('#asset').complete && document.querySelector('#asset').naturalWidth === 24")
                assert await page.evaluate("getComputedStyle(document.querySelector('#startup')).color") == 'rgb(119, 204, 255)'

            for name in ['vite-default', 'vite-chrome88']:
                # The hosted control proves that file: failure is not a broken entry point.
                url = f'http://127.0.0.1:{server.server_port}/{name}/index.html'
                page, errors, _, failed, _ = await open_page(url)
                await startup(page)
                await page.wait_for_function('__tools.length === 18')
                assert not errors and not failed, (errors, failed)
                report['cases'].append({'name': name + '-http-control', 'startup': True, 'tools': 18})
                await page.close()
                page, errors, console, failed, network = await open_page((OUT / name / 'index.html').as_uri(), block_network=True)
                await page.wait_for_timeout(400)
                assert not await page.evaluate('!!(window.__spike && __spike.started)')
                assert any('CORS' in error or 'origin' in error for error in console), console
                assert failed and not network, (failed, network)
                report['cases'].append({'name': name + '-file', 'startup': False, 'expectedFailure': True,
                                        'console': console, 'failedRequests': failed})
                await page.close()

            for mode in ['dual', 'mixed', 'none']:
                page, errors, console, failed, network = await open_page(
                    (OUT / 'cep/com.852wa.jizura.spike/index.html').as_uri(), mode, True)
                await startup(page)
                await page.wait_for_function("document.querySelector('.ae-status').textContent.includes('接続しました')")
                assert await page.evaluate('__tools.length') == 0
                assert await page.evaluate('J.webMCP === undefined')
                await page.evaluate('J.cep.useAEAudio()')
                if mode != 'none':
                    assert await page.evaluate('__spike.audio') == {'name': 'song.wav', 'bytes': [0, 127, 128, 255]}
                    assert await page.evaluate('__H.reads') == ['/fake/song.wav']
                else:
                    assert await page.evaluate('__spike.audio === undefined')
                await page.click('#btnAE')
                await page.wait_for_function("__H.transfers.length === 1 && document.querySelector('.ae-status').textContent.includes('作成しました')")
                transfer = await page.evaluate('__H.transfers[0]')
                expected = json.loads((REPO / 'tests/baseline/v1/lrc-ja-ae-plan.json').read_text())
                assert transfer['plan'] == expected
                assert transfer['mode'] == ('string' if mode == 'none' else 'file')
                assert transfer['aid'] == (0 if mode == 'none' else 7)
                assert await page.evaluate("Object.keys(__H.files).filter(p => p.startsWith('/tmp/')).length") == 0
                saved = await page.evaluate("J.saveFile('bytes.bin', new Blob([new Uint8Array([0,127,128,255])]))")
                assert saved == ('browser-fallback' if mode == 'none' else 'saved')
                if mode != 'none':
                    assert await page.evaluate("__H.files['/out/bytes.bin']") == [0, 127, 128, 255]
                    await page.evaluate('window.__decline = true')
                    assert await page.evaluate("J.saveFile('declined.bin', 'x')") == 'declined'
                    assert not await page.evaluate("'/out/declined.bin' in __H.files")
                    await page.evaluate('window.__decline = false')
                # Actual vendored muxer, independent of the browser's VideoEncoder API.
                muxer = await page.evaluate("""async () => {
                  const target = new Mp4Muxer.ArrayBufferTarget();
                  const muxer = new Mp4Muxer.Muxer({target, video: {codec: 'avc', width: 16, height: 16}, fastStart: 'in-memory'});
                  muxer.addVideoChunkRaw(new Uint8Array([0,0,0,1,101,0]), 'key', 0, 41667,
                    {decoderConfig: {codec: 'avc1.42001e', description: new Uint8Array([1,66,0,30,255,225,0,4,103,66,0,30,1,0,2,104,0])}});
                  muxer.finalize();
                  const data = new Uint8Array(target.buffer);
                  const saved = await J.saveFile('muxer.mp4', new Blob([data]));
                  return {bytes: data.length, ftyp: String.fromCharCode(...data.slice(4,8)), saved,
                    commonjs: !window.module || module.exports.Muxer === Mp4Muxer.Muxer};
                }""")
                assert muxer['bytes'] > 100 and muxer['ftyp'] == 'ftyp' and muxer['commonjs']
                if mode != 'none':
                    assert len(await page.evaluate("__H.files['/out/muxer.mp4']")) == muxer['bytes']
                assert not await page.evaluate('__H.hostErrors')
                assert not errors and not console and not failed and not network, (errors, console, failed, network)
                await page.screenshot(path=str(OUT / f'cep-{mode}.png'))
                report['cases'].append({'name': f'cep-classic-file-{mode}', 'startup': True, 'tools': 0,
                                        'transfer': transfer['mode'], 'cuts': len(expected['cuts']), 'save': saved,
                                        'muxer': muxer, 'httpRequests': 0})
                await page.close()

            page, errors, console, failed, network = await open_page((OUT / 'offline/JIZURA-spike.html').as_uri(), block_network=True)
            await startup(page)
            await page.wait_for_function('__tools.length === 18')
            assert await page.evaluate("typeof Mp4Muxer.Muxer") == 'function'
            assert not errors and not console and not failed and not network, (errors, console, failed, network)
            assert await page.evaluate("[...document.querySelectorAll('script')].every(s => !s.src && s.type !== 'module')")
            await page.screenshot(path=str(OUT / 'offline.png'))
            report['cases'].append({'name': 'offline-inline-file', 'startup': True, 'tools': 18, 'httpRequests': 0})
            await browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (OUT / 'browser-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    asyncio.run(main())
