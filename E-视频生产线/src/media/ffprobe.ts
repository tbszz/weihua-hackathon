import path from 'node:path';

import {ProcessExecutionError, runProcess} from './process.js';

export type MediaKind = 'video' | 'image' | 'audio';

export type AudioMetadata = {
  codec?: string;
  sampleRate?: number;
  channels?: number;
  channelLayout?: string;
  bitRate?: number;
};

export type MediaProbe = {
  kind: MediaKind;
  durationSeconds: number;
  hasAudio: boolean;
  width?: number;
  height?: number;
  fps?: number;
  rFrameRate?: number;
  avgFrameRate?: number;
  codec?: string;
  format?: string;
  videoStreamIndex?: number;
  audioStreamIndex?: number;
  rotation?: number;
  audio?: AudioMetadata;
};

type ProbeStream = {
  index?: unknown;
  codec_type?: unknown;
  codec_name?: unknown;
  width?: unknown;
  height?: unknown;
  duration?: unknown;
  avg_frame_rate?: unknown;
  r_frame_rate?: unknown;
  sample_rate?: unknown;
  channels?: unknown;
  channel_layout?: unknown;
  bit_rate?: unknown;
  disposition?: {default?: unknown; attached_pic?: unknown};
  tags?: {rotate?: unknown};
  side_data_list?: Array<{rotation?: unknown}>;
};

type ProbeDocument = {
  streams?: ProbeStream[];
  format?: {duration?: unknown; format_name?: unknown};
  error?: {string?: unknown; code?: unknown};
};

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.heic',
  '.heif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
]);

const VIDEO_EXTENSIONS = new Set([
  '.3gp',
  '.avi',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.mts',
  '.m2ts',
  '.webm',
  '.wmv',
]);

const AUDIO_EXTENSIONS = new Set([
  '.aac',
  '.aiff',
  '.alac',
  '.flac',
  '.m4a',
  '.mp3',
  '.ogg',
  '.opus',
  '.wav',
  '.wma',
]);

export const inferKindFromExtension = (filePath: string): MediaKind | undefined => {
  const extension = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return 'audio';
  }
  return undefined;
};

const parseFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (value: unknown): number | undefined => {
  const number = parseFiniteNumber(value);
  return number === undefined || !Number.isInteger(number) ? undefined : number;
};

const parseRate = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return parseFiniteNumber(value);
  }

  const [numeratorText, denominatorText] = value.split('/');
  if (denominatorText === undefined) {
    return parseFiniteNumber(value);
  }
  const numerator = parseFiniteNumber(numeratorText);
  const denominator = parseFiniteNumber(denominatorText);
  if (numerator === undefined || denominator === undefined || denominator === 0) {
    return undefined;
  }
  const rate = numerator / denominator;
  return rate > 0 && Number.isFinite(rate) ? rate : undefined;
};

export const chooseTimelineFrameRate = (input: {
  rFrameRate: unknown;
  avgFrameRate: unknown;
}): {fps?: number; rFrameRate?: number; avgFrameRate?: number} => {
  const rFrameRate = parseRate(input.rFrameRate);
  const avgFrameRate = parseRate(input.avgFrameRate);
  return {
    ...optionalNumber('fps', rFrameRate ?? avgFrameRate),
    ...optionalNumber('rFrameRate', rFrameRate),
    ...optionalNumber('avgFrameRate', avgFrameRate),
  };
};

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const isEnabled = (value: unknown): boolean => parseFiniteNumber(value) === 1;

const isStillImageFormat = (format: string | undefined): boolean =>
  format
    ?.split(',')
    .some((name) =>
      [
        'avif',
        'bmp_pipe',
        'gif',
        'heif',
        'image2',
        'image2pipe',
        'jpeg_pipe',
        'png_pipe',
        'tiff_pipe',
        'webp_pipe',
      ].includes(name),
    ) ?? false;

const streamArea = (stream: ProbeStream): number =>
  (parseInteger(stream.width) ?? 0) * (parseInteger(stream.height) ?? 0);

const selectPreferredStream = (
  streams: readonly ProbeStream[],
): ProbeStream | undefined =>
  [...streams].sort((left, right) => {
    const defaultDifference =
      Number(isEnabled(right.disposition?.default)) -
      Number(isEnabled(left.disposition?.default));
    return defaultDifference !== 0
      ? defaultDifference
      : streamArea(right) - streamArea(left);
  })[0];

const parseProbeDocument = (output: string, filePath: string): ProbeDocument => {
  try {
    const parsed: unknown = JSON.parse(output);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('root is not an object');
    }
    return parsed as ProbeDocument;
  } catch (error) {
    throw new Error(`Unable to probe ${filePath}: ffprobe returned invalid JSON`, {
      cause: error,
    });
  }
};

const errorDetail = (error: ProcessExecutionError): string => {
  if (error.stdout.trim() !== '') {
    try {
      const document = JSON.parse(error.stdout) as ProbeDocument;
      const message = text(document.error?.string);
      if (message !== undefined) {
        return message;
      }
    } catch {
      // The process stderr below is still the authoritative fallback.
    }
  }
  return error.stderr.trim() || error.stdout.trim() || error.message;
};

const optionalNumber = <TKey extends string>(
  key: TKey,
  value: number | undefined,
): {[K in TKey]?: number} => (value === undefined ? {} : {[key]: value}) as {
  [K in TKey]?: number;
};

const optionalText = <TKey extends string>(
  key: TKey,
  value: string | undefined,
): {[K in TKey]?: string} => (value === undefined ? {} : {[key]: value}) as {
  [K in TKey]?: string;
};

export const probeMedia = async (filePath: string): Promise<MediaProbe> => {
  let output: string;
  try {
    ({stdout: output} = await runProcess('ffprobe', [
      '-v',
      'error',
      '-of',
      'json',
      '-show_error',
      '-show_format',
      '-show_streams',
      filePath,
    ]));
  } catch (error) {
    const detail =
      error instanceof ProcessExecutionError ? errorDetail(error) : String(error);
    throw new Error(`Unable to probe ${filePath}: ${detail}`, {cause: error});
  }

  const document = parseProbeDocument(output, filePath);
  const reportedError = text(document.error?.string);
  if (reportedError !== undefined) {
    throw new Error(`Unable to probe ${filePath}: ${reportedError}`);
  }

  const streams = Array.isArray(document.streams) ? document.streams : [];
  const visualStreams = streams.filter(
    (stream) =>
      stream.codec_type === 'video' &&
      !isEnabled(stream.disposition?.attached_pic),
  );
  const audioStreams = streams.filter((stream) => stream.codec_type === 'audio');
  const videoStream = selectPreferredStream(visualStreams);
  const audioStream = selectPreferredStream(audioStreams);

  if (videoStream === undefined && audioStream === undefined) {
    throw new Error(`Unable to probe ${filePath}: no decodable audio or video streams`);
  }

  const format = text(document.format?.format_name);
  const kind: MediaKind =
    videoStream === undefined
      ? 'audio'
      : isStillImageFormat(format)
        ? 'image'
        : 'video';
  const formatDuration = parseFiniteNumber(document.format?.duration);
  const streamDuration = parseFiniteNumber(
    kind === 'audio' ? audioStream?.duration : videoStream?.duration,
  );
  const durationSeconds =
    kind === 'image' ? 0 : Math.max(0, formatDuration ?? streamDuration ?? 0);

  const rotation =
    parseFiniteNumber(videoStream?.tags?.rotate) ??
    videoStream?.side_data_list
      ?.map((entry) => parseFiniteNumber(entry.rotation))
      .find((value): value is number => value !== undefined);

  const audio: AudioMetadata | undefined =
    audioStream === undefined
      ? undefined
      : {
          ...optionalText('codec', text(audioStream.codec_name)),
          ...optionalNumber('sampleRate', parseInteger(audioStream.sample_rate)),
          ...optionalNumber('channels', parseInteger(audioStream.channels)),
          ...optionalText('channelLayout', text(audioStream.channel_layout)),
          ...optionalNumber('bitRate', parseInteger(audioStream.bit_rate)),
        };
  const frameRates = chooseTimelineFrameRate({
    rFrameRate: videoStream?.r_frame_rate,
    avgFrameRate: videoStream?.avg_frame_rate,
  });

  return {
    kind,
    durationSeconds,
    hasAudio: audioStream !== undefined,
    ...optionalNumber('width', parseInteger(videoStream?.width)),
    ...optionalNumber('height', parseInteger(videoStream?.height)),
    ...frameRates,
    ...optionalText('codec', text(videoStream?.codec_name ?? audioStream?.codec_name)),
    ...optionalText('format', format),
    ...optionalNumber('videoStreamIndex', parseInteger(videoStream?.index)),
    ...optionalNumber('audioStreamIndex', parseInteger(audioStream?.index)),
    ...optionalNumber('rotation', rotation),
    ...(audio === undefined ? {} : {audio}),
  };
};
