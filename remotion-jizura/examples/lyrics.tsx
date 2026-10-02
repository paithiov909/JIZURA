import {Sequence, staticFile} from 'remotion';
import {JizuraCut, JizuraScene, parseLines, kasumi, checkerStrip} from 'remotion-jizura';

export type LyricsProps = {fontSrc?: string; seed?: number; cutSeed?: number};

export const partACuts = (cutSeed = 1234) => parseLines(`
新しい/朝が来た
*希望*の朝だ
`, {numCuts: 'auto'}).map((text, index) => ({text, seed: index + cutSeed}));

export const partBCuts = () => [{text: '喜びに胸を開け', hold: 'breathe' as const,
  decor: [kasumi({seed: 889}), checkerStrip({seed: 721})]}];

export const lyricSceneProps = ({fontSrc = staticFile('NotoSansJP.ttf'), seed = 20260922}: LyricsProps) => ({
  durationInFrames: 60, seed,
  font: {family: 'Noto Sans JP', weight: 700, src: fontSrc},
  style: {fontSize: 64},
});

export const PartA = (props: LyricsProps) => <JizuraScene {...lyricSceneProps(props)}>
  {partACuts(props.cutSeed).map((cut, index) => <JizuraCut key={index} {...cut} />)}
</JizuraScene>;

export const PartB = (props: LyricsProps) => <JizuraScene {...lyricSceneProps(props)}>
  {partBCuts().map((cut, index) => <JizuraCut key={index} {...cut} />)}
</JizuraScene>;

// Both Studio and Player use this component, without registering a root here.
export const LyricsDemo = (props: LyricsProps) => <>
  <Sequence durationInFrames={60}><PartA {...props} /></Sequence>
  <Sequence from={60} durationInFrames={60}><PartB {...props} /></Sequence>
</>;
