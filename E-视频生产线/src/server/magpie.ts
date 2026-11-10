import {randomUUID} from 'node:crypto';

export type MagpieVideoRequest = {prompt: string; seconds?: number; size?: string; model?: string; watermark?: boolean};
export type MagpieVideoTask = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  provider: 'magpie' | 'mock';
  videoUrl?: string;
  error?: string;
};

export type MagpieClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  createPath?: string;
  fetcher?: typeof fetch;
};

export class MagpieApiError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = 'MagpieApiError';
  }
}

export class MagpieVideoClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly createPath: string;
  private readonly fetcher: typeof fetch;

  constructor(options: MagpieClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
    this.apiKey = options.apiKey ?? '';
    this.model = options.model ?? 'seedance-2-5';
    this.createPath = options.createPath ?? '/videos';
    this.fetcher = options.fetcher ?? fetch;
  }

  get configured() { return Boolean(this.baseUrl); }

  async createVideo(input: MagpieVideoRequest): Promise<MagpieVideoTask> {
    if (!input.prompt?.trim()) throw new MagpieApiError('视频提示词不能为空', 400);
    if (!this.configured) return {id: `mock-${randomUUID()}`, status: 'completed', provider: 'mock', videoUrl: '/demo/official-wide.jpg'};
    const body = {model: input.model ?? this.model, prompt: input.prompt, seconds: input.seconds, size: input.size, watermark: input.watermark ?? true};
    const response = await this.fetcher(`${this.baseUrl}${this.createPath}`, {method: 'POST', headers: {'content-type': 'application/json', ...this.authHeaders()}, body: JSON.stringify(body)});
    return this.parseResponse(response, true);
  }

  async getVideo(id: string): Promise<MagpieVideoTask> {
    if (!id) throw new MagpieApiError('视频任务 ID 不能为空', 400);
    if (!this.configured || id.startsWith('mock-')) return {id, status: 'completed', provider: 'mock', videoUrl: '/demo/official-wide.jpg'};
    const response = await this.fetcher(`${this.baseUrl}${this.createPath}/${encodeURIComponent(id)}`, {headers: this.authHeaders()});
    return this.parseResponse(response, false);
  }

  async checkConnection(): Promise<{ok: true; provider: 'magpie' | 'mock'; baseUrl?: string}> {
    if (!this.configured) return {ok: true, provider: 'mock'};
    const headers = {headers: this.authHeaders()};
    const health = await this.fetcher(`${this.baseUrl}/health`, headers);
    if (health.ok) return {ok: true, provider: 'magpie', baseUrl: this.baseUrl};
    const models = await this.fetcher(`${this.baseUrl}/models`, headers);
    if (models.ok) return {ok: true, provider: 'magpie', baseUrl: this.baseUrl};
    throw new MagpieApiError(`Magpie 连接失败（HTTP ${models.status}）`, models.status);
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey ? {Authorization: `Bearer ${this.apiKey}`} : {};
  }

  private async parseResponse(response: Response, creating: boolean): Promise<MagpieVideoTask> {
    const raw = await response.text();
    let body: any = {};
    try {body = raw ? JSON.parse(raw) : {};} catch {throw new MagpieApiError('Magpie 返回了无法解析的 JSON');}
    if (!response.ok) {
      const message = typeof body.error === 'string' ? body.error : typeof body.message === 'string' ? body.message : `Magpie 请求失败（HTTP ${response.status}）`;
      throw new MagpieApiError(message, response.status);
    }
    const id = String(body.id ?? body.task_id ?? body.data?.id ?? '');
    if (!id) throw new MagpieApiError(creating ? 'Magpie 创建任务未返回 ID' : 'Magpie 查询未返回任务 ID');
    const rawStatus = String(body.status ?? body.data?.status ?? body.state ?? 'queued').toLowerCase();
    const status = rawStatus === 'succeeded' || rawStatus === 'success' || rawStatus === 'completed' ? 'completed' : rawStatus === 'failed' || rawStatus === 'error' ? 'failed' : rawStatus === 'running' || rawStatus === 'processing' ? 'running' : 'queued';
    const videoUrl = body.video_url ?? body.videoUrl ?? body.output?.video_url ?? body.output?.videoUrl ?? body.data?.video_url;
    return {id, status, provider: 'magpie', ...(videoUrl ? {videoUrl: String(videoUrl)} : {}), ...(status === 'failed' ? {error: String(body.error ?? body.message ?? '视频生成失败')} : {})};
  }
}

export function createMagpieClientFromEnv(env: NodeJS.ProcessEnv = process.env): MagpieVideoClient {
  return new MagpieVideoClient({
    baseUrl: env.MAGPIE_BASE_URL,
    apiKey: env.MAGPIE_API_KEY,
    model: env.MAGPIE_VIDEO_MODEL,
    createPath: env.MAGPIE_VIDEO_CREATE_PATH,
  });
}

