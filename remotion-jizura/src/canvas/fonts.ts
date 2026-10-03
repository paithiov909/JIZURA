import {JizuraError} from '../core/error.js';
import type {ResolvedFont} from '../core/style.js';

export const fontCSS = (font: ResolvedFont, px: number) =>
  `${font.style} ${font.weight} ${px.toFixed(2)}px "${font.family}"`;

const familyOf = (face: FontFace) => face.family.replace(/^["']|["']$/g, '').trim().toLowerCase();
function matches(face: FontFace, font: ResolvedFont): boolean {
  const weights = face.weight === 'normal' ? [400] : face.weight === 'bold' ? [700] : face.weight.split(/\s+/).map(Number);
  return familyOf(face) === font.family.toLowerCase() && face.style === font.style &&
    weights.every(Number.isFinite) && font.weight >= weights[0] && font.weight <= weights[weights.length - 1];
}
type Resource = {src: string; face: FontFace; promise: Promise<FontFace>; users: number};
// Only asynchronous face resources are shared. Geometry and metrics are Scene-owned.
// WeakMap creation does not access the DOM at import time.
const resources = new WeakMap<Document, Map<string, Resource>>();

function bounded<T>(job: Promise<T>, signal: AbortSignal, timeout: number, path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => finish(() => reject(new JizuraError('E_FONT', path, 'Font preparation was cancelled.')));
    const timer = setTimeout(() => finish(() => reject(new JizuraError('E_FONT', path, `Font preparation timed out after ${timeout}ms.`))), timeout);
    const finish = (fn: () => void) => { clearTimeout(timer); signal.removeEventListener('abort', abort); fn(); };
    signal.addEventListener('abort', abort, {once: true});
    if (signal.aborted) abort();
    job.then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
  });
}

export class SceneFonts {
  private releases: (() => void)[] = [];
  private controller = new AbortController();
  private disposed = false;
  private doc: Document;
  private timeout: number;
  constructor(doc: Document, timeout = 15000) { this.doc = doc; this.timeout = timeout; }

  async prepare(font: ResolvedFont, text: string, path: string): Promise<void> {
    let src: string | undefined;
    try {
      if (this.disposed) throw new Error('Scene font resources have been disposed.');
      const fonts = this.doc.fonts;
      if (!fonts) throw new Error('The FontFaceSet API is required.');
      let table = resources.get(this.doc);
      if (!table) { table = new Map(); resources.set(this.doc, table); }
      const key = JSON.stringify([font.family.toLowerCase(), font.weight, font.style]);
      let resource = table.get(key);
      if (font.src !== undefined) {
        src = new URL(font.src, this.doc.baseURI).href;
        if (resource && resource.src !== src) throw new Error(`Conflicting sources for the same font face; already loading ${JSON.stringify(resource.src)}.`);
        if (!resource) {
          // A caller-owned face has no inspectable source; do not shadow it.
          if (Array.from(fonts).some(face => matches(face, font))) throw new Error('A matching caller-owned face is already registered; omit src.');
          const Face = this.doc.defaultView?.FontFace;
          if (!Face) throw new Error('The FontFace API is required.');
          const face = new Face(font.family, `url(${JSON.stringify(src)})`, {weight: String(font.weight), style: font.style});
          resource = {src, face, users: 0, promise: Promise.resolve(face)};
          const owned = resource;
          resource.promise = face.load().then(loaded => {
            // A cancelled load must never register a late face.
            if (owned.users > 0) fonts.add(loaded);
            return loaded;
          });
          table.set(key, resource);
        }
      }
      if (resource) {
        resource.users++;
        const owned = resource;
        this.releases.push(() => {
          if (--owned.users === 0) { fonts.delete(owned.face); if (table.get(key) === owned) table.delete(key); }
        });
        await bounded(resource.promise, this.controller.signal, this.timeout, path);
      }
      if (!Array.from(fonts).some(face => matches(face, font))) throw new Error('The requested font face is not registered.');
      // check() alone accepts system fallback. load() must return the requested
      // registered face(s), including the relevant Unicode subsets of CSS fonts.
      const loaded = await bounded(fonts.load(fontCSS(font, 100), text), this.controller.signal, this.timeout, path);
      if (!loaded.some(face => matches(face, font) && face.status === 'loaded') || !fonts.check(fontCSS(font, 100), text)) {
        throw new Error('The requested font face did not load.');
      }
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      const source = font.src === undefined ? 'Source: caller-registered FontFace or @font-face.' :
        `Source: ${JSON.stringify(font.src)}${src === undefined ? '' : ` (resolved URL: ${JSON.stringify(src)})`}.`;
      const hint = font.src === undefined ?
        'Register a matching FontFace or @font-face before mounting JizuraScene, or provide font.src.' :
        'Check that font.src points to an accessible, valid font file (and check CORS for remote URLs). ' +
        'For Remotion staticFile(), put the file in the public directory or pass --public-dir pointing to the directory containing it when starting Studio or rendering.';
      const failure = new JizuraError('E_FONT', path, [
        `[E_FONT] ${path}: Font preparation failed. ${font.src === undefined ? 'Register the requested font face.' : 'Check font.src and Remotion --public-dir.'}`,
        `Font: ${JSON.stringify(font.family)} (weight ${font.weight}, style ${font.style}).`,
        source, `Reason: ${reason}`, hint,
      ].join('\n'));
      failure.cause = error;
      throw failure;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.abort();
    for (const release of this.releases.splice(0)) release();
  }
}
