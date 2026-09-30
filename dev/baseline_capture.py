"""Capture the v1.x task-01 browser contract from freshly built legacy pages.

Run ``python3 build.py`` first. Chrome renders the unchanged generated page with a
small, temporary probe appended to it. Only fixtures under tests/baseline/v1 are
written; generated HTML remains a build product.
"""
import base64
import argparse
import html
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests/baseline/v1"
CHROME = "/usr/bin/google-chrome"
ROUTES = {"ja": "", "en": "en", "zh-Hant": "zh-hant", "zh-Hans": "zh-hans", "ko": "ko", "id": "id", "vi": "vi"}
LYRICS = "[ti:Baseline Song]\n[ar:JIZURA]\n[00:00.00]夜明けの色を/覚えてる\n[00:02.40]*透明*なまま!\n[00:04.80][間奏 2]\n[00:07.00]Good night|またね"

PROBE = r"""
<script>
window.__baselineTools = [];
Object.defineProperty(document, 'modelContext', {value: {
  registerTool: async def => { window.__baselineTools.push({name:def.name, inputSchema:def.inputSchema, annotations:def.annotations}); },
  unregisterTool: () => {}
}});
</script>
"""
RESULT = r"""
<script>
window.addEventListener('load', async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    const locale = document.documentElement.lang;
    const output = {
      locale, title: document.title,
      canonical: document.querySelector('link[rel="canonical"]').href,
      alternates: [...document.querySelectorAll('link[rel="alternate"]')].map(x => [x.hreflang, x.href]),
      sampleLyrics: J.SAMPLE_LYRICS,
      styleNames: Object.fromEntries(J.STYLE_ORDER.map(k => [k, J.STYLES[k].name])),
      moodNames: Object.fromEntries(Object.entries(J.MOODS).map(([k,v]) => [k, v.name])),
      representativePartNames: Object.fromEntries(J.GROUP_KEYS.map(g => [g, Object.fromEntries([0, Math.floor(J.order(g).length / 2), J.order(g).length - 1].map(i => {
        const id = J.order(g)[i]; return [id, J.registry(g)[id].name];
      }))])),
      representativeLabels: {
        menu: document.querySelector('#btnMenu').textContent.trim(),
        lyrics: document.querySelector('#lyrics').getAttribute('aria-label'),
        exportMP4: document.querySelector('#btnMP4').textContent.trim(),
        layoutCenter: J.LAYOUTS.center.name
      },
      webmcp: window.__baselineTools,
    };
    if (locale === 'ja') {
      const cases = [
        {name:'lrc-ja', seed:42, style:'noir', aspect:'16:9', lyrics: __LYRICS__},
        {name:'portrait-en', seed:7, style:'paper', aspect:'9:16', lyrics:'[00:00.00]Hello/world\n[00:02.00]Good night'}
      ];
      output.registry = Object.fromEntries(J.GROUP_KEYS.map(g => [g, J.order(g).map(id => {
        const d = J.registry(g)[id]; return {id, pack:d.pack || 'core', name:d.name, ae:d.ae || (J.AE_MAP && J.AE_MAP[g] && J.AE_MAP[g][id]) || null, special:!!d.special};
      })]));
      output.styles = J.STYLE_ORDER.slice();
      output.fonts = Object.keys(J.FONTS);
      output.cases = [];
      for (const spec of cases) {
        const project = J.defaultProject();
        Object.assign(project, {lyrics:spec.lyrics, title:'Baseline Song', artist:'JIZURA', seed:spec.seed, style:spec.style, aspect:spec.aspect, extra:false});
        project.timing = {bpm:0, offset:0, snap:false, tail:0.5, lineTimes:{}, lineScale:1};
        const plan = J.plan(project, null);
        const cuts = plan.cuts.map(c => ({text:c.text, line:c.line, layout:c.layout, enter:c.enter, hold:c.hold, exit:c.exit,
          decor:c.decor.map(d=>d.id), treat:c.treat, bg:c.bg, cam:c.cam, trans:c.trans || null,
          start:c.start, end:c.end, seed:c.seed}));
        await J.uiApi.editor.importProject(project);
        const savedProject = J.uiApi.editor.projectData(false);
        output.cases.push({name:spec.name, seed:spec.seed, project:savedProject, planSummary:{duration:plan.duration, W:plan.W, H:plan.H, lines:plan.lines, cuts}});
        if (spec.name === 'lrc-ja') {
          output.aePlan = J.planForAE(plan, project);
          const r = new J.Renderer(), c = document.createElement('canvas');
          c.width = 480; c.height = 270;
          for (const t of [1.2, 3.2]) {
            r.frame(c.getContext('2d'), plan, t, {scale:0.25});
            output['frame'+t] = c.toDataURL('image/png');
          }
        }
      }
    }
    const el = document.createElement('pre'); el.id='baseline-result';
    el.textContent = btoa(unescape(encodeURIComponent(JSON.stringify(output)))); document.body.appendChild(el);
  } catch (e) {
    const el = document.createElement('pre'); el.id='baseline-error'; el.textContent=String(e.stack || e); document.body.appendChild(el);
  }
});
</script>
"""


def capture(page):
    source = page.read_text(encoding="utf-8")
    source = source.replace("<script>", PROBE + "<script>", 1)
    source = source.replace("</body>", RESULT.replace("__LYRICS__", json.dumps(LYRICS, ensure_ascii=False)) + "</body>", 1)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".html", prefix="jizura-baseline-", dir=page.parent, encoding="utf-8", delete=False) as f:
        f.write(source)
        probe = Path(f.name)
    try:
        run = subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--disable-background-networking",
                              "--virtual-time-budget=3000", "--dump-dom", probe.as_uri()], capture_output=True, text=True, timeout=45)
        match = re.search(r'<pre id="baseline-result">([^<]+)</pre>', run.stdout)
        if not match:
            err = re.search(r'<pre id="baseline-error">([^<]+)</pre>', run.stdout)
            raise RuntimeError(f"Chrome probe failed ({run.returncode}): {html.unescape(err.group(1)) if err else run.stderr[-1200:]}")
        return json.loads(base64.b64decode(html.unescape(match.group(1))))
    finally:
        probe.unlink()


CHECK = False


def write_bytes(name, data):
    path = OUT / name
    if CHECK:
        if not path.exists() or path.read_bytes() != data:
            raise AssertionError(f"baseline changed: {path}")
    else:
        path.write_bytes(data)


def write_json(name, data):
    write_bytes(name, (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


def main():
    global CHECK
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="compare against committed fixtures without writing")
    CHECK = parser.parse_args().check
    OUT.mkdir(parents=True, exist_ok=True)
    locales = {}
    base_tools = None
    for code, folder in ROUTES.items():
        result = capture(ROOT / folder / "index.html")
        print(code, result["locale"], len(result["webmcp"]), "tools")
        if len(result["webmcp"]) != 18:
            raise AssertionError(f"{code}: expected 18 tools")
        if base_tools is None: base_tools = result["webmcp"]
        elif result["webmcp"] != base_tools: raise AssertionError(f"{code}: WebMCP schema differs from Japanese edition")
        if code == "ja":
            write_json("registry.json", {"groups": result.pop("registry"), "styles": result.pop("styles"), "fonts": result.pop("fonts")})
            write_json("webmcp.json", result.pop("webmcp"))
            cases = result.pop("cases")
            for case in cases:
                name = case.pop("name")
                write_json(f"{name}-project.json", case.pop("project"))
                write_json(f"{name}-plan-summary.json", case)
            write_json("lrc-ja-ae-plan.json", result.pop("aePlan"))
            for key in ["frame1.2", "frame3.2"]:
                data = result.pop(key)
                if not CHECK: write_bytes(f"lrc-ja-{key}.png", base64.b64decode(data.split(",", 1)[1]))
        else:
            result.pop("webmcp")
        locales[code] = result
    write_json("locales.json", locales)
    with tempfile.NamedTemporaryFile(suffix=".jsx", prefix="jizura-baseline-ae-", delete=False) as f:
        ae_file = Path(f.name)
    try:
        subprocess.run(["python3", str(ROOT / "build_ae.py"), "--lang", "ja", "--out", str(ae_file)], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
        ae_registry = json.loads(subprocess.check_output(["node", str(ROOT / "dev/baseline_ae_registry.js"), str(ae_file)], cwd=ROOT, text=True))
        write_json("ae-implementations.json", ae_registry)
    finally:
        ae_file.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
