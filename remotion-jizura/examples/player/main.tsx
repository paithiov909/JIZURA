import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Player} from '@remotion/player';
import {LyricsDemo} from '../lyrics.tsx';
import {ReviewPlayer} from '../review/ReviewPlayer.tsx';
import {ImageEffectsPlayer} from '../image-effects/ImageEffectsPlayer.tsx';
import {CatalogPlayer} from '../catalog/CatalogPlayer.tsx';
import {CustomEffects} from '../custom/CustomEffects.tsx';

const query = new URLSearchParams(location.search);

createRoot(document.getElementById('root')!).render(<StrictMode>
  {query.has('catalog') ? <CatalogPlayer /> : query.has('image-effects') ? <ImageEffectsPlayer initialMode={query.get('mode') ?? undefined} /> : query.has('review') ? <ReviewPlayer initialCandidate={query.get('candidate') ?? undefined} /> : query.has('custom') ?
  <Player component={CustomEffects} durationInFrames={120} compositionWidth={640} compositionHeight={360} fps={24} controls style={{width: 'min(100%, 960px)'}} /> :
  <Player component={LyricsDemo} inputProps={{fontSrc: '/NotoSansJP.ttf'}}
    durationInFrames={120} compositionWidth={640} compositionHeight={360} fps={24}
    controls style={{width: 'min(100%, 960px)'}} />}
</StrictMode>);
