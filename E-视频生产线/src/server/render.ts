import path from 'node:path';
import {mkdir, writeFile, readdir, access} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {probeMedia} from '../media/ffprobe';
import {runProcess} from '../media/process';
import {validateStoryboard, type DemoAsset, type StoryboardScene, type RenderResult} from '../demo/pipeline';

const root = process.cwd();
let bundlePromise: Promise<string> | undefined;
const minimaxScript = process.env.MINIMAX_VOICE_SCRIPT ?? 'D:\\个人自媒体系统\\tools\\minimax-voice\\minimax_voice.py';
const voiceId = process.env.MINIMAX_VOICE_ID ?? 'alinVoice01';
export async function browserPath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  for (const directory of await readdir(cache).catch(() => [])) {
    const candidate = path.join(cache, directory, 'chrome-win64/chrome.exe');
    if (directory.startsWith('chromium-') && await access(candidate).then(() => true, () => false)) return candidate;
  }
  return undefined;
}

export async function renderFilm(id: string, scenes: StoryboardScene[], assets: DemoAsset[], baseUrl: string, progress: (percent: number, stage: string) => void): Promise<RenderResult> {
  validateStoryboard(scenes);
  const directory = path.join(root, 'data/jobs', id);
  await mkdir(directory, {recursive: true});
  const audio: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    progress(2 + index * 2, '中文配音');
    const textFile = path.join(directory, `${index}.txt`);
    const audioFile = path.join(directory, `${index}.mp3`);
    await writeFile(textFile, scene.narration);
    await runProcess('python', [minimaxScript, 'tts', '--voice-id', voiceId, '--text-file', textFile, '--out', audioFile, '--model', 'speech-2.8-hd', '--emotion', 'fluent'], {timeoutMs: 300000});
    const probe = await probeMedia(audioFile);
    if (probe.durationSeconds > scene.seconds - 0.15) throw new Error(`${scene.id} 配音 ${probe.durationSeconds.toFixed(1)} 秒超过镜头，请延长时长`);
    audio.push(`${baseUrl}/outputs/${id}/${index}.mp3`);
  }
  await runProcess('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=110:sample_rate=44100:duration=12', '-af', 'tremolo=f=2:d=0.65,afade=t=in:d=1,afade=t=out:st=10:d=2', path.join(directory, 'music.wav')]);
  bundlePromise ??= bundle({entryPoint: path.join(root, 'src/remotion/index.tsx')}).catch((error) => {bundlePromise = undefined; throw error;});
  progress(18, '准备渲染');
  const serveUrl = await bundlePromise;
  const inputProps = {scenes, assets: assets.map((asset) => ({...asset, image: `${baseUrl}${asset.image}`})), audio, music: `${baseUrl}/outputs/${id}/music.wav`};
  const browserExecutable = await browserPath();
  const composition = await selectComposition({serveUrl, id: 'Weihua', inputProps, browserExecutable});
  const previewOutput = path.join(directory, 'film-preview.mp4');
  const output = path.join(directory, 'film.mp4');
  await renderMedia({serveUrl, composition, inputProps, browserExecutable, codec: 'h264', audioCodec: 'aac', outputLocation: previewOutput, concurrency: 1, scale: 0.5, crf: 25, onProgress: ({progress: fraction}) => progress(20 + Math.round(fraction * 58), '渲染成片')});
  progress(80, '输出 1920 × 1080');
  await runProcess('ffmpeg', ['-y', '-i', previewOutput, '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', output], {timeoutMs: 180000});
  progress(90, '实际编码与画面质检');
  const probe = await probeMedia(output);
  const inspection = await runProcess('ffmpeg', ['-hide_banner', '-i', output, '-vf', 'blackdetect=d=0.3:pix_th=0.05,freezedetect=n=-50dB:d=2', '-af', 'volumedetect', '-f', 'null', '-'], {timeoutMs: 180000});
  const duration = scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const black = /black_start:/.test(inspection.stderr);
  const freeze = /freeze_start:/.test(inspection.stderr);
  const mean = inspection.stderr.match(/mean_volume:\s*([-\d.]+) dB/)?.[1];
  const checks: RenderResult['checks'] = [
    {label: '字幕数字与出处', status: 'pass', detail: '已按卫华 5739 报道的参数白名单校验'},
    {label: '编码 / 音频 / 时长', status: probe.width === 1920 && probe.height === 1080 && probe.fps === 30 && probe.hasAudio && Math.abs(probe.durationSeconds - duration) < 0.2 ? 'pass' : 'fail', detail: `${probe.width}×${probe.height} / ${probe.fps}fps / ${probe.durationSeconds.toFixed(2)}s / 音轨 ${probe.hasAudio}`},
    {label: '黑屏 / 冻结检测', status: black || freeze ? 'fail' : 'pass', detail: `FFmpeg 全片检测：黑屏 ${black}，冻结 ${freeze}`},
    {label: '音量检测', status: mean && Number(mean) > -40 ? 'pass' : 'fail', detail: `实际平均音量 ${mean ?? '无'} dBFS`},
    {label: '字幕安全区', status: 'warning', detail: '模板坐标在安全区内；长文换行请人工预览检查'},
  ];
  const result: RenderResult = {status: checks.some((check) => check.status === 'fail') ? 'failed' : 'complete', durationSeconds: probe.durationSeconds, sceneCount: scenes.length, checks, outputUrl: `/outputs/${id}/film.mp4`, reportUrl: `/outputs/${id}/report.json`};
  await writeFile(path.join(directory, 'report.json'), JSON.stringify({result, probe, scenes, assets}, null, 2));
  await writeFile(path.join(directory, 'inspection.txt'), inspection.stderr);
  return result;
}
