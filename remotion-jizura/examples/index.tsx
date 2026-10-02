import {Composition, registerRoot, staticFile} from 'remotion';
import {JizuraCut, JizuraScene} from 'remotion-jizura';

const EmptyScene = () => <JizuraScene durationInFrames={24} background="#16324F" />;
const StaticText = ({fontSrc = staticFile('NotoSansJP.ttf')}: {fontSrc?: string}) => <JizuraScene durationInFrames={24}
  font={{family: 'Noto Sans JP', weight: 700, src: fontSrc}}
  style={{fontSize: 64, track: 0.08, lead: 1.4}} background="#16324F">
  <JizuraCut text={'新しい朝が来た\n*希望*の朝だ ABC 123'} enter={null} exit={null} hold={null} decor={[]} />
</JizuraScene>;
const StaticOverride = () => <JizuraScene durationInFrames={24}
  font={{family: 'Unused Scene Font', src: 'unused-font.ttf'}}
  style={{fontSize: 64, track: 0.08, lead: 1.4, palette: {accent: '#16F4D4'}}} background="#16324F">
  <JizuraCut text={'新しい朝が来た\n*希望*の朝だ ABC 123'}
    font={{family: 'Noto Sans JP', weight: 400, src: staticFile('NotoSansJP.ttf')}}
    style={{palette: {fg: '#B8B8B8', bg: '#FF0000'}, track: 0.12}}
    enter={null} exit={null} hold={null} decor={[]} />
</JizuraScene>;
const Root = () => <>
  <Composition id="EmptyScene" component={EmptyScene} width={640} height={360} fps={24} durationInFrames={24} />
  <Composition id="StaticText" component={StaticText} defaultProps={{}} width={960} height={540} fps={24} durationInFrames={24} />
  <Composition id="StaticOverride" component={StaticOverride} width={960} height={540} fps={24} durationInFrames={24} />
</>;
registerRoot(Root);
