import {expect, it} from 'vitest';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {runProcess} from '../src/media/process';
import {createDemoStoryboard, createInitialJob} from '../src/demo/pipeline';

it.skipIf(!process.env.VIDEO_SMOKE)('uploads and cuts a moving test video with real audio and captions', async () => {
  const fixture = path.resolve('demo/upload-fixture.mp4');
  await runProcess('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30:duration=8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture]);
  const bytes = await readFile(fixture);
  const form = new FormData();
  form.append('file', new Blob([bytes], {type: 'video/mp4'}), 'aerial-运动测试.mp4');
  const response = await fetch('http://127.0.0.1:8705/api/assets', {method: 'POST', body: form});
  expect(response.status).toBe(200);
  const asset = await response.json();
  expect(asset.kind).toBe('video');
  expect(asset.durationSeconds).toBe(8);
  const job = createInitialJob();
  const scenes = createDemoStoryboard(job.topic, job.assets, job.template).slice(0, 2);
  scenes[0].assetId = asset.id;
  const accepted = await fetch('http://127.0.0.1:8705/api/render', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({scenes})});
  expect(accepted.status).toBe(202);
  const {id} = await accepted.json();
  for (;;) {
    const state = await fetch(`http://127.0.0.1:8705/api/render/${id}`).then((poll) => poll.json());
    if (state.status !== 'running') {
      expect(state.error).toBeUndefined();
      expect(state.status).toBe('complete');
      expect(state.result.sceneCount).toBe(2);
      expect(state.result.durationSeconds).toBeCloseTo(10, 0);
      console.log(`video upload render: ${id}`);
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}, 300000);
