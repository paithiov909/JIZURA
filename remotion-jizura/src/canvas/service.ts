import {JizuraError} from '../core/error.js';
import type {MeasurementService, PreparedCut, PreparedScene} from '../core/scene-plan.js';
import type {ResolvedFont} from '../core/style.js';
import {fontCSS, SceneFonts} from './fonts.js';
import type {CutGeometry} from './geometry.js';
import {measureCenterCut} from './center.js';

export class CanvasMeasurementService implements MeasurementService<CutGeometry> {
  private fonts: SceneFonts;
  private context: CanvasRenderingContext2D | null = null;
  private cache = new Map<string, number>();
  private ready = false;
  private disposed = false;
  private doc: Document;
  constructor(doc: Document, timeout?: number) { this.doc = doc; this.fonts = new SceneFonts(doc, timeout); }

  async prepareFonts(scene: PreparedScene): Promise<void> {
    const groups = new Map<string, {font: ResolvedFont; text: string; path: string}>();
    for (const cut of scene.cuts) {
      const sample = cut.text + (cut.layout.params.sub ? cut.lineText : "");
      const key = JSON.stringify(cut.font);
      const entry = groups.get(key);
      if (entry) entry.text += sample;
      else groups.set(key, {font: cut.font, text: sample, path: `cuts[${cut.declarationIndex}].font`});
    }
    for (const {font, text, path} of groups.values()) await this.fonts.prepare(font, text, path);
    if (this.disposed) throw new JizuraError('E_FONT', 'font', 'Measurement service was disposed.');
    if (scene.cuts.length) {
      this.context = this.doc.createElement('canvas').getContext('2d');
      if (!this.context) throw new JizuraError('E_INPUT', 'canvas', 'A 2D measurement context is required.');
    }
    this.ready = true;
  }

  measureCut(cut: PreparedCut, scene: PreparedScene): CutGeometry {
    if (!this.ready || this.disposed || !this.context) throw new JizuraError('E_FONT', `cuts[${cut.declarationIndex}].font`, 'Prepare fonts before measuring text.');
    return measureCenterCut(cut, scene, (font, ch) => {
      const key = JSON.stringify([font, ch]);
      let advance = this.cache.get(key);
      if (advance === undefined) {
        this.context!.font = fontCSS(font, 100);
        advance = this.context!.measureText(ch).width / 100;
        if (!(advance > 0)) advance = ch === ' ' ? 0.3 : 1;
        this.cache.set(key, advance);
      }
      return advance;
    });
  }

  dispose(): void {
    this.disposed = true; this.ready = false;
    this.fonts.dispose(); this.context = null; this.cache.clear();
  }
}
