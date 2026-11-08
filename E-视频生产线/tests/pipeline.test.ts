import {describe, expect, it} from 'vitest';
import {createDemoStoryboard, createInitialJob, validateStoryboard} from '../src/demo/pipeline';
import {createJianyingDraft} from '../src/server/jianying';
import {applyChatEdit} from '../src/demo/chat-edit';

describe('video line P0 demo pipeline', () => {
  it('creates an industrial storyboard from a topic and demo assets', () => {
    const job = createInitialJob();
    const storyboard = createDemoStoryboard(job.topic, job.assets, 'mega-equipment');

    expect(storyboard).toHaveLength(6);
    expect(storyboard[0].title).toContain('3800');
    expect(storyboard.every((scene) => scene.assetId)).toBe(true);
    expect(storyboard.some((scene) => scene.claim?.value === '166.5 m')).toBe(true);
  });

  it('blocks unsupported facts and accepts both template durations', () => {
    const job = createInitialJob();
    const storyboard = createDemoStoryboard(job.topic, job.assets, 'mega-equipment');
    expect(validateStoryboard(storyboard)).toBe(true);
    expect(storyboard.reduce((sum, item) => sum + item.seconds, 0)).toBe(60);
    const factory = createDemoStoryboard('走进智能工厂', job.assets, 'smart-factory');
    expect(factory.reduce((sum, item) => sum + item.seconds, 0)).toBe(45);
    expect(validateStoryboard(factory)).toBe(true);
    storyboard[0].title = '4000 吨门机';
    expect(() => validateStoryboard(storyboard)).toThrow('无出处');
  });

  it('materializes Jianying timeline tracks from the same storyboard', () => {
    const job = createInitialJob();
    const storyboard = createDemoStoryboard(job.topic, job.assets, 'mega-equipment');
    const draft = createJianyingDraft(storyboard, job.assets, 'E:/jobs/demo');
    expect(draft.duration).toBe(60_000_000);
    expect(draft.tracks).toHaveLength(2);
    expect((draft.tracks[0] as {segments: unknown[]}).segments).toHaveLength(6);
    expect((draft.tracks[1] as {segments: unknown[]}).segments).toHaveLength(6);
  });

  it('applies bounded natural-language timing edits without rewriting copy', () => {
    const job = createInitialJob();
    const storyboard = createDemoStoryboard(job.topic, job.assets, 'mega-equipment');
    const result = applyChatEdit(storyboard, '把第 3 段缩短到 6 秒');
    expect(result.changed).toBe(true);
    expect(result.storyboard[2].seconds).toBe(6);
    expect(result.storyboard[2].narration).toBe(storyboard[2].narration);
    expect(applyChatEdit(storyboard, '把第 3 段改成 1 秒').changed).toBe(false);
  });
});
