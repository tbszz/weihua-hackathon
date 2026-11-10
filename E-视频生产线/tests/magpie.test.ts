import {afterEach, describe, expect, it, vi} from 'vitest';
import {MagpieVideoClient, createMagpieClientFromEnv} from '../src/server/magpie';

afterEach(() => vi.unstubAllEnvs());

describe('Magpie video provider', () => {
  it('creates a deterministic local task when no proxy credentials exist', async () => {
    const client = createMagpieClientFromEnv({MAGPIE_BASE_URL: '', MAGPIE_API_KEY: ''});
    const task = await client.createVideo({prompt: 'industrial crane, AI 生成示意', seconds: 4, size: '1280x720'});
    expect(task.provider).toBe('mock');
    expect(task.status).toBe('completed');
    expect(task.videoUrl).toContain('/demo/');
  });

  it('uses the configured reverse proxy without leaking the API key', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({id: 'mag-1', status: 'queued'}), {status: 200, headers: {'content-type': 'application/json'}}));
    const client = new MagpieVideoClient({baseUrl: 'https://magpie.example/v1/', apiKey: 'secret-key', fetcher});
    const task = await client.createVideo({prompt: 'crane, AI 生成示意', seconds: 8, size: '1280x720'});
    expect(task).toMatchObject({id: 'mag-1', status: 'queued', provider: 'magpie'});
    expect(fetcher).toHaveBeenCalledWith('https://magpie.example/v1/videos', expect.objectContaining({method: 'POST', headers: expect.objectContaining({Authorization: 'Bearer secret-key'})}));
    expect(JSON.stringify(task)).not.toContain('secret-key');
  });

  it('treats a local Magpie proxy without an API key as configured', () => {
    const client = new MagpieVideoClient({baseUrl: 'http://127.0.0.1:7897/v1', apiKey: ''});
    expect(client.configured).toBe(true);
  });

  it('falls back to the OpenAI-compatible models probe when health is absent', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', {status: 404}))
      .mockResolvedValueOnce(new Response('{}', {status: 200}));
    const client = new MagpieVideoClient({baseUrl: 'http://magpie/v1', fetcher});
    await expect(client.checkConnection()).resolves.toMatchObject({ok: true, provider: 'magpie'});
    expect(fetcher).toHaveBeenNthCalledWith(2, 'http://magpie/v1/models', expect.anything());
  });
});

