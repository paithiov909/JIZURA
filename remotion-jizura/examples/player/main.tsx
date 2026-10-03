import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Player} from '@remotion/player';
import {LyricsDemo} from '../lyrics.tsx';
import {ReviewPlayer} from '../review/ReviewPlayer.tsx';

createRoot(document.getElementById('root')!).render(<StrictMode>
  {new URLSearchParams(location.search).has('review') ? <ReviewPlayer /> :
  <Player component={LyricsDemo} inputProps={{fontSrc: '/NotoSansJP.ttf'}}
    durationInFrames={120} compositionWidth={640} compositionHeight={360} fps={24}
    controls style={{width: 'min(100%, 960px)'}} />}
</StrictMode>);
