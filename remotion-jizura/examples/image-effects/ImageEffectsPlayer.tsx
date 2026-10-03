import {useState} from 'react';
import {Player} from '@remotion/player';
import {HtmlInCanvas} from 'remotion';
import {ImageEffects, type ImageEffectsProps} from './ImageEffects.tsx';
export function ImageEffectsPlayer() {
  const [target, setTarget] = useState<ImageEffectsProps['target']>('lyrics');
  const [mode, setMode] = useState<ImageEffectsProps['mode']>('combined');
  const [amount, setAmount] = useState(0.65);
  if (!HtmlInCanvas.isSupported()) return <p>Use Chrome 149+ with HTML-in-Canvas enabled at chrome://flags/#canvas-draw-element.</p>;
  return <>
    <label>Target <select value={target} onChange={e => setTarget(e.target.value as ImageEffectsProps['target'])}>
      {['lyrics','scene','image'].map(v => <option key={v}>{v}</option>)}
    </select></label>{' '}
    <label>Effects <select value={mode} onChange={e => setMode(e.target.value as ImageEffectsProps['mode'])}>
      {['combined','standard','glitch','disabled','reverse'].map(v => <option key={v}>{v}</option>)}
    </select></label>{' '}
    <label>Slice intensity <input type="range" min={0} max={1} step={0.05} value={amount} onChange={e => setAmount(Number(e.target.value))} /> {amount}</label>
    <Player component={ImageEffects} inputProps={{target, mode, amount, fontSrc: '/NotoSansJP.ttf'}}
      durationInFrames={144} compositionWidth={640} compositionHeight={360} fps={24} controls style={{width:'min(100%, 960px)'}} />
  </>;
}
