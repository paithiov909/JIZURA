import {useEffect, useRef, useState, type Ref} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {HtmlInCanvas} from 'remotion';
import {searchEffects, type CatalogEntry} from 'remotion-jizura';
import {ReviewWorkbench} from '../review/ReviewWorkbench.tsx';
import {CustomEffects} from '../custom/CustomEffects.tsx';
import {ImageEffects} from '../image-effects/ImageEffects.tsx';
import {exampleCatalog, searchExamples} from './entries.tsx';

export const CatalogPreview = ({entry, fontSrc = '/NotoSansJP.ttf'}: {entry: CatalogEntry; fontSrc?: string}) => {
  if (entry.visual.route === 'custom') return <CustomEffects />;
  if (entry.visual.route === 'image-effects') return <ImageEffects fontSrc={fontSrc} mode={entry.visual.candidate as 'glitch' | 'standard'} />;
  return <ReviewWorkbench candidate={entry.visual.candidate} fontSrc={fontSrc} />;
};
export function CatalogPlayer({playerRef}: {playerRef?: Ref<PlayerRef>}) {
  const [text, setText] = useState('');
  const [group, setGroup] = useState('');
  const [use, setUse] = useState('');
  const [selected, select] = useState('layout/center');
  const ref = useRef<PlayerRef>(null);
  const results = searchEffects({text, ...(group ? {group: group as CatalogEntry['group']} : {}), uses: use ? [use] : []}, exampleCatalog);
  const entry = exampleCatalog.find(e => `${e.group}/${e.id}` === selected)!;
  useEffect(() => {ref.current?.seekTo(entry.visual.frame);}, [entry]);
  const supported = entry.group !== 'image' || HtmlInCanvas.isSupported();
  return <main style={{maxWidth: 1100, margin: 'auto', fontFamily: 'sans-serif', padding: 20}}>
    <h1>JIZURA 表現カタログ</h1>
    <p>実装済み{exampleCatalog.length}件。用途は選択の手がかりです。見た目を比較して選んでください。</p>
    <nav>{searchExamples.map(e => <button key={e.label} onClick={() => {setText(''); setGroup(''); setUse(e.label);}}>{e.label}</button>)}</nav>
    <p><label>名前・tag・条件 <input aria-label="カタログ検索" value={text} onChange={e => setText(e.target.value)} /></label>{' '}
      <label>種類 <select aria-label="カタログ種類" value={group} onChange={e => setGroup(e.target.value)}>
        <option value="">すべて</option>{['layout', 'enter', 'hold', 'exit', 'decor', 'image'].map(g => <option key={g}>{g}</option>)}
      </select></label>{' '}<button onClick={() => {setText(''); setGroup(''); setUse('');}}>全件</button>
    </p>
    <p role="status">{results.length}件{use ? ` / ${use}` : ''}</p>
    <div style={{display: 'flex', gap: 24, flexWrap: 'wrap'}}>
      <ul aria-label="カタログ候補" style={{flex: '1 1 260px', paddingLeft: 20}}>{results.map(e => <li key={`${e.group}/${e.id}`}>
        <button aria-pressed={e === entry} data-effect={`${e.group}/${e.id}`} onClick={() => select(`${e.group}/${e.id}`)}>{e.name}</button>
        <small> {e.group} / {e.origin === 'caller-example' ? '利用側の例' : e.origin === 'standard-image' ? '標準package' : 'package'}</small>
      </li>)}</ul>
      <article aria-label="選択effect" style={{flex: '2 1 600px', minWidth: 0}}>
        <h2>{entry.name}</h2><p>{entry.description}</p><p>用途候補: {entry.uses.join(' / ')}</p>
        <p>動き: {entry.movements.join(' / ')} · 条件: {entry.conditions.join(' / ')}</p>
        {supported ? <Player ref={node => {ref.current = node; if (typeof playerRef === 'function') playerRef(node); else if (playerRef) playerRef.current = node;}}
          component={CatalogPreview} inputProps={{entry}} durationInFrames={entry.group === 'image' ? 144 : 120}
          compositionWidth={640} compositionHeight={360} fps={24} controls loop
          errorFallback={({error}) => <pre role="alert">{error.message}</pre>} style={{width: '100%', backgroundColor: '#16324F'}} />
          : <p>画像例にはHTML-in-Canvas対応Chromeとflagが必要です。</p>}
        <p>代表frame: {entry.visual.frame} / {entry.visual.composition}。
          {entry.origin === 'caller-example' && ' 独自3定義を組み合わせた例です。'}
          {entry.group === 'image' && ' 動画はsliceと標準blurの組み合わせ例です。'}</p>
        <a href={`?${entry.visual.route === 'review' ? `review&candidate=${entry.visual.candidate}` : entry.visual.route === 'custom' ? 'custom' : `image-effects&mode=${entry.visual.candidate}`}`}>比較例を開く</a>{' · '}
        <a href={`/catalog-media/${entry.visual.video.replace('dist/remotion/', '')}`}>代表動画（検証commandで生成）</a>
        <ul>{entry.constraints.map(c => <li key={c}>{c}</li>)}</ul>
        <details><summary>調整値・根拠</summary>
          <p>{entry.suitability.reason}</p>
          <pre style={{whiteSpace: 'pre-wrap'}}>{JSON.stringify({parameters: entry.parameters, provenance: entry.provenance}, null, 2)}</pre>
        </details>
      </article>
    </div>
  </main>;
}
