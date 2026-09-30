"""Verify hosted Vite, file: offline, and file: CEP builds separately.

Requires the task-02 Playwright requirements and installed Chrome. The existing
task-01 probe checks unchanged fixtures; CEP's API is mocked, not actual AE.
"""
import argparse
import asyncio
import base64
import functools
import http.server
import importlib.util
import json
from pathlib import Path
import threading

from playwright.async_api import async_playwright
import baseline_capture as baseline

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist"
spec = importlib.util.spec_from_file_location("spike_browser", ROOT / "dev/cep-offline-spike/browser_test.py")
spike = importlib.util.module_from_spec(spec)
spec.loader.exec_module(spike)


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def fixture(name):
    return json.loads((ROOT / "tests/baseline/v1" / name).read_text(encoding="utf-8"))


def compare(output, code):
    assert output.pop("webmcp") == fixture("webmcp.json"), f"{code}: WebMCP definitions changed"
    if code == "ja":
        registry = {"groups": output.pop("registry"), "styles": output.pop("styles"), "fonts": output.pop("fonts")}
        assert registry == fixture("registry.json"), "stable registry changed"
        for case in output.pop("cases"):
            name = case.pop("name")
            assert case.pop("project") == fixture(f"{name}-project.json"), f"{name}: project changed"
            assert case == fixture(f"{name}-plan-summary.json"), f"{name}: deterministic plan changed"
        assert output.pop("aePlan") == fixture("lrc-ja-ae-plan.json"), "AE plan boundary changed"
        # Rendering is exercised but pixel equivalence belongs to tasks 04/11.
        for key in ["frame1.2", "frame3.2"]:
            assert output.pop(key).startswith("data:image/png;base64,")
    assert output == fixture("locales.json")[code], f"{code}: metadata/labels changed"


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", default="/usr/bin/google-chrome")
    args = parser.parse_args()
    # Serve at the production base, including a non-root deployment path.
    class WebHandler(Handler):
        def translate_path(self, request_path):
            if request_path.startswith("/JIZURA/"):
                self.path = request_path[len("/JIZURA"):]
                return super().translate_path(self.path)
            return super().translate_path(request_path)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(WebHandler, directory=str(OUT / "web")))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    report = {"evidence": "modern Chrome hosted/offline; CEP API mock, no actual AE/CEP", "cases": []}
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(executable_path=args.browser, args=["--no-sandbox"])
            report["browser"] = browser.version
            for target in ["web", "offline"]:
                for code, route in baseline.ROUTES.items():
                    page = await browser.new_page()
                    errors, failed_local = [], []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.on("requestfailed", lambda request: failed_local.append(request.url) if not request.url.startswith("https://fonts.") else None)
                    # Optional Google Fonts remain remote, as in the baseline.
                    # Prove that editor startup needs no remote service.
                    await page.route("https://**/*", lambda request: request.abort())
                    await page.add_init_script(baseline.PROBE.removeprefix("\n<script>\n").removesuffix("\n</script>\n"))
                    if target == "web":
                        url = f"http://127.0.0.1:{server.server_port}/JIZURA/{route + '/' if route else ''}"
                    else:
                        url = (OUT / "offline" / f"JIZURA{'_' + route if route else ''}.html").as_uri()
                    await page.goto(url)
                    await page.wait_for_function("window.J && J.ui && J.ui.plan && !J.ui.loading.boot")
                    source = baseline.RESULT.removeprefix("\n<script>\n").removesuffix("\n</script>\n")
                    source = source.replace("window.addEventListener('load', async () => {", "(async () => {")
                    source = source.removesuffix("\n").removesuffix("});") + "})();"
                    source = source.replace("__LYRICS__", json.dumps(baseline.LYRICS, ensure_ascii=False))
                    await page.evaluate(source)
                    error = page.locator("#baseline-error")
                    assert await error.count() == 0, await error.text_content() if await error.count() else ""
                    result = await page.locator("#baseline-result").text_content()
                    compare(json.loads(base64.b64decode(result)), code)
                    assert not errors, errors
                    assert not failed_local, failed_local
                    report["cases"].append({"target": target, "locale": code, "fixtures": "passed", "pageErrors": errors})
                    await page.close()

            for language in ["ja", "en"]:
                for mode in ["dual", "mixed", "none"]:
                    page = await browser.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    await page.route("https://**/*", lambda request: request.abort())
                    await page.add_init_script(spike.REGISTER)
                    await page.add_init_script(f"window.__nodeMode = {json.dumps(mode)};" + spike.CEP_MOCK)
                    extension = "com.852wa.jizura" + (".en" if language == "en" else "")
                    await page.goto((OUT / "cep" / extension / "index.html").as_uri())
                    await page.wait_for_function("window.J && J.ui && J.ui.plan && !J.ui.loading.boot && document.querySelector('.ae-status')")
                    await page.wait_for_function("window.__H.calls.some(call => call.startsWith('JZCEP.init'))")
                    assert await page.evaluate("window.__tools.length") == 0
                    assert await page.evaluate("typeof window.Mp4Muxer.Muxer") == "function"
                    assert await page.evaluate("document.documentElement.classList.contains('cep')")
                    expected = fixture("lrc-ja-project.json")
                    await page.evaluate("project => J.uiApi.editor.importProject(project)", expected)
                    expected_plan = await page.evaluate("J.planForAE(J.ui.plan, J.ui.project)")
                    # Full editor's AE plan uses uiApi.editor.planForAE(). The
                    # bridge transfers it through Node file or encoded string.
                    await page.click("#btnAE")
                    await page.wait_for_function("window.__H.transfers.length === 1")
                    transfer = await page.evaluate("window.__H.transfers[0]")
                    assert transfer["plan"] == expected_plan, f"{language}/{mode}: bridge changed the exported plan"
                    baseline_plan = fixture("lrc-ja-ae-plan.json")
                    # Style display copy follows the panel language; IDs, cuts
                    # and all rendering/planning fields must remain identical.
                    for key in ["name", "desc"]:
                        if key in expected_plan["style"]:
                            expected_plan["style"][key] = baseline_plan["style"][key]
                    assert expected_plan == baseline_plan, f"{language}/{mode}: AE plan contract changed"
                    assert transfer["mode"] == ("string" if mode == "none" else "file")
                    await page.wait_for_function("window.__H.calls.some(call => call.startsWith('JZCEP.step'))")
                    assert not errors, errors
                    assert await page.evaluate("window.__H.hostErrors.length") == 0
                    report["cases"].append({"target": "cep", "locale": language, "nodeMode": mode, "bridge": transfer["mode"], "webmcp": 0})
                    await page.close()
            await browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (OUT / "task03-browser-results.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
