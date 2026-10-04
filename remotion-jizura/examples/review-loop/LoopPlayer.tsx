import {useEffect, useRef, useState, type Ref} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {sliceGlitch, resolveScene, type SceneInspection} from 'remotion-jizura';
import {ReviewLoop} from './ReviewLoop.tsx';
import {applyReview, buildLoopCuts, cloneInput, loopConfig, loopDuration, loopVariants, originalInput, reviews, selectionBrief, selectionSteps, validateLoopInput, type LoopInput} from './model.tsx';
import {preloadLoopFont} from './preload.tsx';

export function parseLoopProps(json: string): {input: LoopInput} {
  const value = JSON.parse(json);
  if (!value || Object.keys(value).length !== 1 || !value.input) throw new Error('Paste {"input": ...}, the same props used in Studio/render');
  validateLoopInput(value.input);
  const im = value.input.image;
  sliceGlitch({amount: im.amount, displacement: im.displacement, bands: im.bands, rate: im.rate, seed: im.seed});
  return value;
}
const propsJSON = (input: LoopInput) => JSON.stringify({input}, null, 2);
function download(name: string, value: object) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const LoopPlayer = ({playerRef, fontSrc = '/NotoSansJP.ttf', preload = true}: {playerRef?: Ref<PlayerRef>; fontSrc?: string; preload?: boolean}) => {
  const ownRef = useRef<PlayerRef>(null), ref = playerRef ?? ownRef;
  const [input, setInput] = useState(() => cloneInput(originalInput));
  const [draft, setDraft] = useState(() => propsJSON(originalInput));
  const [before, setBefore] = useState(false), [range, setRange] = useState('all');
  const [inspection, setInspection] = useState<SceneInspection | null>(null);
  const [fontReady, setFontReady] = useState(!preload), [error, setError] = useState('');
  const [notice, setNotice] = useState(''), [fontMs, setFontMs] = useState<number | null>(null);
  useEffect(() => {
    if (!preload) return;
    let cancelled = false, release: (() => void) | undefined;
    const start = performance.now();
    preloadLoopFont(fontSrc).then(dispose => {
      if (cancelled) {dispose(); return;}
      release = dispose; setFontMs(performance.now() - start); setFontReady(true);
    }, e => {if (!cancelled) setError(String(e));});
    return () => {cancelled = true; release?.();};
  }, [fontSrc, preload]);
  const show = before ? originalInput : input;
  const expected = resolveScene({...show.scene, background: null,
    font: {...show.scene.font!, ...(preload ? {} : {src: fontSrc})}}, loopConfig, buildLoopCuts(show));
  const measured = inspection && JSON.stringify({...inspection, stage: 'prepared', cuts: inspection.cuts.map(({geometry: _geometry, ...cut}) => cut)}) === JSON.stringify(expected) ? inspection : null;
  const target = show.cuts.find(c => c.id === range);
  const inFrame = target?.cut.from ?? 0, outFrame = target ? inFrame + target.cut.durationInFrames! - 1 : loopDuration - 1;
  function update(next: LoopInput) {setInput(next); setDraft(propsJSON(next)); setBefore(false); setError(''); setNotice('');}
  function attempt(action: () => void) {try {action(); setError('');} catch (e) {setError(String(e));}}
  return <main style={{fontFamily: 'system-ui', maxWidth: 1000, margin: 'auto', padding: 20}}>
    <h1>JIZURA — 12秒のレビュー往復</h1>
    <p>{selectionBrief} 4Cut / 24fps。<a href="/?catalog">候補カタログ</a></p>
    <details><summary>選択理由と候補</summary>{selectionSteps.map(s => <p key={s.cutId}><b>{s.cutId}</b>: {s.reason}<br />検索結果: {s.candidates.map(c => c.id).join(', ')}<br />採用コード: {s.chosen.join(', ')}</p>)}</details>
    <p><label>比較案 <select aria-label="統合比較案" value={Object.hasOwn(loopVariants, input.name) ? input.name : ''} onChange={e => update(cloneInput(loopVariants[e.target.value]))}>
      <option value="" disabled>編集中</option>{Object.keys(loopVariants).map(name => <option key={name}>{name}</option>)}
    </select></label>{' '}<label>ループ <select aria-label="統合ループ範囲" value={range} onChange={e => setRange(e.target.value)}>
      <option value="all">全体</option>{show.cuts.map(c => <option key={c.id} value={c.id}>{c.id}: {c.cut.from}–{c.cut.from! + c.cut.durationInFrames! - 1}</option>)}
    </select></label>{' '}<button onClick={() => {setBefore(!before);}} aria-label="変更前後を比較">{before ? '変更後へ' : '変更前へ'}</button></p>
    {fontReady ? <Player ref={ref} component={ReviewLoop} inputProps={{input: show, fontSrc, fontPreloaded: preload, onInspect: setInspection}}
      durationInFrames={loopDuration} compositionWidth={loopConfig.width} compositionHeight={loopConfig.height} fps={loopConfig.fps}
      inFrame={inFrame} outFrame={outFrame} loop controls style={{width: 640, maxWidth: '100%'}}
      errorFallback={({error: e}) => <pre role="alert">{e.message}</pre>} /> : <p role="status">レビュー用フォントを準備中…</p>}
    <p aria-label="表示中の設定">表示: {show.name} / {measured ? '計測済み' : '準備中'}{fontMs === null ? '' : ` / 初回font ${Math.round(fontMs)}ms`}</p>
    <ol>{reviews.map(r => <li key={r.id}>{r.cutId} [{r.frames.join(',')}) — {r.intent} ({r.before} → {r.after}){' '}
      <button aria-label={r.id} onClick={() => {update(applyReview(input, r.id)); setRange(r.cutId);}}>この修正を適用</button></li>)}</ol>
    <p><button onClick={() => update(cloneInput(originalInput))}>元設定へ復元</button>{' '}
      <button onClick={() => attempt(() => {localStorage.setItem('jizura-review-loop-v1', propsJSON(input)); setNotice('保存しました');})}>設定を保存</button>{' '}
      <button onClick={() => attempt(() => update(parseLoopProps(localStorage.getItem('jizura-review-loop-v1') ?? '').input))}>保存設定を読込</button>{' '}
      <button onClick={() => download(`${input.name}-props.json`, {input})}>Props JSONを取得</button>{' '}
      <button disabled={!measured} onClick={() => measured && download(`${show.name}-review.json`, {input: show, config: loopConfig, inspection: measured, image: show.image,
        callerImports: ['examples/custom/effects.tsx:glyphWave,boxRule'], reviews, agentReview: 'unrecorded', userReview: 'unconfirmed'})}>構成・レビュー記録を取得</button></p>
    <details><summary>同じPropsを編集・Studioへ渡す</summary>
      <p>このJSONをStudioのPropsへ貼り付けて保存するか、renderの--propsに渡します。比較前の表示中でも編集・保存対象は変更後の設定です。</p>
      <textarea aria-label="統合Props JSON" value={draft} onChange={e => setDraft(e.target.value)} rows={12} style={{width: '100%'}} />
      <button onClick={() => attempt(() => update(parseLoopProps(draft).input))}>JSONを適用</button>
    </details>
    {notice && <p role="status">{notice}</p>}{error && <pre role="alert">{error}</pre>}
    {measured && <details><summary>表示中の解決済み構成</summary><pre aria-label="統合構成">{JSON.stringify(measured, null, 2)}</pre></details>}
  </main>;
};
