import { createCEPI18n } from '../i18n/cep.ts';
export default function install(_engine) {
/* ============================================================
   JIZURA — After Effects CEP panel bridge
   Runs only inside the AE panel (window.__adobe_cep__). Adds "build the comp in AE",
   "use the song / markers of the selected AE layer", native save dialogs and external links.
   Talks to ../jsx/host.jsx (JZCEP.*) with evalScript; every host call returns JSON.
   ============================================================ */
(() => {
'use strict';
const CEP = window.__adobe_cep__;
if (!CEP) return;
const J = window.J, S = J.ui, UI = J.uiApi || {};
const { t: translate } = createCEPI18n(document.documentElement.lang);
const $ = id => document.getElementById(id);
document.documentElement.classList.add('cep');

// Node.js (enabled in the manifest): cep_node in CEP 8+, or a plain require in mixed context
const nodeReq = (window.cep_node && window.cep_node.require) || (typeof window.require === 'function' ? window.require : null);
const fs = nodeReq ? nodeReq('fs') : null, os = nodeReq ? nodeReq('os') : null, pathM = nodeReq ? nodeReq('path') : null;
const NodeBuffer = (window.cep_node && window.cep_node.Buffer) || (typeof window.Buffer === 'function' ? window.Buffer : null);

const ev = code => new Promise(res => { try { CEP.evalScript(code, r => res(r)); } catch (e) { res('EvalScript error.'); } });
const parse = r => { try { const o = JSON.parse(r); return o && typeof o === 'object' ? o : { ok: false, error: String(r) }; } catch (e) { return { ok: false, error: String(r || 'no answer') }; } };
const toast = m => { try { UI.toast ? UI.toast(m) : console.log(m); } catch (e) {} };
function extRoot() {
  let p = '';
  try { p = decodeURI(CEP.getSystemPath('extension')); } catch (e) {}
  p = p.replace(/^file:\/\//, '');
  if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1);      // Windows: /C:/… -> C:/…
  return p;
}

// ---------------- connection to AE ----------------
let ready = false, connecting = null, aeAudio = null;
function status(m, bad) { document.querySelectorAll('.ae-status').forEach(el => { el.textContent = m; el.classList.toggle('bad', !!bad); }); }
function connect() {
  if (ready) return Promise.resolve(true);
  if (connecting) return connecting;
  connecting = (async () => {
    status(translate("cep.connecting_to_after_effects"));
    const root = extRoot();
    if ((await ev('typeof JZCEP')) !== 'object' && root) await ev('$.evalFile(File(' + JSON.stringify(root + '/jsx/host.jsx') + '))');
    const r = parse(await ev('JZCEP.init(' + JSON.stringify(root) + ')'));
    ready = !!r.ok;
    status(ready ? translate("cep.after_effects_connected", [String(r.app || '').split('x')[0]]) : translate("cep.could_not_connect_to_after_effects") + r.error, !ready);
    connecting = null;
    return ready;
  })();
  return connecting;
}

// ---------------- build the comp ----------------
// The host builds in short steps (JZCEP.step): After Effects gets control back between them, so long songs
// no longer freeze it into "not responding", the panel shows progress, and the build can be stopped.
let building = false, cancelReq = false;
const STEP_MS = 1200;
async function buildInAE() {
  if (building) return;
  if (!(await connect())) { toast(translate("cep.could_not_connect_to_after_effects_2")); return; }
  building = true; cancelReq = false; setBusy(true);
  try {
    UI.pause && UI.pause();
    const range = UI.exportRange ? UI.exportRange() : null, R = range && UI.exportRangeLines ? UI.exportRangeLines() : null;
    const plan = J.planForAE(S.plan, S.project, range), txt = JSON.stringify(plan);
    if (!plan.cuts.length) { status(translate("cep.no_cuts_in_the_selected_range"), true); return; }
    const useAudio = aeAudio && (!$('aeAudioIn') || $('aeAudioIn').checked);
    const aid = useAudio ? (aeAudio.id | 0) : 0;
    const light = [...document.querySelectorAll('.ae-light')].some(el => el.checked);
    const what = R ? translate("cep.lines", [R.from + 1, R.to > R.from ? '–' + (R.to + 1) : '']) : '';
    status(translate("cep.building_composition_cuts", [what, plan.cuts.length]));
    await new Promise(r => setTimeout(r, 30));              // let the status paint before AE starts
    let r;
    if (fs && os && pathM) {
      const p = pathM.join(os.tmpdir(), 'jizura_plan_' + Date.now() + '.json');
      fs.writeFileSync(p, txt, 'utf8');
      r = parse(await ev('JZCEP.startFromFile(' + JSON.stringify(p) + ',' + aid + ',' + light + ')'));
    } else {
      r = parse(await ev('JZCEP.startFromString(' + JSON.stringify(encodeURIComponent(txt)) + ',' + aid + ',' + light + ')'));
    }
    if (r.ok && !r.done && typeof r.total === 'number') {
      // step until done; a short pause between steps lets After Effects redraw and answer the OS
      const t0 = performance.now();
      for (;;) {
        if (cancelReq) { await ev('JZCEP.cancel()'); cancelReq = false; }
        r = parse(await ev('JZCEP.step(' + STEP_MS + ')'));
        if (!r.ok || r.done) break;
        const k = r.phase === 'cuts' ? r.cuts / Math.max(1, r.total) * 0.9 : 0.9 + 0.1 * (r.eventsDone || 0) / Math.max(1, r.events || 1);
        const el = (performance.now() - t0) / 1000, left = k > 0.03 ? el / k - el : null;
        status(translate("cep.building_composition", [Math.round(k * 100), r.phase === 'cuts' ? translate("cep.cuts", [r.cuts, r.total]) : translate("cep.adding_effects"), left != null ? translate("cep.about_s_left", [Math.max(1, Math.round(left))]) : '']));
        progress(k);
        await new Promise(res => setTimeout(res, 40));
      }
    }
    if (r.ok) {
      let m = r.cancelled ? translate("cep.stopped_has_of_cuts", [r.name, r.cuts, r.total]) : translate("cep.created_cuts_s", [r.name, what, r.cuts, (+r.secs).toFixed(1), r.audio ? translate("cep.with_audio") : '']);
      if (r.fallbacks > 0) m += translate("cep.substitutions_instances", [r.fallbacks]);
      if (r.notesTotal > 0) m += translate("cep.warnings_items", [r.notesTotal]);
      if (r.missingFonts && r.missingFonts.length) m += translate("cep.fonts_missing_on_this_computer_were_replaced", [r.missingFonts.join(translate("cep.copy"))]);
      if (r.fontCheck === false) m += translate("cep.ae_before_2024_cannot_detect_installed_fonts");
      status(m); toast(r.cancelled ? translate("cep.build_stopped") : translate("cep.composition_created_in_after_effects"));
      if (r.notes && r.notes.length) console.warn('JIZURA AE notes', r.notes);
    } else { status(translate("cep.could_not_create_composition") + r.error, true); toast(translate("cep.could_not_create_composition_2")); }
  } catch (e) { status(translate("cep.could_not_create_composition") + (e && e.message ? e.message : e), true); }
  finally { building = false; setBusy(false); progress(null); }
}
function cancelBuild() { if (building) { cancelReq = true; status(translate("cep.stopping_finishing_with_the_cuts_built_so")); } }
function progress(k) {
  document.querySelectorAll('.ae-prog').forEach(el => { el.hidden = k == null; const b = el.querySelector('i'); if (b) b.style.width = Math.round((k || 0) * 100) + '%'; });
}
function setBusy(b) { document.querySelectorAll('.ae-build').forEach(el => { el.disabled = b; }); document.querySelectorAll('.ae-cancel').forEach(el => { el.hidden = !b; }); }
async function diagnose() {
  if (!(await connect())) return;
  status(translate("cep.diagnosing_this_may_take_a_few_seconds"));
  await new Promise(r => setTimeout(r, 30));
  const r = parse(await ev('JZCEP.diagnose()'));
  if (!r.ok) { status(r.error, true); toast(r.error); return; }
  status(translate("cep.diagnostics_expressions_errors", [r.expressions, r.errors, r.partial ? translate("cep.partial") : '']) + (r.path ? translate("cep.report", [r.path]) : translate("cep.could_not_save_report_enable_script_file")));
}

// ---------------- song / markers from the AE timeline ----------------
async function useAEAudio() {
  if (!(await connect())) return;
  const r = parse(await ev('JZCEP.selectedAudio()'));
  if (!r.ok) { toast(r.error); status(r.error, true); return; }
  if (!fs) { toast(translate("cep.this_panel_cannot_read_audio_directly_use")); return; }
  try {
    const buf = fs.readFileSync(r.path), u8 = new Uint8Array(buf.length); u8.set(buf);
    const ok = UI.loadAudioFile ? await UI.loadAudioFile(new File([u8], r.name)) : false;
    if (ok) {
      aeAudio = { id: r.id, name: r.name, start: r.start };
      document.querySelectorAll('.ae-audio-row').forEach(el => { el.hidden = false; });
      document.querySelectorAll('.ae-audio-name').forEach(el => { el.textContent = r.name; });
      toast(translate("cep.synced_beats_to_in_ae", [r.name]));
    } else toast(translate("cep.could_not_read_this_audio_file_try"));
  } catch (e) { toast(translate("cep.could_not_read_audio") + e.message); }
}
async function useAEMarkers() {
  if (!(await connect())) return;
  const r = parse(await ev('JZCEP.markers()'));
  if (!r.ok) { toast(r.error); status(r.error, true); return; }
  const n = S.plan.lines.length, lt = {};
  r.times.slice(0, n).forEach((t, i) => { lt[i] = +(+t).toFixed(3); });
  S.project.timing.lineTimes = lt;
  UI.replan && UI.replan(); UI.syncUI && UI.syncUI(); UI.flushSave && UI.flushSave();
  toast(translate("cep.markers_line_start_times_set", [r.source === 'layer' ? translate("cep.layer") : translate("cep.composition"), Object.keys(lt).length]) + (r.times.length < n ? translate("cep.remaining_lines_automatic", [n - r.times.length]) : ''));
}

// ---------------- UI ----------------
function btn(id, text, cls, fn) { const b = document.createElement('button'); b.id = id; b.textContent = text; if (cls) b.className = cls; b.addEventListener('click', fn); return b; }
function inject() {
  // header: "AE用に書き出し" (JSON) -> build right here
  const hb = $('btnAE');
  if (hb) {
    const nb = hb.cloneNode(true); hb.replaceWith(nb);
    nb.textContent = translate("cep.build_in_ae"); nb.title = translate("cep.build_an_after_effects_composition_from_this"); nb.classList.add('ae-build');
    nb.addEventListener('click', buildInAE);
  }
  // song & timing: take them from the AE timeline
  const tim = $('audioFile') && $('audioFile').closest('.row');
  if (tim) {
    const row = document.createElement('div'); row.className = 'row wrap ae-row';
    row.append(btn('aeAudio', translate("cep.selected_ae_audio"), 'small', useAEAudio), btn('aeMarkers', translate("cep.use_ae_markers_for_lines"), 'small', useAEMarkers));
    row.querySelector('#aeAudio').title = translate("cep.import_the_selected_ae_audio_layer_analyze");
    row.querySelector('#aeMarkers').title = translate("cep.use_selected_layer_markers_or_composition_markers");
    tim.after(row);
  }
  $('audioFile') && $('audioFile').addEventListener('change', () => { aeAudio = null; document.querySelectorAll('.ae-audio-row').forEach(el => { el.hidden = true; }); });
  // easy mode export: AE first
  const eMP4 = $('eMP4');
  if (eMP4) {
    eMP4.classList.remove('primary');
    const box = document.createElement('div'); box.className = 'ae-box';
    box.innerHTML = translate("cep.include_audio_in_composition_lightweight_faster_playback");
    box.querySelector('.outbtns').append(btn('eAEBuild', translate("cep.build_composition_in_after_effects"), 'primary ae-build', buildInAE), btn('eAECancel', translate("cep.stop"), 'small ae-cancel', cancelBuild));
    eMP4.closest('.outbtns').before(box);
  }
  // pro mode: an After Effects block at the top of the output tab
  const pane = document.querySelector('[data-pane="out"]');
  if (pane) {
    const box = document.createElement('div'); box.className = 'ae-box';
    box.innerHTML = translate("cep.after_effects_include_audio_in_composition_lightweight");
    box.querySelector('.outbtns').append(btn('aeBuild', translate("cep.build_in_ae"), 'primary ae-build', buildInAE), btn('aeCancel', translate("cep.stop"), 'small ae-cancel', cancelBuild), btn('aeDiag', translate("cep.save_diagnostic_report"), 'small', diagnose));
    box.querySelector('#aeDiag').title = translate("cep.check_the_last_composition_and_save_a");
    pane.prepend(box);
    const m = $('btnMP4'); m && m.classList.remove('primary');
  }
  // keep the two "include the song" checkboxes in step
  document.querySelectorAll('.ae-cancel').forEach(el => { el.hidden = true; el.title = translate("cep.stop_building_the_composition_is_finished_with"); });
  // keep the two 軽量 checkboxes in step (remembered in this browser)
  let lightOn = false; try { lightOn = localStorage.getItem('jizura.aeLight') === '1'; } catch (e) {}
  document.querySelectorAll('.ae-light').forEach(cb => { cb.checked = lightOn; cb.addEventListener('change', () => { document.querySelectorAll('.ae-light').forEach(o => { o.checked = cb.checked; }); try { localStorage.setItem('jizura.aeLight', cb.checked ? '1' : '0'); } catch (e) {} }); });
  document.querySelectorAll('.ae-audio-in').forEach(cb => cb.addEventListener('change', () => { document.querySelectorAll('.ae-audio-in').forEach(o => { o.checked = cb.checked; }); }));
  const style = document.createElement('style');
  style.textContent = '.ae-row{margin-top:8px;gap:6px}.ae-box{margin-bottom:12px}.ae-box h3{margin:0 0 8px}.ae-status{margin-top:8px}.ae-status.bad{color:#ff8a80;border-left-color:#ff8a80}.ae-prog{height:4px;background:rgba(255,255,255,.12);border-radius:2px;margin-top:8px;overflow:hidden}.ae-prog i{display:block;height:100%;width:0;background:var(--accent,#7cf);transition:width .3s}';
  document.head.appendChild(style);
}

// ---------------- native save dialog + external links ----------------
const origSave = J.saveFile;
J.saveFile = async (filename, data) => {
  const cfs = window.cep && window.cep.fs;
  if (!cfs || typeof cfs.showSaveDialogEx !== 'function' || !fs) return origSave(filename, data);
  let res;
  try { res = cfs.showSaveDialogEx(translate("cep.save"), '', [filename.split('.').pop()], filename); } catch (e) { return origSave(filename, data); }
  const p = res && res.data;
  if (!p) return 'declined';
  const blob = data instanceof Blob ? data : new Blob([data]);
  const u8 = new Uint8Array(await blob.arrayBuffer());
  fs.writeFileSync(p, NodeBuffer ? NodeBuffer.from(u8) : u8);
  toast(translate("cep.saved") + p);
  return 'saved';
};
document.addEventListener('click', e => {
  const a = e.target && e.target.closest ? e.target.closest('a[href^="http"]') : null;
  if (!a) return;
  e.preventDefault();
  try { window.cep.util.openURLInDefaultBrowser(a.href); } catch (err) {}
}, true);

// the app binds its own buttons on DOMContentLoaded — add ours after that
const start = () => { inject(); connect(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0)); else setTimeout(start, 0);
J.cep = { connect, buildInAE, cancelBuild, useAEAudio, useAEMarkers, diagnose, ev };
})();

}
