import {describe, expect, it} from 'vitest';
import {createDemoStoryboard, createInitialJob} from '../src/demo/pipeline';

const base = 'http://127.0.0.1:8705';
describe.skipIf(!process.env.RENDER_SMOKE)('live render API', () => {
  it('uploads, deduplicates, rejects unsupported facts, exports an actual MP4', async () => {
    const job = createInitialJob();
    const buffer = await fetch(`${base}/demo/official-wide.jpg`).then((response) => response.arrayBuffer());
    const upload = async () => {const form = new FormData(); form.append('file', new Blob([buffer], {type: 'image/jpeg'}), '港区-wide.jpg'); return fetch(`${base}/api/assets`, {method: 'POST', body: form}).then((response) => response.json());};
    const asset = await upload();
    expect(asset.id).toMatch(/^[a-f\d]{64}$/);
    expect((await upload()).id).toBe(asset.id);
    const scenes = createDemoStoryboard(job.topic, job.assets, job.template).slice(0, 2);
    const invalid = structuredClone(scenes);
    invalid[0].title = '4000 吨门机';
    const rejected = await fetch(`${base}/api/render`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({scenes: invalid})});
    expect(rejected.status).toBe(400);
    const accepted = await fetch(`${base}/api/render`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({scenes})});
    expect(accepted.status).toBe(202);
    const {id} = await accepted.json();
    for (;;) {
      const state = await fetch(`${base}/api/render/${id}`).then((response) => response.json());
      if (state.status !== 'running') {
        expect(state.error).toBeUndefined();
        expect(state.status).toBe('complete');
        expect(state.result.durationSeconds).toBeCloseTo(10, 0);
        const download = await fetch(`${base}${state.result.outputUrl}`);
        expect(download.headers.get('content-type')).toContain('video/mp4');
        expect((await download.arrayBuffer()).byteLength).toBeGreaterThan(10000);
        expect(state.result.checks.filter((check: {status: string}) => check.status === 'fail')).toHaveLength(0);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }, 300000);
});
