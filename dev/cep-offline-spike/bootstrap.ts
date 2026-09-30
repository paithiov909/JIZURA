import plan from '../../tests/baseline/v1/lrc-ja-ae-plan.json';
import './style.css';
import asset from './asset.svg';

// This fixture supplies only the editor surface consumed by the unchanged bridges.
// It is not a replacement editor and does not implement the WebMCP tools.
declare global {
  interface Window {
    J: {
      ui: { plan: typeof plan; project: { timing: { lineTimes: Record<string, number> } } };
      uiApi: { pause(): void; toast(message: string): void; loadAudioFile(file: File): Promise<boolean> };
      GROUP_KEYS: string[];
      STYLE_ORDER: string[];
      planForAE(): typeof plan;
      saveFile(filename: string, data: Blob | string): Promise<string>;
    };
    __spike: { started: boolean; language: string; probe: string; toasts: string[]; audio?: { name: string; bytes: number[] } };
  }
}

window.__spike = { started: false, language: document.documentElement.lang, probe: '', toasts: [] };
// A post-Chromium-88 syntax probe: the explicit target must lower this static block.
class TargetProbe {
  static { window.__spike.probe = 'static block executed'; }
}
void TargetProbe;
window.J = {
  ui: { plan, project: { timing: { lineTimes: {} } } },
  uiApi: {
    pause() {}, toast(message) { window.__spike.toasts.push(message); },
    async loadAudioFile(file) {
      window.__spike.audio = { name: file.name, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
      return true;
    },
  },
  GROUP_KEYS: ['layout', 'enter', 'hold', 'exit', 'decor', 'treat', 'bg', 'cam', 'trans'],
  STYLE_ORDER: [plan.styleKey],
  planForAE: () => plan,
  saveFile: async () => 'browser-fallback',
};
document.querySelector<HTMLImageElement>('#asset')!.src = asset;
