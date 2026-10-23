// Minimal types for the parts of Mediabunny we use (Cinematic download, Clips' last-seconds cut).
// Its own .d.ts references @types/dom-webcodecs, which clashes with TypeScript's DOM lib under
// skipLibCheck: false — tsconfig maps 'mediabunny' here; the real package is bundled as usual.
declare module 'mediabunny' {
  export type Quality = { readonly __quality: true };
  export const QUALITY_HIGH: Quality;
  export const ALL_FORMATS: unknown[];
  export function canEncodeVideo(codec: 'avc', options?: { width?: number; height?: number }): Promise<boolean>;
  export function canEncodeAudio(codec: 'aac'): Promise<boolean>;

  export class BlobSource { constructor(blob: Blob); }
  export class UrlSource { constructor(url: string); }
  export interface InputVideoTrack { computeDuration(): Promise<number>; readonly displayWidth: number; readonly displayHeight: number; }
  export class Input {
    constructor(options: { source: BlobSource | UrlSource; formats: unknown[] });
    getPrimaryVideoTrack(): Promise<InputVideoTrack | null>;
    dispose(): void;
  }
  export interface WrappedCanvas { canvas: HTMLCanvasElement | OffscreenCanvas; timestamp: number; duration: number }
  export class CanvasSink {
    constructor(track: InputVideoTrack, options?: { width?: number; height?: number; fit?: 'fill' | 'contain' | 'cover'; poolSize?: number });
    canvasesAtTimestamps(timestamps: Iterable<number>): AsyncGenerator<WrappedCanvas | null, void, unknown>;
  }

  export class Mp4OutputFormat { constructor(options?: { fastStart?: false | 'in-memory' | 'reserve' | 'fragmented' }); }
  export class BufferTarget { buffer: ArrayBuffer | null; }
  export class CanvasSource {
    constructor(canvas: HTMLCanvasElement | OffscreenCanvas, config: { codec: 'avc'; bitrate?: number | Quality; keyFrameInterval?: number });
    add(timestamp: number, duration?: number): Promise<void>;
  }
  export class AudioBufferSource {
    constructor(config: { codec: 'aac'; bitrate?: number | Quality });
    add(buffer: AudioBuffer): Promise<void>;
  }
  export class Output {
    constructor(options: { format: Mp4OutputFormat; target: BufferTarget });
    target: BufferTarget;
    addVideoTrack(source: CanvasSource, metadata?: { frameRate?: number }): unknown;
    addAudioTrack(source: AudioBufferSource): unknown;
    start(): Promise<void>;
    finalize(): Promise<void>;
  }
  export class Conversion {
    static init(options: {
      input: Input;
      output: Output;
      trim?: { start?: number; end?: number };
      video?: { crop?: { left: number; top: number; width: number; height: number }; width?: number; height?: number; fit?: 'fill' | 'contain' | 'cover' };
    }): Promise<Conversion>;
    readonly isValid: boolean;
    execute(): Promise<void>;
    cancel(): Promise<void>;
  }
}
