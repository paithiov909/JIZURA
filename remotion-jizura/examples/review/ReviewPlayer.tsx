import {useState} from 'react';
import type {Ref} from 'react';
import {Player} from '@remotion/player';
import type {PlayerRef} from '@remotion/player';
import {ReviewWorkbench} from './ReviewWorkbench.tsx';
import {reviewInputs} from './inputs.tsx';

export const ReviewPlayer = ({playerRef}: {playerRef?: Ref<PlayerRef>}) => {
  const [name, setName] = useState('combined');
  const [range, setRange] = useState('target');
  const inFrame = range === 'reference' ? 60 : 0;
  const outFrame = range === 'target' ? 59 : 119;
  return <main>
    <h1>JIZURA effect review</h1>
    <p>同じ歌詞・font・seedで比較。editedはtargetだけの変更例です。</p>
    <label>比較案 <select aria-label="比較案" value={name} onChange={e => setName(e.target.value)}>
      {Object.keys(reviewInputs).map(id => <option key={id} value={id}>{id}</option>)}
    </select></label>{' '}
    <label>ループ範囲 <select aria-label="ループ範囲" value={range} onChange={e => setRange(e.target.value)}>
      <option value="target">target: 0–59</option>
      <option value="reference">reference: 60–119</option>
      <option value="all">全体: 0–119</option>
    </select></label>
    <Player ref={playerRef} component={ReviewWorkbench}
      inputProps={{input: reviewInputs[name], fontSrc: '/NotoSansJP.ttf'}}
      durationInFrames={120} compositionWidth={640} compositionHeight={360} fps={24}
      inFrame={inFrame} outFrame={outFrame} loop controls
      errorFallback={({error}) => <pre role="alert">{error.message}</pre>}
      style={{width: 'min(100%, 960px)'}} />
    <p>調整・保存はinputs.tsxまたはStudioのPropsを使用。combinedを選ぶと元の案に戻ります。</p>
  </main>;
};
