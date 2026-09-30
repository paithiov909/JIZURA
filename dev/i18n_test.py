"""Focused runtime locale/route check with installed Chrome (no Adobe runtime).
Requires build:web, build:offline and optional Playwright from task 02.
"""
import argparse
import asyncio
import functools
import hashlib
import http.server
import json
from pathlib import Path
import threading

from playwright.async_api import async_playwright
from build_foundation_test import Handler
import baseline_capture as baseline

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist'
# Exclude only scripts, localization bindings/comments and the separately tested
# language nav. Preserve static node topology, authored whitespace and attributes.
SNAPSHOT = r"""node => {
  const visit = node => {
    if (node.nodeType === 3) return node.parentElement?.classList.contains('ver') ? '@VERSION@' : node.nodeValue;
    if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.classList.contains('lang-switch')) return null;
    return [node.tagName.toLowerCase(), [...node.attributes].filter(a => !a.name.startsWith('data-i18n')).map(a => [a.name, a.value]).sort((a,b)=>a[0].localeCompare(b[0])), [...node.childNodes].map(visit).filter(n=>n!==null && !(node.tagName === 'BODY' && typeof n === 'string' && !n.trim()))];
  };
  return JSON.stringify(visit(node));
}"""
CAPTURE = r"""(() => {
  try { localStorage.setItem('jizura.tourDone', '1'); } catch (error) {}
  const snapshot = __SNAPSHOT__;
  let engine;
  Object.defineProperty(window, 'J', {
    configurable: true, get: () => engine,
    set: value => {
      engine = value;
      const Renderer = engine.Renderer;
      engine.Renderer = class extends Renderer {
        constructor(...args) {
          super(...args);
          if (!window.__localeBody) window.__localeBody = snapshot(document.body);
        }
      };
    }
  });
})();""".replace('__SNAPSHOT__', '(' + SNAPSHOT + ')')


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', default='/usr/bin/google-chrome')
    # One-time capture is fed old, already localized HTML; it never imports the
    # new locale dictionaries. Provenance is documented alongside the fixture.
    parser.add_argument('--capture-legacy', type=Path)
    args = parser.parse_args()
    report = {'evidence': 'modern Chrome hosted/offline; no Adobe runtime', 'cases': []}
    server = None
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(executable_path=args.browser, args=['--no-sandbox'])
            if args.capture_legacy:
                legacy = json.loads(args.capture_legacy.read_text())
                result = {}
                page = await browser.new_page()
                for code, data in legacy.items():
                    await page.set_content(data['body'].replace('@VERSION@', (ROOT / 'VERSION').read_text().strip()))
                    snapshot = await page.evaluate('(' + SNAPSHOT + ')(document.body)')
                    (OUT / 'task06').mkdir(exist_ok=True)
                    (OUT / 'task06' / f'legacy-body-{code}.json').write_text(snapshot)
                    result[code] = hashlib.sha256(snapshot.encode()).hexdigest()
                (ROOT / 'tests/i18n/legacy-body.json').write_text(json.dumps(result, indent=2) + '\n')
                await browser.close()
                return
            class WebHandler(Handler):
                def translate_path(self, request_path):
                    if request_path.startswith('/JIZURA/'):
                        self.path = request_path[len('/JIZURA'):]
                    return super().translate_path(self.path)
            server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(WebHandler, directory=str(OUT / 'web')))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            prefix = f'http://127.0.0.1:{server.server_port}/JIZURA/'
            hashes = json.loads((ROOT / 'tests/i18n/legacy-body.json').read_text())
            metadata = json.loads((ROOT / 'tests/baseline/v1/locales.json').read_text())
            project = json.loads((ROOT / 'tests/baseline/v1/lrc-ja-project.json').read_text())
            for target in ['web', 'offline']:
                for code, route in baseline.ROUTES.items():
                    page = await browser.new_page()
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    await page.route('https://**/*', lambda request: request.abort())
                    await page.add_init_script(CAPTURE)
                    url = prefix + (route + '/' if route else '') if target == 'web' else (OUT / 'offline' / f'JIZURA{"_" + route if route else ""}.html').as_uri()
                    await page.goto(url)
                    await page.wait_for_function('window.J && J.ui && !J.ui.loading.boot')
                    snapshot = await page.evaluate('window.__localeBody')
                    (OUT / 'task06').mkdir(exist_ok=True)
                    (OUT / 'task06' / f'{target}-body-{code}.json').write_text(snapshot)
                    assert hashlib.sha256(snapshot.encode()).hexdigest() == hashes[code], f'{target}/{code}: static translated DOM changed'
                    expected = metadata[code]
                    assert await page.title() == expected['title']
                    assert await page.locator('html').get_attribute('lang') == expected['locale']
                    assert await page.locator('link[rel=canonical]').get_attribute('href') == expected['canonical']
                    assert await page.locator('link[rel=alternate]').evaluate_all('nodes => nodes.map(n => [n.hreflang, n.href])') == expected['alternates']
                    assert await page.locator('meta[property="og:url"]').get_attribute('content') == expected['canonical']
                    assert await page.locator('.lang-switch option').count() == 7
                    # Exercise late-created UI and export errors, rather than only
                    # initial labels: loop modes, tour, line editor, switches.
                    await page.click('#btnLoop')
                    assert await page.locator('#btnLoop').text_content() == await page.evaluate('J.i18n.t("ui.line_loop")')
                    assert await page.locator('#btnLoop').get_attribute('title') == await page.evaluate('J.i18n.t("ui.loop_this_line")')
                    await page.click('#modeEasy')
                    await page.click('#btnTour')
                    assert await page.locator('#tourTitle').text_content() == await page.evaluate('J.i18n.t("ui.1_enter_lyrics")')
                    await page.locator('.tour-skip').click()
                    await page.evaluate('project => J.uiApi.editor.importProject(project)', project)
                    await page.click('#modePro')
                    edit = page.locator('#lineList .edit').first
                    await edit.click()
                    assert await page.locator('#lineList .txt-edit').get_attribute('aria-label') == await page.evaluate('J.i18n.t("ui.lyrics_of_line", [1])')
                    assert await page.locator('#lineList .txt-edit').get_attribute('title') == await page.evaluate('J.i18n.t("ui.lyric_syntax_works_here_too_cut_emphasis")')
                    await page.locator('#lineList .txt-edit').press('Escape')
                    error = await page.evaluate('''async () => {
                      try { await J.exportPNGZip({plan: {...J.ui.plan, duration: 70000, fps: 1}, project: J.ui.project}); }
                      catch (error) { return error.message; }
                    }''')
                    assert error == await page.evaluate('J.i18n.t("export.the_zip_would_be_too_large_65")')
                    assert not errors, errors
                    report['cases'].append({'target': target, 'locale': code, 'staticDOM': 'baseline match', 'dynamicUI': 'passed', 'metadata': 'passed'})
                    await page.close()
            # Actual select navigation: same-origin project/volume/mode state,
            # including a lyric edit with the 700 ms autosave still pending.
            page = await browser.new_page()
            await page.add_init_script("try { localStorage.setItem('jizura.tourDone', '1'); } catch (error) {}")
            await page.route('https://**/*', lambda request: request.abort())
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for index, (code, route) in enumerate(baseline.ROUTES.items()):
                if index == 0:
                    await page.goto(prefix)
                    await page.wait_for_function('window.J && J.ui && !J.ui.loading.boot')
                    await page.evaluate('project => J.uiApi.editor.importProject(project)', project)
                    await page.click('#modePro')
                    await page.locator('#vol').evaluate("element => {element.value = '35'; element.dispatchEvent(new Event('input'));}")
                text = f'Pending edit {index}\nsecond line'
                await page.locator('#lyrics').fill(text)
                expected = await page.evaluate('J.uiApi.editor.projectData(false)')
                next_code, next_route = list(baseline.ROUTES.items())[(index + 1) % 7]
                async with page.expect_navigation():
                    await page.locator('.lang-switch select').select_option(label=await page.locator(f'.lang-switch option[lang="{metadata[next_code]["locale"]}"]').text_content())
                await page.wait_for_function('window.J && J.ui && !J.ui.loading.boot')
                assert page.url == prefix + (next_route + '/' if next_route else '') + 'index.html'
                assert await page.evaluate('J.uiApi.editor.projectData(false)') == expected, f'{code} -> {next_code}: project changed'
                assert await page.locator('#vol').input_value() == '35'
                assert await page.evaluate('J.ui.mode') == 'pro'
                report['cases'].append({'target': 'navigation', 'from': code, 'to': next_code, 'project': 'preserved', 'pendingSave': 'preserved', 'volumeAndMode': 'preserved'})
            assert not errors, errors
            await browser.close()
    finally:
        if server:
            server.shutdown()
            server.server_close()
    (OUT / 'task06-browser-results.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    asyncio.run(main())
