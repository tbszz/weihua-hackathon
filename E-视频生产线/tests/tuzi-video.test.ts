import {describe, expect, it, vi} from 'vitest';
import {TuziVideoClient, TuziApiError, type TuziFetch} from '../src/server/tuzi';

describe('TuziVideoClient', () => {
  it('submits an OpenAI-compatible video task with bearer auth', async () => {
    const fetcher: TuziFetch = vi.fn(async (input, init) => {
      expect(input).toBe('https://api.tu-zi.com/v1/videos');
      expect(init?.method).toBe('POST');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
      expect(JSON.parse(String(init?.body))).toEqual({model: 'sora-2', prompt: 'a crane at sunrise', seconds: '8', size: '1280x720'});
      return new Response(JSON.stringify({id: 'task-123', status: 'queued'}), {status: 202});
    });
    const client = new TuziVideoClient({apiKey: 'secret', fetcher});

    await expect(client.createVideo({model: 'sora-2', prompt: 'a crane at sunrise', seconds: '8', size: '1280x720'})).resolves.toEqual({id: 'task-123', status: 'queued'});
  });

  it('rejects an HTTP error without exposing the key', async () => {
    const fetcher: TuziFetch = vi.fn(async () => new Response(JSON.stringify({error: {message: 'invalid key'}}), {status: 401}));
    const client = new TuziVideoClient({apiKey: 'secret', fetcher});
    await expect(client.getVideo('task-123')).rejects.toBeInstanceOf(TuziApiError);
    await expect(client.getVideo('task-123')).rejects.toThrow('兔子 API 请求失败（401）');
  });
});
