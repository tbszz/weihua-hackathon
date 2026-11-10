import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import path from 'node:path';
import {z} from 'zod';
import {probeMedia} from '../media/ffprobe';
import {runProcess} from '../media/process';
import {createInitialJob, validateStoryboard, type DemoAsset, type StoryboardScene, type RenderResult} from '../demo/pipeline';
import {renderFilm} from './render';
import {exportJianyingDraft} from './jianying';
import {createTuziClientFromEnv, TuziApiError, type TuziVideoRequest} from './tuzi';
import {editWithAgent, editorCapabilities, chatRequestSchema} from './editor-agent';
import {createAigcPlan, getSkillCatalog} from './skills';
import {createMagpieClientFromEnv, MagpieApiError, type MagpieVideoTask} from './magpie';

const app = Fastify({logger: true, bodyLimit: 2 * 1024 * 1024});
const root = process.cwd();
const port = Number(process.env.VIDEO_LINE_PORT ?? 8705);
const jobsRoot = path.join(root, 'data/jobs');
const mediaRoot = path.join(root, 'data/assets/raw');
const aigcTasksRoot = path.join(root, 'data/aigc/tasks');
await mkdir(jobsRoot, {recursive: true});
await mkdir(mediaRoot, {recursive: true});
await mkdir(aigcTasksRoot, {recursive: true});
await app.register(multipart, {limits: {fileSize: 200 * 1024 * 1024, files: 1}});
await app.register(staticFiles, {root: path.join(root, 'public/demo'), prefix: '/demo/'});
await app.register(staticFiles, {root: jobsRoot, prefix: '/outputs/', decorateReply: false});
await app.register(staticFiles, {root: mediaRoot, prefix: '/media/', decorateReply: false});
const sceneSchema = z.object({id: z.string().max(30), time: z.string().max(40), seconds: z.number().min(2).max(30), title: z.string().min(1).max(50), narration: z.string().min(1).max(150), overlay: z.string().max(150), transition: z.string().max(30), assetId: z.string().max(100), role: z.string().max(100), claim: z.object({value: z.string(), label: z.string(), source: z.string()}).optional()});
const renderRequest = z.object({scenes: z.array(sceneSchema).min(1).max(12)});
const exportRequest = z.object({id: z.string().regex(/^[\da-f-]{36}$/)});
const aigcPlanRequest = z.object({topic: z.string().trim().min(2).max(120), durationSeconds: z.number().int().min(4).max(30).default(15), aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'), claims: z.array(z.object({value: z.string().trim().min(1).max(80), source: z.string().url()})).max(12).default([])});
const aigcVideoRequest = z.object({prompt: z.string().trim().min(1).max(10_000), seconds: z.number().int().min(4).max(30).optional(), size: z.string().regex(/^(1280x720|720x1280|1024x1024)$/).optional(), model: z.string().min(1).max(100).optional(), watermark: z.boolean().default(true), planId: z.string().max(100).optional()});
const tuziVideoRequest = z.object({
  model: z.string().min(1).max(100).optional(),
  prompt: z.string().min(1).max(10_000),
  seconds: z.string().regex(/^(4|8|10|12|15|25)$/).optional(),
  size: z.string().regex(/^(1280x720|720x1280|1792x1024|1024x1792)$/).optional(),
  input_reference: z.union([z.string().url(), z.array(z.string().url()).min(1).max(10)]).optional(),
  watermark: z.boolean().optional(),
});
const catalog = new Map<string, DemoAsset>(createInitialJob().assets.map((asset) => [asset.id, asset]));
const extraAssetsFile = path.join(root, 'data/assets/catalog.json');
for (const asset of JSON.parse(await readFile(extraAssetsFile, 'utf8').catch(() => '[]')) as DemoAsset[]) catalog.set(asset.id, asset);
let busy = false;
app.get('/api/assets', () => [...catalog.values()]);
app.get('/api/health', () => ({ok: true, planner: '本地规则模板（未接大模型）', tts: process.env.MINIMAX_VOICE_ID ?? 'alinVoice01', busy}));
app.get('/api/skills', async () => ({...(await editorCapabilities()), aigcSkills: getSkillCatalog()}));
app.get('/api/aigc/skills', () => ({skills: getSkillCatalog()}));
app.get('/api/aigc/health', async (_request, reply) => {
  try {return await createMagpieClientFromEnv().checkConnection();}
  catch (error) {if (error instanceof MagpieApiError) return reply.code(error.status).send({ok: false, provider: 'magpie', message: error.message}); return reply.code(503).send({ok: false, provider: 'magpie', message: (error as Error).message});}
});
app.post('/api/aigc/plan', async (request, reply) => {
  const parsed = aigcPlanRequest.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({message: 'AIGC 计划参数不正确'});
  try {return {plan: createAigcPlan(parsed.data)};}
  catch (error) {return reply.code(400).send({message: (error as Error).message});}
});
app.post('/api/aigc/videos', async (request, reply) => {
  const parsed = aigcVideoRequest.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({message: 'AIGC 视频参数不正确'});
  try {
    const provider = createMagpieClientFromEnv();
    const task = await provider.createVideo(parsed.data);
    const record = {task, request: parsed.data, createdAt: new Date().toISOString()};
    await writeFile(path.join(aigcTasksRoot, `${task.id}.json`), JSON.stringify(record, null, 2));
    return reply.code(202).send(record);
  } catch (error) {
    if (error instanceof MagpieApiError) return reply.code(error.status).send({message: error.message});
    return reply.code(503).send({message: (error as Error).message});
  }
});
app.get('/api/aigc/videos/:id', async (request, reply) => {
  const id = (request.params as {id: string}).id;
  const file = path.join(aigcTasksRoot, `${id}.json`);
  const stored = JSON.parse(await readFile(file, 'utf8').catch(() => 'null')) as {task: MagpieVideoTask; request: unknown; createdAt: string} | null;
  if (!stored) return reply.code(404).send({message: 'AIGC 任务不存在'});
  if (stored.task.status === 'completed' || stored.task.status === 'failed') return stored;
  try {
    const task = await createMagpieClientFromEnv().getVideo(id);
    const updated = {...stored, task};
    await writeFile(file, JSON.stringify(updated, null, 2));
    return updated;
  } catch (error) {
    if (error instanceof MagpieApiError) return reply.code(error.status).send({message: error.message});
    return reply.code(503).send({message: (error as Error).message});
  }
});
app.post('/api/editor/chat', async (request, reply) => {
  const parsed = chatRequestSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({message: '剪辑会话参数不正确'});
  try {return await editWithAgent(parsed.data, [...catalog.values()]);}
  catch (error) {return reply.code(422).send({message: (error as Error).message.slice(0, 500)});}
});
app.get('/api/tuzi/health', async (_request, reply) => {
  try {
    await createTuziClientFromEnv().checkConnection();
    return {
      ok: true,
      provider: 'tuziapi',
      model: process.env.TUZI_VIDEO_MODEL ?? 'MiniMax-H3',
      imageProvider: 'codex-built-in',
      mainVoiceConfigured: Boolean(process.env.MINIMAX_API_KEY && process.env.MINIMAX_VOICE_ID),
      baseUrl: process.env.TUZI_API_BASE_URL ?? 'https://api.tu-zi.com',
    };
  } catch (error) {
    if (error instanceof TuziApiError) return reply.code(error.status === 401 || error.status === 403 ? 502 : 503).send({ok: false, message: error.message});
    return reply.code(503).send({ok: false, message: (error as Error).message});
  }
});
app.post('/api/tuzi/videos', async (request, reply) => {
  const parsed = tuziVideoRequest.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({message: '兔子视频参数不正确'});
  try {
    const task = await createTuziClientFromEnv().createVideo({
      ...parsed.data,
      model: parsed.data.model ?? process.env.TUZI_VIDEO_MODEL ?? 'MiniMax-H3',
    } as TuziVideoRequest);
    return reply.code(202).send(task);
  } catch (error) {
    if (error instanceof TuziApiError) return reply.code(error.status).send({message: error.message});
    return reply.code(503).send({message: (error as Error).message});
  }
});
app.get('/api/tuzi/videos/:id', async (request, reply) => {
  try {
    return await createTuziClientFromEnv().getVideo((request.params as {id: string}).id);
  } catch (error) {
    if (error instanceof TuziApiError) return reply.code(error.status).send({message: error.message});
    return reply.code(503).send({message: (error as Error).message});
  }
});
app.post('/api/assets', async (request, reply) => {
  if (busy) return reply.code(409).send({message: '正在渲染，请完成后再上传'});
  const file = await request.file();
  if (!file) return reply.code(400).send({message: '请选择图片或视频'});
  const extension = path.extname(file.filename).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.mp4', '.mov', '.webm'].includes(extension)) return reply.code(400).send({message: '仅支持 JPG、PNG、MP4、MOV、WebM'});
  const buffer = await file.toBuffer();
  const id = createHash('sha256').update(buffer).digest('hex');
  if (catalog.has(id)) return catalog.get(id);
  const filename = `${id}${extension}`;
  const destination = path.join(mediaRoot, filename);
  await writeFile(destination, buffer);
  const metadata = await probeMedia(destination);
  if (metadata.kind === 'audio') return reply.code(400).send({message: '请选择带画面的素材'});
  if (metadata.kind === 'video' && metadata.durationSeconds < 2) return reply.code(400).send({message: '视频至少需要 2 秒'});
  const normalized = `${id}-normalized.mp4`;
  if (metadata.kind === 'video') await runProcess('ffmpeg', ['-y', '-i', destination, '-t', '30', '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2', '-an', '-c:v', 'libx264', '-preset', 'fast', path.join(mediaRoot, normalized)], {timeoutMs: 180000});
  const label = file.filename;
  const role = /提升|lift/.test(label) ? 'girder_lift' : /控制|control/.test(label) ? 'control_room' : /结构|detail/.test(label) ? 'structure_detail' : /工人|people/.test(label) ? 'people_work' : 'aerial_wide';
  const asset: DemoAsset = {id, name: file.filename.slice(0, 100), role, label: '本地上传 · 文件名规则分类', color: '#253b44', image: `/media/${metadata.kind === 'video' ? normalized : filename}`, kind: metadata.kind, durationSeconds: Math.min(metadata.durationSeconds, 30)};
  catalog.set(id, asset);
  await writeFile(extraAssetsFile, JSON.stringify([...catalog.values()].filter((item) => item.id.length === 64), null, 2));
  return asset;
});
app.post('/api/render', async (request, reply) => {
  if (busy) return reply.code(409).send({message: '已有渲染任务，请等待完成'});
  const parsed = renderRequest.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({message: '故事板格式不正确'});
  const scenes = parsed.data.scenes as StoryboardScene[];
  try {validateStoryboard(scenes);} catch (error) {return reply.code(400).send({message: (error as Error).message});}
  const assets: DemoAsset[] = [];
  for (const scene of scenes) {
    const asset = catalog.get(scene.assetId);
    if (!asset) return reply.code(400).send({message: '故事板素材不存在'});
    if (asset.kind === 'video' && (asset.durationSeconds ?? 0) < scene.seconds) return reply.code(400).send({message: `${asset.name} 短于镜头时长，请换镜头或缩短时长`});
    assets.push(asset);
  }
  const id = randomUUID();
  const directory = path.join(jobsRoot, id);
  await mkdir(directory);
  let state: {id: string; status: string; progress: number; stage: string; result?: RenderResult; error?: string} = {id, status: 'running', progress: 0, stage: '准备'};
  const persist = () => writeFile(path.join(directory, 'state.json'), JSON.stringify(state));
  await persist();
  busy = true;
  void (async () => {
    try {
      const result = await renderFilm(id, scenes, assets, `http://127.0.0.1:${port}`, (progress, stage) => {state = {...state, progress, stage};});
      state = {...state, status: result.status === 'complete' ? 'complete' : 'failed', progress: 100, result};
    } catch (error) {state = {...state, status: 'failed', error: (error as Error).message.slice(0, 1500)};}
    finally {busy = false; await persist();}
  })();
  runningStates.set(id, () => state);
  return reply.code(202).send({id});
});
app.post('/api/export/jianying', async (request, reply) => {
  const parsed = exportRequest.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({message: '剪映导出参数不正确'});
  const {id} = parsed.data;
  const state = JSON.parse(await readFile(path.join(jobsRoot, id, 'state.json'), 'utf8').catch(() => 'null')) as {status?: string; result?: RenderResult} | null;
  if (!state || state.status !== 'complete') return reply.code(409).send({message: '请先完成渲染，再导出剪映草稿'});
  try {
    const report = JSON.parse(await readFile(path.join(jobsRoot, id, 'report.json'), 'utf8')) as {scenes: StoryboardScene[]; assets: DemoAsset[]};
    const scenes = report.scenes;
    const assets = [...new Map(report.assets.map((asset) => [asset.id, asset])).values()];
    validateStoryboard(scenes);
    const exported = await exportJianyingDraft(id, scenes as StoryboardScene[], assets, jobsRoot);
    return {downloadUrl: `/outputs/${id}/jianying-draft.zip`, manifestUrl: `/outputs/${id}/jianying-draft/manifest.json`, directory: exported.directory};
  } catch (error) {
    return reply.code(500).send({message: `剪映草稿生成失败：${(error as Error).message.slice(0, 500)}`});
  }
});
const runningStates = new Map<string, () => unknown>();
app.get('/api/render/:id', async (request, reply) => {
  const {id} = request.params as {id: string};
  if (!/^[\da-f-]{36}$/.test(id)) return reply.code(404).send({message: '任务不存在'});
  if (runningStates.has(id)) return runningStates.get(id)!();
  const state = JSON.parse(await readFile(path.join(jobsRoot, id, 'state.json'), 'utf8').catch(() => 'null'));
  if (!state) return reply.code(404).send({message: '任务不存在'});
  if (state.status === 'running') return {...state, status: 'failed', error: '上次服务已停止，请重新渲染'};
  return state;
});
await app.listen({port, host: '127.0.0.1'});
