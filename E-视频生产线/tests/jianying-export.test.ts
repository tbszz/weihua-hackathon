import {expect, it} from 'vitest';
import {mkdtemp, mkdir, readFile, access, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {exportJianyingDraft} from '../src/server/jianying';
import {createInitialJob, createDemoStoryboard} from '../src/demo/pipeline';
import {runProcess} from '../src/media/process';

it.skipIf(process.platform !== 'win32')('packages actual media, voice timing, BGM and subtitles into an independent draft', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'weihua-jianying-test-'));
  const id = randomUUID();
  const directory = path.join(root, id);
  await mkdir(directory);
  try {
    const job = createInitialJob();
    const svgAsset = job.assets.find((asset) => asset.image.endsWith('.svg'))!;
    const scenes = [{...createDemoStoryboard(job.topic, job.assets, job.template)[0], assetId: svgAsset.id, seconds: 2, narration: '重器开始工作。'}];
    await runProcess('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.5', path.join(directory, '0.mp3')]);
    await runProcess('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=110:duration=1', path.join(directory, 'music.wav')]);
    const result = await exportJianyingDraft(id, scenes, [svgAsset], root);
    await access(result.zipPath);
    const draft = JSON.parse(await readFile(path.join(result.directory, 'draft_content.json'), 'utf8'));
    expect(draft.materials.videos[0].type).toBe('photo');
    expect(draft.materials.videos[0].path).toMatch(/\.png$/);
    await access(draft.materials.videos[0].path);
    await access(draft.materials.audios[0].path);
    expect(draft.tracks[1].segments[0].target_timerange.duration).toBeLessThan(1_000_000);
    expect(draft.tracks[2].segments).toHaveLength(2);
    expect(await readFile(path.join(result.directory, 'captions.srt'), 'utf8')).toContain('重器开始工作');
    const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
    expect(manifest.verifiedInJianying).toBe(false);
  } finally {await rm(root, {recursive: true, force: true});}
}, 60_000);
