export type TuziFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type TuziVideoRequest = {
  model: string;
  prompt: string;
  seconds?: string;
  size?: string;
  input_reference?: string | string[];
  watermark?: boolean;
};

export type TuziVideoTask = {
  id: string;
  status?: string;
  progress?: number;
  video_url?: string;
  error?: unknown;
  [key: string]: unknown;
};

export class TuziApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(`兔子 API 请求失败（${status}）：${message.slice(0, 300)}`);
    this.name = 'TuziApiError';
  }
}

export class TuziVideoClient {
  private readonly baseUrl: string;
  private readonly fetcher: TuziFetch;

  constructor(options: {apiKey: string; baseUrl?: string; fetcher?: TuziFetch}) {
    if (!options.apiKey.trim()) throw new Error('未配置 TUZI_API_KEY');
    this.baseUrl = (options.baseUrl ?? 'https://api.tu-zi.com').replace(/\/$/, '');
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.apiKey = options.apiKey;
  }

  private readonly apiKey: string;

  async createVideo(payload: TuziVideoRequest): Promise<TuziVideoTask> {
    return this.request('/v1/videos', {method: 'POST', body: JSON.stringify(payload)});
  }

  async getVideo(taskId: string): Promise<TuziVideoTask> {
    if (!/^[A-Za-z0-9._:-]{1,200}$/.test(taskId)) throw new Error('兔子任务 ID 格式不正确');
    return this.request(`/v1/videos/${encodeURIComponent(taskId)}`, {method: 'GET'});
  }

  async checkConnection(): Promise<{ok: true}> {
    await this.request('/v1/models', {method: 'GET'});
    return {ok: true};
  }

  private async request(path: string, init: RequestInit): Promise<TuziVideoTask> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', ...(init.headers ?? {})},
    });
    const raw = await response.text();
    let body: Record<string, unknown> = {};
    try { body = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { body = {message: raw}; }
    if (!response.ok) {
      const error = body.error;
      const message = typeof error === 'string' ? error : typeof error === 'object' && error && 'message' in error ? String(error.message) : String(body.message ?? '未知错误');
      throw new TuziApiError(response.status, message);
    }
    const id = String(body.id ?? body.task_id ?? '');
    if (!id && path.endsWith('/videos')) throw new Error('兔子 API 返回中没有任务 ID');
    return {...body, id} as TuziVideoTask;
  }
}

export function createTuziClientFromEnv(env: NodeJS.ProcessEnv = process.env): TuziVideoClient {
  const fileEnv = env.TUZI_API_KEY ? {} : readDotEnv();
  return new TuziVideoClient({apiKey: env.TUZI_API_KEY ?? fileEnv.TUZI_API_KEY ?? '', baseUrl: env.TUZI_API_BASE_URL ?? fileEnv.TUZI_API_BASE_URL});
}
import {readFileSync} from 'node:fs';
import path from 'node:path';


function readDotEnv(): Record<string, string> {
  try {
    const content = readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) return [];
      return [[match[1], match[2].replace(/^(["'])(.*)\1$/, '$2')]];
    }));
  } catch {
    return {};
  }
}
