// 「名场面穿越」成片渲染：npm run chuanyue -- <project.json> [--out <目录>] [--scale 0.5] [--concurrency 2]
// 读取工程 JSON（素材路径相对于 JSON 文件）→ Remotion 合成（硬切 + 竖排书法标题 + 对白字幕 + 配音/音效/BGM）
// → FFmpeg 响度归一（原片约 -9.4 LUFS）→ 全片质检 → report.json。
import Fastify from 'fastify';
import staticFiles from '@fastify/static';
import path from 'node:path';
import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {chuanyueProjectSchema, isImage, validateProject, type ChuanyueProject} from '../chuanyue/project';
import {probeMedia} from '../media/ffprobe';
import {runProcess} from '../media/process';
import {browserPath} from './render';

const args = process.argv.slice(2);
const option = (name: string) => {const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined;};
const projectFile = args.find((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
if (!projectFile) throw new Error('用法：npm run chuanyue -- <project.json> [--out 目录] [--scale 1] [--concurrency 2]');
const projectPath = path.resolve(projectFile);
const projectDir = path.dirname(projectPath);
const outDir = path.resolve(option('--out') ?? path.join(projectDir, 'out'));
const scale = Number(option('--scale') ?? 1);
const concurrency = Number(option('--concurrency') ?? 2);
await mkdir(outDir, {recursive: true});

const project = chuanyueProjectSchema.parse(JSON.parse(await readFile(projectPath, 'utf8')));
const total = validateProject(project);

// 1. 收集并检查素材
const files: string[] = [];
const register = async (src: string) => {
  const absolute = path.resolve(projectDir, src);
  await access(absolute).catch(() => {throw new Error(`素材不存在：${absolute}`);});
  files.push(absolute);
  return files.length - 1;
};
for (const shot of project.shots) {
  const index = await register(shot.src);
  if (isImage(shot.src)) continue;
  const probe = await probeMedia(files[index]);
  if (probe.durationSeconds + 0.05 < shot.trimStart + shot.seconds) throw new Error(`${shot.id} 素材只有 ${probe.durationSeconds.toFixed(2)} 秒，不够 trimStart ${shot.trimStart} + ${shot.seconds} 秒`);
}
for (const item of [...project.voices, ...project.sfx, ...(project.bgm ? [project.bgm] : [])]) await register(item.src);

// 2. 本地媒体服务（支持 Range，供 Remotion 读取视频）
const server = Fastify();
await server.register(staticFiles, {root: projectDir, serve: false});
server.get('/m/:index', (request, reply) => {
  const file = files[Number((request.params as {index: string}).index)];
  if (!file) return reply.code(404).send();
  return reply.sendFile(path.basename(file), path.dirname(file));
});
await server.listen({port: 0, host: '127.0.0.1'});
const address = server.server.address();
const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
let cursor = 0;
const url = () => `${base}/m/${cursor++}`;
const inputProps: ChuanyueProject = {
  ...project,
  shots: project.shots.map((shot) => ({...shot, src: `${url()}?ext=${path.extname(shot.src).toLowerCase()}`})),
  voices: project.voices.map((voice) => ({...voice, src: url()})),
  sfx: project.sfx.map((effect) => ({...effect, src: url()})),
  bgm: project.bgm ? {...project.bgm, src: url()} : undefined,
};

try {
  // 3. Remotion 合成
  const log = (stage: string) => console.log(`[chuanyue] ${stage}`);
  log(`工程「${project.title}」：${project.shots.length} 个镜头，${total.toFixed(2)} 秒，${project.width}×${project.height}@${project.fps}`);
  const serveUrl = await bundle({entryPoint: path.join(process.cwd(), 'src/remotion/index.tsx')});
  const browserExecutable = await browserPath();
  const composition = await selectComposition({serveUrl, id: 'Chuanyue', inputProps, browserExecutable});
  const mix = path.join(outDir, 'mix.mp4');
  let last = -1;
  await renderMedia({serveUrl, composition, inputProps, browserExecutable, codec: 'h264', audioCodec: 'aac', outputLocation: mix, concurrency, scale, crf: 18, onProgress: ({progress}) => {const percent = Math.floor(progress * 10) * 10; if (percent !== last) {last = percent; log(`渲染 ${percent}%`);}}});

  // 4. 母带处理：原片是重压缩的满响度混音（-9.4 LUFS，LRA 2.1）。压缩 → 增益 → 限幅，迭代校准到目标响度。
  log('母带处理（压缩 + 限幅 + 响度校准）');
  const measure = async (file: string) => {
    const result = await runProcess('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], {timeoutMs: 300000});
    return Number(result.stderr.slice(result.stderr.lastIndexOf('Summary:')).match(/I:\s*([-\d.]+) LUFS/)?.[1]);
  };
  const compressed = path.join(outDir, 'mix-compressed.wav');
  await runProcess('ffmpeg', ['-y', '-i', mix, '-vn', '-af', 'acompressor=threshold=-24dB:ratio=6:attack=5:release=120:makeup=4', '-ar', '44100', compressed], {timeoutMs: 300000});
  const limit = Math.pow(10, project.loudness.truePeak / 20).toFixed(3);
  const mastered = path.join(outDir, 'mix-master.wav');
  let gain = project.loudness.targetLufs - await measure(compressed);
  for (let attempt = 0; attempt < 4; attempt++) {
    await runProcess('ffmpeg', ['-y', '-i', compressed, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=${limit}:attack=2:release=60:level=disabled`, '-ar', '44100', mastered], {timeoutMs: 300000});
    const error = project.loudness.targetLufs - await measure(mastered);
    if (Math.abs(error) <= 0.5) break;
    gain += error;
  }
  const output = path.join(outDir, 'film.mp4');
  const resize = scale === 1 ? [] : ['-vf', `scale=${project.width}:${project.height}:flags=lanczos`];
  await runProcess('ffmpeg', ['-y', '-i', mix, '-i', mastered, '-map', '0:v', '-map', '1:a', ...resize, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', output], {timeoutMs: 600000});

  // 5. 质检
  log('质检');
  const probe = await probeMedia(output);
  const inspection = await runProcess('ffmpeg', ['-hide_banner', '-i', output, '-vf', 'blackdetect=d=0.3:pix_th=0.05,freezedetect=n=-50dB:d=2', '-af', 'ebur128=peak=true', '-f', 'null', '-'], {timeoutMs: 600000});
  const summary = inspection.stderr.slice(inspection.stderr.lastIndexOf('Summary:'));
  const integrated = Number(summary.match(/I:\s*([-\d.]+) LUFS/)?.[1]);
  const peak = Number(summary.match(/Peak:\s*([-\d.]+) dBFS/)?.[1]);
  const black = /black_start:/.test(inspection.stderr);
  const freeze = /freeze_start:/.test(inspection.stderr);
  const checks = [
    {label: '尺寸 / 帧率 / 时长', status: probe.width === project.width && probe.height === project.height && Math.abs(probe.durationSeconds - total) < 0.25 && probe.hasAudio ? 'pass' : 'fail', detail: `${probe.width}×${probe.height} / ${probe.fps}fps / ${probe.durationSeconds.toFixed(2)}s（目标 ${total.toFixed(2)}s）/ 音轨 ${probe.hasAudio}`},
    {label: '响度', status: Math.abs(integrated - project.loudness.targetLufs) <= 1.5 ? 'pass' : 'fail', detail: `整体 ${integrated} LUFS（目标 ${project.loudness.targetLufs}，原片 -9.4），峰值 ${peak} dBFS`},
    {label: '黑屏', status: black ? 'fail' : 'pass', detail: black ? '检测到 ≥0.3s 黑屏' : '无'},
    {label: '画面冻结', status: freeze ? 'warning' : 'pass', detail: freeze ? '检测到 ≥2s 静止画面，请人工确认是否为慢镜' : '无'},
    {label: '卖点出处', status: project.claims.length ? 'pass' : 'warning', detail: project.claims.length ? project.claims.map((claim) => `${claim.text} ← ${claim.source}`).join('；') : '工程未登记 claims，台词里的数字需人工核对'},
    {label: '字幕与画面', status: 'warning', detail: '自动检查不判断画面内容，请抽帧确认字幕不压主体、标题不压人脸'},
  ];
  const status = checks.some((check) => check.status === 'fail') ? 'failed' : 'complete';
  await writeFile(path.join(outDir, 'report.json'), JSON.stringify({status, output, checks, probe, project}, null, 2));
  await writeFile(path.join(outDir, 'inspection.txt'), inspection.stderr);
  for (const check of checks) log(`${check.status.padEnd(7)} ${check.label}：${check.detail}`);
  log(`${status === 'complete' ? '完成' : '质检未通过'}：${output}`);
  if (status !== 'complete') process.exitCode = 1;
} finally {
  await server.close();
}
