import type { Engine } from '../../engine/types.ts';
import type { EffectDefinition } from '../../effects/types.ts';

declare const engine: Engine;
const hold: EffectDefinition<'hold'> = { name: 'Valid', tags: ['calm'], w: 1,
  aeSupport: { kind: 'fallback', id: 'still', reason: 'Example' }, apply(env, item, amount) { item.alpha = amount; env.ctx.save(); } };
engine.register('hold', 'validHold', hold, 'example');
// @ts-expect-error Required metadata and callback cannot be omitted.
engine.register('hold', 'missingMetadata', { name: 'Missing' });
// @ts-expect-error Layouts require fits, plan and render rather than apply.
engine.register('layout', 'wrongGroup', hold);
// @ts-expect-error AE fallback requires a reason.
const missingReason: EffectDefinition<'hold'> = { ...hold, aeSupport: { kind: 'fallback', id: 'still' } };
// @ts-expect-error Unknown mood cannot be registered.
const badMood: EffectDefinition<'hold'> = { ...hold, tags: ['invalid'] };
void missingReason; void badMood;
