export class ProviderError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

export function createTripo({ apiKey, fetcher = fetch, model = 'v3.1-20260211' }) {
  async function request(path, options = {}, version = 'v3') {
    if (!apiKey) throw new ProviderError('请先在服务端配置 TRIPO_API_KEY。', 503);
    let response;
    try {
      response = await fetcher(`https://openapi.tripo3d.ai/${version}${path}`, {
        ...options,
        headers: { Authorization: `Bearer ${apiKey}`, ...options.headers },
        redirect: 'error', signal: AbortSignal.timeout(45000),
      });
    } catch { throw new ProviderError('连接 Tripo 超时或失败，请稍后重试。', 503); }
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || Number(body.code) !== 0) {
      const messages = { 401: 'Tripo 密钥无效或已失效。', 403: 'Tripo 账户没有此操作权限。', 402: 'Tripo 额度不足，请在官方平台充值。', 429: 'Tripo 请求过于频繁，请稍后重试。' };
      throw new ProviderError(messages[response.status] || `Tripo 未完成请求（${response.status}）。请检查输入或稍后重试。`, response.status === 402 ? 402 : 502);
    }
    return body.data;
  }

  return {
    async balance() {
      const data = await request('/account/balance');
      return { ready: Number(data?.balance) > 0, balance: data?.balance ?? null };
    },
    async create(input) {
      const faces = Number(input.faceLimit ?? 10000);
      if (!Number.isInteger(faces) || faces < 500 || faces > 200000) throw new ProviderError('面数须为 500–200000 的整数。', 400);
      if (input.mode === 'image-url') {
        const url=new URL(input.imageUrl);
        if(url.protocol!=='https:' || url.hostname!=='img.cranewh.com') throw new ProviderError('请选择官方参考图。',400);
        const data=await request('/generation/image-to-model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:input.imageUrl,model,face_limit:faces,geometry_quality:'detailed',texture:true,pbr:true,texture_quality:'detailed',auto_size:false})});
        if(!data?.task_id)throw new ProviderError('Tripo 未返回任务编号。');
        return {id:data.task_id,version:'v3'};
      }
      if (!['image', 'text'].includes(input.mode)) throw new ProviderError('请选择图片或文字生成。', 400);
      if (input.mode === 'text') {
        const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
        if (!prompt || prompt.length > 1024) throw new ProviderError('请填写 1–1024 字的模型描述。', 400);
        const data = await request('/generation/text-to-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, model, face_limit: faces, texture: true, pbr: true }) });
        if (!data?.task_id) throw new ProviderError('Tripo 未返回任务编号。');
        return { id: data.task_id, version: 'v3' };
      }
      const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.image ?? '');
      if (!match) throw new ProviderError('请上传 PNG 或 JPEG 图片。', 400);
      const bytes = Buffer.from(match[2], 'base64');
      if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new ProviderError('图片大小须小于 20 MB。', 400);
      const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if ((match[1] === 'png' && !png) || (match[1] === 'jpeg' && !jpeg)) throw new ProviderError('图片内容与格式不符，请重新导出图片。', 400);
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: `image/${match[1]}` }), `reference.${match[1]}`);
      const uploaded = await request('/files', { method: 'POST', body: form });
      const token = uploaded?.file_token || uploaded?.token;
      if (!token) throw new ProviderError('Tripo 图片上传失败，未返回文件令牌。');
      const data = await request('/generation/image-to-model', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: token, model, face_limit: faces, texture: true, pbr: true, texture_quality: 'standard', geometry_quality: 'standard', auto_size: true }) });
      if (!(data?.task_id || data?.id)) throw new ProviderError('Tripo 未返回任务编号。');
      return { id: data.task_id || data.id, version: 'v3' };
    },
    async status(id, version) {
      const data = await request(version === 'v2' ? `/openapi/task/${encodeURIComponent(id)}` : `/tasks/${encodeURIComponent(id)}`, {}, version);
      const raw = String(data?.status ?? '').toLowerCase();
      const status = ({ success: 'succeeded', completed: 'succeeded', running: 'processing', in_progress: 'processing', pending: 'queued', cancelled: 'canceled', expired: 'failed' })[raw] || raw;
      if (!['queued','processing','succeeded','failed','canceled'].includes(status)) throw new ProviderError('Tripo 返回了未知任务状态。');
      const output = data.output || {};
      const modelUrl = output.model_url || output.pbr_model || output.model || null;
      return { status, progress: Math.max(0, Math.min(100, Number(data.progress) || (status === 'succeeded' ? 100 : 0))), modelUrl: typeof modelUrl === 'string' ? modelUrl : null, previewUrl: output.rendered_image_url || output.preview_url || output.rendered_image || null, error: status === 'failed' ? '模型生成失败。请调整参考图或描述后重新生成。' : null };
    },
  };
}
