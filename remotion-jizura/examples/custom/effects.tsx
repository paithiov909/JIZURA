import {defineLayoutEffect, defineMotionEffect, defineDecorEffect} from 'remotion-jizura';

export const offsetLines = defineLayoutEffect({
  id: 'example.offsetLines', name: 'Offset lines', description: 'Measured lyric lines, shifted vertically within the canvas.', tags: ['layout', 'calm'],
  schema: {offset: {type: 'number', default: -0.06, min: -0.2, max: 0.2, unit: 'canvas height', description: 'Vertical offset from center.'}},
  layout: ({width, height, params, fitText}) => [{x: width / 2, y: height * (0.5 + params.offset),
    size: fitText({maxWidth: width * 0.8, maxHeight: height * 0.4, maxSize: height * 0.24})}],
});
export const glyphWave = defineMotionEffect({
  group: 'hold', id: 'example.glyphWave', name: 'Glyph wave', description: 'A seeded sine wave moves each glyph while the cut rests.', tags: ['motion', 'calm'],
  schema: {
    amplitude: {type: 'number', default: 12, min: 0, max: 40, unit: 'design px', description: 'Maximum vertical glyph displacement.'},
    cycles: {type: 'number', default: 0.8, min: 0, max: 3, unit: 'cycles/sec', description: 'Wave speed.'},
  },
  transform: ({params, seconds, glyphIndex, progress, random}) => ({
    dy: Math.sin(seconds * Math.PI * 2 * params.cycles + glyphIndex * 0.7 + random(0) * Math.PI) * params.amplitude * progress,
  }),
});
export const boxRule = defineDecorEffect({
  id: 'example.boxRule', name: 'Box rule', description: 'A short accent rule follows the current lyric bounds.', tags: ['decor', 'graphic'], layer: 'back',
  schema: {
    thickness: {type: 'number', default: 4, min: 1, max: 12, unit: 'design px', description: 'Rule thickness.'},
    accent: {type: 'boolean', default: true, description: 'Use the accent palette color.'},
  },
  draw: ({ctx, box, params, style, pIn, pOut}) => {
    if (!box) return;
    ctx.globalAlpha = Math.min(1, pIn * 2) * (1 - pOut);
    ctx.fillStyle = params.accent ? style.palette.accent : style.palette.sub;
    ctx.fillRect(box.x0, box.y1 + 18, box.x1 - box.x0, params.thickness);
  },
});
