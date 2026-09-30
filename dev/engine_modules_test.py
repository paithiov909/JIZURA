"""Compare module-only engine output against the task-01 source in one Chrome/font environment.

The baseline source is extracted read-only from git into a temporary directory.
Only this reference assembly uses concatenation; the engine under test is a Vite
module graph, with no UI or WebMCP. Noise is reset identically before each frame.
"""
import argparse
import asyncio
import base64
import hashlib
import io
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
BASELINE = "d217fb0a06d0f81bc31f8b31b9646c30dc540f82"
OUT = ROOT / "dist/task04"
PROBE = r"""({project, version}) => {
  const J = window.createJizuraEngine ? window.createJizuraEngine(version) : window.J;
  const p = window.createJizuraEngine ? J.mergeProject(project) : project;
  const plan = J.plan(p, null);
  const render = (time, options) => {
    let seed = 123456;
    const original = Math.random;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    try {
      const renderer = new J.Renderer(), canvas = document.createElement('canvas');
      canvas.width = 480; canvas.height = 270;
      renderer.frame(canvas.getContext('2d'), plan, time, {scale: 0.25, ...options});
      return canvas.toDataURL('image/png');
    } finally { Math.random = original; }
  };
  return {plan: JSON.parse(JSON.stringify(plan)), ae: J.planForAE(plan, p), frames: {
    '1.2': render(1.2, {}), '3.2': render(3.2, {}),
    'front': render(3.2, {transparent:true, layer:'front'}),
    'back': render(3.2, {transparent:true, layer:'back'})
  }, editor: !!J.ui, webmcp: !!J.webmcp};
}"""


def fixture(name):
    return json.loads((ROOT / f"tests/baseline/v1/{name}.json").read_text(encoding="utf-8"))


def png(data):
    return base64.b64decode(data.split(",", 1)[1])


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", default="/usr/bin/google-chrome")
    args = parser.parse_args()
    subprocess.run(["node", "build/build-engine-test.mts"], cwd=ROOT, check=True)
    files = subprocess.check_output(["git", "ls-tree", "-r", "--name-only", BASELINE, "src"], cwd=ROOT, text=True).splitlines()
    # Task-01 exact initialization order, used ONLY to build the immutable reference.
    files = [f for f in files if f.endswith('.js') and not f.endswith(('12_ui.js', '13_webmcp.js'))]
    baseline = "\n".join(subprocess.check_output(["git", "show", f"{BASELINE}:{f}"], cwd=ROOT, text=True) for f in files)
    version = (ROOT / "VERSION").read_text().strip()
    baseline = baseline.replace("@VERSION@", version)
    report = {"baseline": BASELINE, "evidence": "module-only Node/Vite engine and same-environment modern Chrome canvas; no actual AE", "cases": []}
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='jizura-engine-reference-') as directory:
        ref = Path(directory) / 'baseline.html'
        ref.write_text('<!doctype html><meta charset="utf-8"><script>' + baseline + '</script>', encoding='utf-8')
        module = OUT / 'engine/index.html'
        module.write_text('<!doctype html><meta charset="utf-8"><script src="engine.js"></script>', encoding='utf-8')
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(executable_path=args.browser, args=['--no-sandbox'])
            report['browser'] = browser.version
            for name in ['lrc-ja', 'portrait-en']:
                variants = [('fixture', fixture(name+'-project'))]
                if name == 'lrc-ja':
                    p = fixture(name+'-project')
                    p.update(unify=True, typeset=True, centerFree=True, aspect='9:16', centerDir='lr')
                    variants.append(('unify-typeset-sidebands', p))
                for variant, project in variants:
                    results = []
                    for url in [ref.as_uri(), module.as_uri()]:
                        page = await browser.new_page()
                        errors = []
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        await page.route('https://**/*', lambda route: route.abort())
                        await page.goto(url)
                        assert not errors, (url, errors)
                        assert await page.evaluate('!!(window.J || window.createJizuraEngine)'), (url, await page.content())
                        result = await page.evaluate(PROBE, {'project': project, 'version': version})
                        assert not errors, errors
                        assert not result['editor'] and not result['webmcp']
                        results.append(result)
                        await page.close()
                    old, new = results
                    assert old['plan'] == new['plan'], f'{name}/{variant}: full plan changed'
                    assert old['ae'] == new['ae'], f'{name}/{variant}: full AE plan changed'
                    frames = []
                    for time, data in new['frames'].items():
                        current = png(data)
                        reference = png(old['frames'][time])
                        image = Image.open(io.BytesIO(current)).convert('RGBA')
                        reference_image = Image.open(io.BytesIO(reference)).convert('RGBA')
                        assert image.size == reference_image.size == (480, 270)
                        assert image.tobytes() == reference_image.tobytes(), f'{name}/{variant}/{time}: pixels changed'
                        artifact = OUT / f'{name}-{variant}-{time}.png'
                        artifact.write_bytes(current)
                        frame = {'time': time, 'pixels': 'exact', 'sha256': hashlib.sha256(current).hexdigest()}
                        if name == 'lrc-ja' and variant == 'fixture' and time in ['1.2', '3.2']:
                            original = Image.open(ROOT / f'tests/baseline/v1/lrc-ja-frame{time}.png').convert('RGBA')
                            diff = ImageChops.difference(image, original)
                            values = list(diff.getdata())
                            frame['fixtureMeanAbsoluteChannelDifference'] = sum(sum(v) for v in values) / (480*270*4)
                            # Stored frames contain unseeded texture/noise. Same-source pixels
                            # above prove algorithm parity; retain this image for visual review.
                            diff.save(OUT / f'fixture-diff-{time}.png')
                        frames.append(frame)
                    report['cases'].append({'project':name, 'variant':variant, 'fullPlan':'exact', 'aePlan':'exact', 'frames':frames})
            await browser.close()
    (OUT / 'engine-browser-results.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    asyncio.run(main())
