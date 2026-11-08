import {afterEach, describe, expect, it, vi} from 'vitest';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {editWithAgent, editorCapabilities, validateEdit} from '../src/server/editor-agent';
import {createDemoStoryboard, createInitialJob} from '../src/demo/pipeline';

afterEach(() => vi.unstubAllEnvs());

describe('editor agent domain boundary', () => {
  it('persists a conversation and keeps the independent Skill out of storyboard templates', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'weihua-editor-test-'));
    vi.stubEnv('EDITOR_SESSIONS_DIR', directory);
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '');
    const job = createInitialJob();
    const scenes = createDemoStoryboard(job.topic, job.assets, job.template);
    try {
      const first = await editWithAgent({message: '把第 3 段缩短到 6 秒', scenes}, job.assets);
      expect(first.scenes[2].seconds).toBe(6);
      expect(first.scenes[2].narration).toBe(scenes[2].narration);
      const second = await editWithAgent({sessionId: first.sessionId, message: '调用名场面穿越 Skill', scenes: first.scenes}, job.assets);
      expect(second.scenes).toEqual(first.scenes);
      expect(second.reply).toContain('没有启动生成');
      expect(second.runtime).toBe('local-commands');
      const persisted = JSON.parse(await readFile(path.join(directory, first.sessionId, 'session.json'), 'utf8'));
      expect(persisted.history).toHaveLength(4);
    } finally {await rm(directory, {recursive: true, force: true});}
  });

  it('validates submitted edits rather than trusting agent output', () => {
    const job = createInitialJob();
    const scenes = createDemoStoryboard(job.topic, job.assets, job.template);
    scenes[0].assetId = 'invented-asset';
    expect(() => validateEdit(scenes, job.assets)).toThrow('不存在的素材');
    scenes[0].assetId = job.assets[0].id;
    scenes[0].narration = '这台 9999 吨的设备。';
    expect(() => validateEdit(scenes, job.assets)).toThrow('无出处');
  });

  it('does not announce a missing Skill as available', async () => {
    vi.stubEnv('CHUANYUE_SKILL_PATH', path.join(os.tmpdir(), 'missing-weihua-skill'));
    expect((await editorCapabilities()).skills).toEqual([]);
  });
});
