import { defineEffectPack } from '../../effects/registry.ts';

/** Test-only contribution example; it never changes the production ID inventory. */
export default defineEffectPack({
  id: 'example',
  install({ register }) {
    register('hold', 'examplePulse', {
      name: '呼吸の例', tags: ['calm'], w: 0.5,
      aeSupport: { kind: 'fallback', id: 'breathe', reason: 'The example has no dedicated ES3 port; use the built-in breathing motion.' },
      apply(env, item, amount) {
        item.sx = (item.sx || 1) * (1 + 0.02 * Math.sin(env.ltb * 2) * amount * env.fx.motion);
      },
    });
  },
});
