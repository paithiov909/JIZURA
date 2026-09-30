import type { AudioAnalysis, ExportRange, Plan, PlanLine, Project, UserFont } from '../../engine/types.ts';
import type { Quality } from '../types.ts';

export interface LoadedAudio extends AudioAnalysis {
  name: string; duration: number; sampleRate: number; buffer: AudioBuffer;
  bpm: number; beats: number[]; energy: Float32Array; energyRate: number; peaks: Float32Array;
}
export interface VideoCodec {
  codec: string; mux: 'avc' | 'vp9' | 'av1'; label: string;
  cfg: VideoEncoderConfig; hw?: 'auto' | 'prefer-software';
}
// mp4-muxer checks the actual stream's runtime class as well as its methods.
export type WritableVideoFile = FileSystemWritableFileStream;
export interface ExportOptions {
  plan: Plan; project: Project; range?: ExportRange | null; signal?: AbortSignal;
  onProgress?: (progress: number, message: string) => void;
}
export interface MP4Result {
  blob: Blob | null; size: number | null; codec: string; audio: 'aac' | 'opus' | null;
  audioWanted: boolean; width: number; height: number; toFile: boolean; tried: string[];
}
/** Browser service methods retained on each engine for existing CEP/Node users.
 * Loading/encoding is lazy: creating an engine performs no audio/file I/O. */
export interface BrowserServices {
  loadFontFile(file: File): Promise<UserFont>;
  restoreUserFonts(list?: UserFont[]): Promise<string[]>;
  missingUserFonts(keys: string[]): string[];
  fontsOfPlan(plan?: Plan | null): string[];
  ensureFonts(text: string, keys?: string[] | null): Promise<void>;
  analyzeAudio(file: File): Promise<LoadedAudio>;
  audioWav(buffer: AudioBuffer, duration: number, offset?: number): Blob;
  beatGrid(bpm: number, offset: number, duration: number): number[];
  saveSong(file: File): Promise<boolean>; loadSong(): Promise<File | null>;
  saveFontData(key: string, data: ArrayBuffer): Promise<boolean>;
  loadFontData(key: string): Promise<ArrayBuffer | null>; forgetSong(): Promise<void>;
  saveFile(filename: string, data: Blob | BlobPart): Promise<'saved' | 'declined'>;
  videoBitrate(width: number, height: number, fps: number, quality: Quality): number;
  pickVideoCodec(width: number, height: number, fps: number, bitrate: number): Promise<VideoCodec | null>;
  videoAttempts(width: number, height: number, fps: number, bitrate: number): Promise<VideoCodec[]>;
  pickAudioCodec(sampleRate: number, channels: number): Promise<{ codec: string; mux: 'aac' | 'opus'; sr: number } | null>;
  lrcText(project: Project, lines: PlanLine[], range?: ({ from: number; to: number; t0: number }) | null): string;
  exportMP4(options: ExportOptions & { audio?: LoadedAudio | null; quality?: Quality; file?: WritableVideoFile | null }): Promise<MP4Result>;
  exportPNGZip(options: ExportOptions & { transparent?: boolean; layers?: boolean; every?: number }): Promise<Blob>;
}
