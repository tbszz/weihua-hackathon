import path from 'node:path';
import {mkdir, writeFile, readFile, copyFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {runProcess} from '../media/process';
import {probeMedia} from '../media/ffprobe';
import type {DemoAsset, StoryboardScene} from '../demo/pipeline';

export type JianyingExport = {zipPath: string; directory: string; manifestPath: string};

const micros = (seconds: number) => Math.round(seconds * 1_000_000);

/** Build a conservative Jianying draft shape from the canonical storyboard. */
export function createJianyingDraft(scenes: StoryboardScene[], assets: DemoAsset[], jobDirectory: string) {
  const materials = assets.map((asset) => {
    const source = asset.image.startsWith('/demo/')
      ? path.resolve(process.cwd(), 'public/demo', asset.image.slice('/demo/'.length))
      : asset.image.startsWith('/media/')
        ? path.resolve(process.cwd(), 'data/assets/raw', path.basename(asset.image))
        : asset.image;
    return {id: asset.id, type: asset.kind === 'video' ? 'video' : 'photo', material_name: asset.name, path: source,
      duration: micros(asset.durationSeconds || 10800), width: 1920, height: 1080, has_audio: false,
      local_material_id: '', crop_ratio: 'free', crop_scale: 1, source_platform: 0,
      crop: {upper_left_x: 0, upper_left_y: 0, upper_right_x: 1, upper_right_y: 0, lower_left_x: 0, lower_left_y: 1, lower_right_x: 1, lower_right_y: 1}};
  });
  const segments: ReturnType<typeof nativeSegment>[] = [];
  let cursor = 0;
  scenes.forEach((scene, index) => {
    segments.push({...nativeSegment(scene.assetId, cursor, scene.seconds), volume: 0});
    segments.push(nativeSegment(`voice-${index}`, cursor, scene.seconds));
    cursor += scene.seconds;
  });
  return {
    version: 360000, id: randomUUID(), name: '卫华视频剪辑', fps: 30, source: 'default', draft_type: 'video', new_version: '145.0.0',
    canvas_config: {width: 1920, height: 1080, ratio: "16:9"},
    duration: micros(cursor),
    materials: {videos: materials, audios: scenes.map((scene, index) => ({id: `voice-${index}`, name: `voice-${index}.mp3`, type: 'music', duration: micros(scene.seconds), path: path.join(jobDirectory, `${index}.mp3`)})), texts: [], transitions: [], effects: [], speeds: []},
    tracks: [{id: randomUUID(), type: 'video', attribute: 0, flag: 0, segments: segments.filter((_, index) => index % 2 === 0)}, {id: randomUUID(), type: 'audio', attribute: 0, flag: 0, segments: segments.filter((_, index) => index % 2 === 1)}],
    extra_info: '',
  };
}

function nativeSegment(materialId: string, start: number, seconds: number) {
  return {id: randomUUID(), material_id: materialId, target_timerange: {start: micros(start), duration: micros(seconds)},
    source_timerange: {start: 0, duration: micros(seconds)}, speed: 1, volume: 1, visible: true, reverse: false,
    render_index: 0, track_render_index: 0, extra_material_refs: [], common_keyframes: [], keyframe_refs: [],
    source: 'segmentsourcenormal', uniform_scale: {on: true, value: 1},
    clip: {alpha: 1, rotation: 0, scale: {x: 1, y: 1}, transform: {x: 0, y: 0}, flip: {horizontal: false, vertical: false}}};
}

export async function exportJianyingDraft(id: string, scenes: StoryboardScene[], assets: DemoAsset[], jobsRoot: string): Promise<JianyingExport> {
  const jobDirectory = path.join(jobsRoot, id);
  const directory = path.resolve(jobDirectory, 'jianying-draft');
  await mkdir(directory, {recursive: true});
  const mediaDirectory = path.join(directory, 'media');
  await mkdir(mediaDirectory, {recursive: true});
  const packagedAssets: DemoAsset[] = [];
  for (const [index, asset] of assets.entries()) {
    const original = asset.image.startsWith('/demo/') ? path.resolve('public/demo', asset.image.slice(6))
      : asset.image.startsWith('/media/') ? path.resolve('data/assets/raw', path.basename(asset.image)) : asset.image;
    const svg = path.extname(original).toLowerCase() === '.svg';
    const destination = path.join(mediaDirectory, `${index}${svg ? '.png' : path.extname(original)}`);
    if (svg) {
      const {Resvg} = await import('@resvg/resvg-js');
      await writeFile(destination, new Resvg(await readFile(original), {fitTo: {mode: 'width', value: 1920}}).render().asPng());
    } else {await copyFile(original, destination);}
    packagedAssets.push({...asset, image: destination});
  }
  const draft = createJianyingDraft(scenes, packagedAssets, directory);
  for (const [index, scene] of scenes.entries()) {
    const source = path.join(jobDirectory, `${index}.mp3`);
    const voice = await probeMedia(source);
    await copyFile(source, path.join(directory, `${index}.mp3`));
    draft.materials.audios[index].duration = micros(voice.durationSeconds);
    draft.tracks[1].segments[index].source_timerange.duration = micros(Math.min(voice.durationSeconds, scene.seconds));
    draft.tracks[1].segments[index].target_timerange.duration = micros(Math.min(voice.durationSeconds, scene.seconds));
  }
  const musicFile = path.join(jobDirectory, 'music.wav');
  const musicDuration = (await probeMedia(musicFile)).durationSeconds;
  await copyFile(musicFile, path.join(directory, 'music.wav'));
  draft.materials.audios.push({id: 'bgm', type: 'music', name: 'music.wav', duration: micros(musicDuration), path: path.join(directory, 'music.wav')});
  const musicSegments = [];
  for (let offset = 0; offset < draft.duration / 1e6; offset += musicDuration) musicSegments.push({...nativeSegment('bgm', offset, Math.min(musicDuration, draft.duration / 1e6 - offset)), volume: 0.09});
  draft.tracks.push({id: randomUUID(), type: 'audio', attribute: 0, flag: 0, segments: musicSegments});
  const now = Date.now() * 1000;
  const meta = {draft_id: draft.id, draft_name: draft.name, draft_fold_path: directory, draft_root_path: path.dirname(directory), draft_new_version: draft.new_version, draft_materials: [], draft_materials_copied_info: [], draft_is_invisible: false, tm_duration: draft.duration, tm_draft_create: now, tm_draft_modified: now};
  const manifest = {format: 'jianying-draft-package', version: 1, verifiedInJianying: false, originalDirectory: directory, scenes, assets: packagedAssets,
    note: '包含可编辑镜头、配音、循环配乐与独立字幕 SRT。Remotion 包装效果未转换；剪映实际打开仍待验证。', files: ['draft_content.json', 'draft_meta_info.json', 'captions.srt', 'manifest.json', 'README.md', 'relink.ps1', 'media/']};
  await writeFile(path.join(directory, 'draft_content.json'), JSON.stringify(draft, null, 2));
  await writeFile(path.join(directory, 'draft_meta_info.json'), JSON.stringify(meta, null, 2));
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
  let cursor = 0;
  const srt = scenes.map((scene, index) => {const start = cursor; cursor += scene.seconds; return `${index + 1}\n${srtTime(start)} --> ${srtTime(cursor)}\n${scene.narration}\n`;}).join('\n');
  await writeFile(path.join(directory, 'captions.srt'), srt);
  await writeFile(path.join(directory, 'README.md'), '# 卫华对话剪辑工程\n\n本包包含媒体、可编辑视频与音频轨道、captions.srt 和源镜头方案。剪映实际打开仍待验证；Remotion 标题、HUD 和动画未转换。\n\n移动或解压到新目录后，先在该目录运行 relink.ps1 更新媒体路径；使用剪映能读取普通 JSON 草稿的版本打开 draft_content.json 所在草稿目录，并导入 captions.srt。部分新版剪映使用不同的草稿格式。\n');
  await writeFile(path.join(directory, 'relink.ps1'), `$ErrorActionPreference = 'Stop'\n$draft = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'draft_content.json') -Raw -Encoding UTF8 | ConvertFrom-Json\nforeach ($kind in @('videos', 'audios')) { foreach ($item in $draft.materials.$kind) { $folder = if ($kind -eq 'videos') { 'media' } else { '' }; $item.path = Join-Path (Join-Path $PSScriptRoot $folder) ([IO.Path]::GetFileName($item.path)) } }\n$draft | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'draft_content.json') -Encoding UTF8\n`);
  const zipPath = path.join(jobDirectory, 'jianying-draft.zip');
  const escapedDirectory = directory.replace(/'/g, "''");
  const escapedZip = zipPath.replace(/'/g, "''");
  await runProcess('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Compress-Archive -Path '${escapedDirectory}\\*' -DestinationPath '${escapedZip}' -Force`], {timeoutMs: 120000});
  return {zipPath, directory, manifestPath: path.join(directory, 'manifest.json')};
}

function srtTime(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
