"""Task 07: real editor operations and export contents on hosted and file: builds.

Requires Playwright, Pillow, installed Chrome, ffprobe/ffmpeg and a local TTF.
The direct-to-file test uses an OPFS writable stream behind a picker mock;
no native OS picker or Adobe runtime is certified by this suite.
"""
import argparse
import asyncio
import base64
from contextlib import AsyncExitStack
import functools
import http.server
import io
import json
import math
from pathlib import Path
import subprocess
import threading
import wave
import zipfile

from PIL import Image
from playwright.async_api import async_playwright
from build_foundation_test import Handler

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist/task07'
READY = 'window.jizuraApp && J.ui.plan && !J.ui.loading.boot && !J.ui.loading.audio && !J.ui.loading.fonts'


def wav_bytes():
    result = io.BytesIO()
    with wave.open(result, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000)
        w.writeframes(b''.join(int(7000 * math.sin(i * math.tau * 440 / 48000)).to_bytes(2, 'little', signed=True) for i in range(96000)))
    return result.getvalue()


def inspect_mp4(path, expected):
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(path)]))
    v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    assert [v['width'], v['height']] == expected['size'], v
    assert int(v['nb_read_frames']) == expected['frames'], v
    num, den = map(int, v['r_frame_rate'].split('/'))
    assert num / den == expected['fps'], v
    assert abs(float(v['duration']) - expected['frames'] / expected['fps']) < 0.08, v
    # Decode all streams; a container header alone is not export evidence.
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'], check=True, capture_output=True)
    frame = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-vf', f"select=eq(n\\,{max(0, expected['frames'] - 2)})", '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'])
    image = Image.open(io.BytesIO(frame)).convert('RGB')
    assert any(lo != hi for lo, hi in image.getextrema()), 'Decoded preview frame is blank'
    return {'videoCodec': v['codec_name'], 'frames': int(v['nb_read_frames']), 'size': expected['size'], 'duration': v['duration'], 'audio': [s['codec_name'] for s in probe['streams'] if s['codec_type'] == 'audio'], 'decoded': True}


def inspect_zip(path, kind, expected):
    with zipfile.ZipFile(path) as z:
        names = [f'jizura_{i:05}.png' for i in range(expected['frames'])]
        if kind == 'pngl': names = [folder + '/' + name for name in names for folder in ['back', 'front']]
        assert z.namelist() == names, z.namelist()
        assert z.testzip() is None
        alphas, content = [], []
        for name in names:
            image = Image.open(io.BytesIO(z.read(name))).convert('RGBA')
            assert list(image.size) == expected['size']
            alphas.append(image.getchannel('A').getextrema())
            content.append(image.getbbox() is not None)
        if kind == 'png': assert all(a == (255, 255) for a in alphas)
        else: assert any(lo < 255 for lo, hi in alphas), alphas
        assert any(content)
        return {'entries': len(names), 'size': expected['size'], 'alpha': sorted(set(alphas)), 'crc': 'passed'}


async def state(page):
    return await page.evaluate('jizuraApp.editor.prepare(); jizuraApp.editor.state(true)')


async def download(page, selector, destination):
    async with page.expect_download(timeout=120000) as event:
        await page.click(selector)
    dl = await event.value
    path = destination / dl.suggested_filename
    await dl.save_as(path)
    assert await dl.failure() is None
    return path


async def exercise(browser, url, label, font):
    context = await browser.new_context(accept_downloads=True)
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.route('https://**/*', lambda r: r.abort())
    await page.add_init_script("localStorage.setItem('jizura.tourDone','1')")
    await page.goto(url)
    await page.wait_for_function(READY)
    assert await page.evaluate('jizuraApp.editor === J.uiApi.editor && Object.isFrozen(jizuraApp)')
    result = {'target': label, 'operations': [], 'exports': []}
    directory = OUT / label
    directory.mkdir(parents=True, exist_ok=True)
    fixture = json.loads((ROOT / 'tests/baseline/v1/lrc-ja-project.json').read_text())
    # Real file input -> serializer -> file input, with no adapter registration mock.
    await page.locator('#fileProject').set_input_files({'name': 'fixture.jizura.json', 'mimeType': 'application/json', 'buffer': json.dumps(fixture).encode()})
    await page.wait_for_function(READY)
    project = (await state(page))['project']
    assert project == fixture
    saved = await download(page, '#btnSave', directory)
    assert json.loads(saved.read_text()) == fixture
    ae = await download(page, '#btnAE', directory)
    expected_ae = await page.evaluate('J.planForAE(J.ui.plan, J.ui.project, jizuraApp.host.exportRange())')
    assert json.loads(ae.read_text()) == expected_ae and expected_ae['version'] == 2
    result['operations'].append('fixture input/project JSON/AE v2 round-trip')
    await page.click('#modePro')
    # Real lyric, timing, line/cut controls and undo/redo.
    await page.locator('#lyrics').fill('[00:00.00]Hello/world\n[00:00.25]Again!')
    await page.wait_for_function("J.ui.project.lyrics.includes('Hello/world') && J.ui.plan.lines.length === 2")
    await page.locator('#lineList .ln .edit').first.click()
    await page.locator('.txt-edit').fill('New/words')
    await page.locator('.txt-edit').press('Enter')
    assert '[00:00.00]New/words' in (await state(page))['project']['lyrics']
    await page.click('#btnUndoEdit')
    assert 'Hello/world' in (await state(page))['project']['lyrics']
    await page.evaluate("jizuraApp.editor.history('edit', 1)")
    await page.locator('#lineList .ln .ncut').first.select_option('1')
    await page.locator('#lineList .ln .lay').first.select_option('center')
    await page.locator('#lineList .ln .time').first.fill('0.05')
    await page.locator('#lineList .ln .time').first.dispatch_event('change')
    await page.locator('#lineList .ln .lock').first.click()
    s = await state(page)
    assert s['project']['timing']['lineTimes']['0'] == 0.05
    assert s['project']['overrides']['0']['layout'] == 'center'
    locked = s['project']['overrides']['0']['lockedCuts']
    await page.evaluate("jizuraApp.editor.locks('params', ['motion'], true); jizuraApp.editor.randomize('all')")
    assert (await state(page))['project']['overrides']['0']['lockedCuts'] == locked
    await page.evaluate("jizuraApp.editor.history('look', -1); jizuraApp.editor.history('look', 1); jizuraApp.editor.preview({time:0.15,loop:'line',volume:0.2,muted:true})")
    assert (await state(page))['playback']['volume'] == 0.2
    await page.click('#btnPlay')
    await page.wait_for_function('J.ui.playing')
    await page.click('#btnPlay')
    assert not (await state(page))['playback']['playing']
    for mode in ['easy', 'mobile', 'pro']:
        if mode == 'mobile': await page.set_viewport_size({'width': 820, 'height': 900})
        if (await state(page))['playback']['mode'] == 'mobile':
            await page.click('#btnMenu')
        await page.click({'easy':'#modeEasy','mobile':'#modeMobile','pro':'#modePro'}[mode])
        assert (await state(page))['playback']['mode'] == mode
    await page.set_viewport_size({'width': 1280, 'height': 900})
    result['operations'].append('lyrics/edit undo/redo/timing/cuts/locks/randomize/look history/preview/three modes')
    # Real font upload and audio decode/analysis, persisted by IndexedDB.
    await page.locator('#fontFile').set_input_files(str(font))
    await page.wait_for_function(READY)
    font_key = (await state(page))['project']['fonts']['display']
    assert font_key.startswith('user_') and not (await state(page))['fonts']['missing']
    await page.locator('#audioFile').set_input_files({'name':'tone.wav','mimeType':'audio/wav','buffer':wav_bytes()})
    await page.wait_for_function('!J.ui.loading.audio && !!J.ui.audio')
    assert abs((await state(page))['audio']['duration'] - 2) < 0.01
    await page.evaluate('jizuraApp.host.flushSave()')
    # The existing importer fills omitted enabled entries as true (baseline
    # contract). Randomize can save a sparse map; compare its canonical form.
    before = await page.evaluate('Object.assign(J.mergeProject(jizuraApp.editor.projectData(false)), {appVersion:J.APP_VERSION})')
    before_plan = await page.evaluate('jizuraApp.editor.projectData(true)')
    await page.reload()
    await page.wait_for_function(READY)
    after = (await state(page))['project']
    assert after == before, {k: {'before': before.get(k), 'after': after.get(k)} for k in set(before) | set(after) if before.get(k) != after.get(k)}
    assert await page.evaluate('jizuraApp.editor.projectData(true)') == before_plan
    assert (await state(page))['audio']['loaded'] and not (await state(page))['fonts']['missing']
    result['operations'].append('font upload/audio decode/localStorage and IndexedDB reload')
    # A short ranged project drives every export family through the actual UI.
    await page.evaluate(r"""() => {
      const E = jizuraApp.editor;
      E.lyrics('[00:00.00]A\n[00:00.25]B');
      E.timing({bpm:0,snap:false,offset:0,tail:0.5}, [], true);
      E.line(0,{lock:false}); E.settings({title:'Test:/clip',artist:'Tester',style:'noir',seed:42,mode:'pro',res:720,fps:24,extra:false,wa:false,fx:{density:0,texture:0},exportRange:{from:1,to:1}});
    }""")
    expected = await page.evaluate(r"""() => {
      const span=J.exportSpan(J.ui.plan,jizuraApp.host.exportRange());
      return {size:J.outputSize(J.ui.project),fps:J.ui.plan.fps,frames:Math.max(1,Math.round(span.dur*J.ui.plan.fps))};
    }""")
    await page.locator('.tabs button[data-tab="out"]').click()
    lrc = await download(page, '#btnLRC', directory)
    assert lrc.name == 'Test_clip_L01.lrc'
    assert lrc.read_text() == '[ti:Test:/clip]\n[ar:Tester]\n[00:00.00]A\n'
    result['exports'].append({'kind':'lrc','name':lrc.name,'contents':'passed'})
    await page.screenshot(path=str(directory / 'editor.png'), full_page=True)
    await page.locator('.tabs button[data-tab="out"]').click()
    for kind, selector, suffix in [('png','#btnPNG','_png.zip'),('pnga','#btnPNGA','_alpha_png.zip'),('pngl','#btnPNGL','_layers_png.zip'),('mp4','#btnMP4','.mp4')]:
        async with AsyncExitStack() as stack:
            companion = None
            if kind == 'mp4' and await page.evaluate("(async()=>{const c=await J.pickAudioCodec(48000,1);return c?.mux || null})()") != 'aac':
                companion = await stack.enter_async_context(page.expect_download(predicate=lambda dl: dl.suggested_filename.endswith('_audio.wav'), timeout=120000))
            path = await download(page, selector, directory)
            await page.wait_for_function("J.ui.exportJob.status !== 'running'", timeout=120000)
        job = (await state(page))['exportJob']
        assert job['status'] == 'completed', job
        assert path.name == 'Test_clip_L01' + suffix, path
        contents = inspect_mp4(path, expected) if kind == 'mp4' else inspect_zip(path, kind, expected)
        if kind == 'mp4': assert contents['audio'], 'This tested browser must encode the supplied soundtrack'
        result['exports'].append({'kind':kind,'name':path.name,'job':job,'contents':contents})
        if companion:
            dl = await companion.value
            wav_path = directory / dl.suggested_filename
            await dl.save_as(wav_path)
            assert wav_path.name == 'Test_clip_L01_audio.wav'
            with wave.open(str(wav_path), 'rb') as w:
                assert w.getnchannels() == 1 and w.getframerate() == 48000 and w.getsampwidth() == 2
                assert w.getnframes() == round(expected['frames'] / expected['fps'] * 48000)
                data = w.readframes(w.getnframes())
                assert max(abs(int.from_bytes(data[i:i+2], 'little', signed=True)) for i in range(0,len(data),2)) > 6000
            assert 'opus' in (await page.locator('.exp-text').first.text_content()).lower()
            result['exports'].append({'kind':'audio-wav','name':wav_path.name,'pcm':'mono 16-bit 48000 Hz; ranged duration and non-silent samples passed','visibleCodecFallback':'passed'})
    # Native OPFS stream exercises actual FileSystemWritableFileStreamTarget writes.
    # Picker interaction itself remains a mock and is explicitly reported.
    await page.evaluate(r"""() => {
      window.showSaveFilePicker = async options => {
        const root=await navigator.storage.getDirectory();
        window.outputHandle=await root.getFileHandle('direct.mp4',{create:true});
        return {name:options.suggestedName,createWritable:()=>outputHandle.createWritable()};
      };
      document.getElementById('btnMP4File').hidden=false;
    }""")
    await page.click('#btnMP4File')
    await page.wait_for_function("J.ui.exportJob.kind === 'mp4file' && J.ui.exportJob.status !== 'running'", timeout=120000)
    job = (await state(page))['exportJob']
    if label == 'offline-en' and job['status'] == 'failed':
        # This Chrome disallows OPFS at file:. That is the mock picker's
        # backend, not evidence about the untested native OS picker.
        assert job['progress'] == 0 and 'unsafe for access' in job['error'], job
        assert job['error'] in await page.locator('#toast').text_content()
        result['exports'].append({'kind':'mp4file','picker':'mock OPFS backend unavailable at file:; native picker unverified','job':job,'visibleError':'passed'})
    else:
        assert job['status'] == 'completed' and job['files'][0]['status'] == 'saved', job
        data = await page.evaluate("(async()=>{const b=new Uint8Array(await (await outputHandle.getFile()).arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);})()")
        path = directory / 'direct.mp4'; path.write_bytes(base64.b64decode(data))
        result['exports'].append({'kind':'mp4file','picker':'mock; real OPFS writable/encoder/muxer','contents':inspect_mp4(path,expected)})
    await page.evaluate("jizuraApp.editor.startExport('png'); jizuraApp.editor.cancelExport()")
    await page.wait_for_function("J.ui.exportJob.status === 'cancelled'")
    await page.evaluate(r"""async () => {
      const p=jizuraApp.editor.projectData(false);
      p.userFonts=[{key:'user_absent',family:'Missing',label:'Absent font',weight:400}];
      p.fonts={display:'user_absent'};
      await jizuraApp.editor.importProject(p);
    }""")
    assert 'Absent font' in (await state(page))['fonts']['missing']
    await page.click('#btnPNG')
    await page.wait_for_function("J.ui.exportJob.status === 'failed'")
    assert 'Absent font' in await page.locator('.exp-text').first.text_content()
    # Reset confirmation uses the real dialog and existing editor event path.
    await page.click('#btnReset')
    await page.locator('#resetDlg button[value="reset"]').click()
    await page.wait_for_function("J.ui.project.lyrics === '' && !J.ui.audio")
    assert not (await state(page))['history']['previous']
    assert not errors, errors
    result['operations'].append('cancel export/missing-font visible failure/reset confirmation')
    await context.close()
    return result


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--browser', default='/usr/bin/google-chrome')
    parser.add_argument('--font', type=Path, default=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    args = parser.parse_args()
    assert args.font.exists(), 'Provide --font with a local TTF for real font upload'
    class WebHandler(Handler):
        def translate_path(self, request_path):
            if request_path.startswith('/JIZURA/'): self.path = request_path[len('/JIZURA'):]
            return super().translate_path(self.path)
    server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(WebHandler,directory=str(ROOT/'dist/web')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    OUT.mkdir(parents=True,exist_ok=True)
    report = {'evidence':'modern Chrome actual editor/encoders/ZIP/files; fonts blocked remotely; OS picker mocked; no actual AE/CEP','cases':[]}
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(executable_path=args.browser,args=['--no-sandbox'])
            report['browser']=browser.version
            report['cases'].append(await exercise(browser,f'http://127.0.0.1:{server.server_port}/JIZURA/','hosted-ja',args.font))
            report['cases'].append(await exercise(browser,(ROOT/'dist/offline/JIZURA_en.html').as_uri(),'offline-en',args.font))
            page=await browser.new_page()
            await page.route('https://**/*',lambda r:r.abort())
            await page.add_init_script("localStorage.setItem('jizura.tourDone','1'); delete window.VideoEncoder;")
            await page.goto(f'http://127.0.0.1:{server.server_port}/JIZURA/en/')
            await page.wait_for_function(READY)
            await page.wait_for_function("document.getElementById('btnMP4').disabled && document.getElementById('codecNote').textContent.includes('unavailable')")
            assert await page.locator('#btnMP4File').is_hidden()
            report['cases'].append({'target':'codec-unavailable','visibleDegradation':'passed'})
            await page.close()
            page=await browser.new_page()
            await page.route('https://**/*',lambda r:r.abort())
            await page.add_init_script("localStorage.setItem('jizura.tourDone','1')")
            await page.goto((ROOT/'dist/offline/JIZURA.html').as_uri())
            for route, lang in [('en','en'),('zh-hant','zh-Hant'),('zh-hans','zh-Hans'),('ko','ko'),('id','id-ID'),('vi','vi'),('','ja')]:
                await page.wait_for_function(READY)
                filename=f'JIZURA{"_"+route if route else ""}.html'
                await page.locator('.lang-switch select').select_option(filename)
                await page.wait_for_url('**/'+filename)
                await page.wait_for_function(READY)
                assert await page.locator('html').get_attribute('lang') == lang
            report['cases'].append({'target':'offline-menu','localFileTransitions':7,'result':'passed'})
            await browser.close()
    finally:
        server.shutdown(); server.server_close()
    (OUT/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__': asyncio.run(main())
