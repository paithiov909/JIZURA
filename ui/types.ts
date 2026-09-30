import type { AEPlan, EffectGroup, Effects, ExportRange, Project, Timing } from '../engine/types.ts';

export type EditorMode = 'easy' | 'pro' | 'mobile';
export type ExportKind = 'mp4' | 'mp4file' | 'png' | 'pnga' | 'pngl';
export type Quality = 'standard' | 'high' | 'max';
export type CutGroup = Exclude<EffectGroup, 'fx'>;
export interface LineRange { from: number; to: number }
export interface ExportFile {
  name: string; bytes?: number; status: 'saved' | 'download_started' | 'declined';
}
export interface ExportJob {
  id: string; kind: ExportKind;
  status: 'running' | 'completed' | 'cancelled' | 'failed' | 'save_declined';
  progress: number; files: ExportFile[]; error: string | null; message?: string;
}
export type SettingsPatch = Partial<Pick<Project,
  'title' | 'artist' | 'lang' | 'style' | 'seed' | 'extra' | 'wa' | 'horror' | 'typo' |
  'kinetic' | 'unify' | 'typeset' | 'centerFree' | 'centerDir' | 'keyBg' | 'aspect' |
  'res' | 'fps' | 'includeAudio'>> & {
  fx?: Partial<Effects>; colors?: Project['colors']; fonts?: Project['fonts'];
  localFont?: string; mode?: EditorMode; quality?: Quality;
  /** One-based inclusive line numbers, matching the existing adapter. */
  exportRange?: LineRange | null;
};
export interface PreviewOptions {
  action?: 'play' | 'pause'; time?: number; loop?: 'all' | 'line' | 'cut' | 'off';
  volume?: number; muted?: boolean; mode?: EditorMode;
}
export interface EditorState {
  revision: number; loading: { boot: boolean; audio: boolean; fonts: boolean };
  duration: number; lineCount: number; cutCount: number;
  playback: {
    playing: boolean; time: number; loop: 'all' | 'line' | 'cut' | 'off';
    volume: number; muted: boolean; mode: EditorMode;
  };
  history: { undo: boolean; redo: boolean; previous: boolean; next: boolean };
  audio: { loaded: boolean; name: string | null; duration: number | null; bpm: number | null; input: '#audioFile' };
  fonts: { missing: string[]; input: '#fontFile' }; tap: { nextLine: number } | null;
  exportRange: LineRange | null; exportJob: ExportJob | null; resetPending: boolean;
}
export interface DetailedEditorState extends EditorState {
  project: Project;
  lines: Array<{ line: number; sourceRow: number; text: string; interlude: boolean; start: number; end: number; locked: boolean }>;
  cuts: Array<{ line: number | null; cut: number | null; text: string; start: number; end: number; techniques: Partial<Record<CutGroup, string>> }>;
}

/** The editor owns mutations, history, replanning, persistence and export jobs.
 * Adapters validate untrusted inputs, busy state and revisions before calling it.
 * Line/cut mutation indexes are zero-based; timing entries and settings ranges
 * are one-based for compatibility with the original editor operations.
 */
export interface EditorAPI {
  prepare(): void;
  activate(): void;
  state(detail: true): DetailedEditorState;
  state(detail?: false): EditorState;
  state(detail: boolean): EditorState | DetailedEditorState;
  settings(patch: SettingsPatch): void;
  lyrics(text: string, clear?: boolean): void;
  timing(patch: Partial<Timing>, times: Array<{ line: number; time: number | null }>, clear?: boolean): void;
  line(index: number, patch: { text?: string; layout?: string | null; cuts?: number | null; lock?: boolean }): void;
  cut(lineIndex: number, cutIndex: number, group: CutGroup, key?: string, quiet?: boolean): void;
  techniques(group: EffectGroup, keys: string[], enabled: boolean, bulk?: boolean): void;
  locks(kind: 'tech' | 'params', keys: string[], on: boolean): void;
  randomize(target: 'all' | 'palette' | 'line' | 'cut' | 'style' | 'mood' | 'composition', lineIndex?: number, cutIndex?: number, strategy?: 'omakase' | 'shuffle'): void;
  history(kind: 'edit' | 'look', direction: -1 | 1): void;
  preview(options: PreviewOptions): { audioPlayback: 'ready' | 'needs_user_activation' };
  tap(action: 'start' | 'record' | 'back' | 'stop', from?: number): void;
  projectData(ae: true): AEPlan;
  projectData(ae?: false): Project;
  projectData(ae: boolean): Project | AEPlan;
  importProject(project: unknown): Promise<void>;
  saveProject(ae: boolean): Promise<ExportFile>;
  requestReset(): void;
  startExport(kind: ExportKind): ExportJob;
  cancelExport(): ExportJob | null;
}
/** CEP compatibility hooks; browser adapters should use EditorAPI. */
export interface EditorHost {
  editor: EditorAPI;
  toast(message: string): void; replan(): void; syncUI(): void; pause(): void;
  seek(time: number): void; flushSave(): void; restartPreview(): void;
  loadAudioFile(file: File, restored?: boolean): Promise<boolean>;
  exportRange(): ExportRange | null;
  exportRangeLines(): LineRange | null;
}
