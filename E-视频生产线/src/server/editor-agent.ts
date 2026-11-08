import path from 'node:path';
import os from 'node:os';
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {query, tool, createSdkMcpServer} from '@anthropic-ai/claude-agent-sdk';
import {z} from 'zod';
import {applyChatEdit} from '../demo/chat-edit';
import {validateStoryboard, type StoryboardScene, type DemoAsset} from '../demo/pipeline';

const skillName = '名场面穿越';
const skillDirectory = () => process.env.CHUANYUE_SKILL_PATH ?? path.join(os.homedir(), '.claude/skills', skillName);
const sessionRoot = () => path.resolve(process.env.EDITOR_SESSIONS_DIR ?? 'data/editor-sessions');
export const sceneSchema = z.object({
  id: z.string().min(1).max(30), time: z.string().max(40), seconds: z.number().min(2).max(30),
  title: z.string().min(1).max(50), narration: z.string().min(1).max(150), overlay: z.string().max(150),
  transition: z.string().max(30), assetId: z.string().max(100), role: z.string().max(100),
  claim: z.object({value: z.string(), label: z.string(), source: z.string()}).optional(),
});
export const chatRequestSchema = z.object({
  sessionId: z.string().uuid().optional(), message: z.string().trim().min(1).max(8000),
  scenes: z.array(sceneSchema).min(1).max(12), requestedSkill: z.literal('名场面穿越').optional(),
});
type Turn = {role: 'user' | 'assistant'; content: string};
type Session = {sdkSessionId?: string; history: Turn[]};
const running = new Set<string>();
const configured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export async function editorCapabilities() {
  const skill = await readFile(path.join(skillDirectory(), 'SKILL.md'), 'utf8').catch(() => '');
  return {runtime: configured() ? 'claude-agent-sdk' : 'local-commands',
    skills: skill ? [{name: skillName, description: '独立的穿越短视频制作流程', source: path.join(skillDirectory(), 'SKILL.md')}] : [],
    chatcutConnected: Boolean(process.env.CHATCUT_MCP_URL)};
}

export function validateEdit(scenes: StoryboardScene[], assets: DemoAsset[]) {
  validateStoryboard(scenes);
  if (new Set(scenes.map((scene) => scene.id)).size !== scenes.length) throw new Error('镜头 ID 必须唯一');
  for (const scene of scenes) {
    const asset = assets.find((item) => item.id === scene.assetId);
    if (!asset) throw new Error(`镜头 ${scene.id} 使用了不存在的素材`);
    if (asset.kind === 'video' && (asset.durationSeconds ?? 0) < scene.seconds) throw new Error(`${asset.name} 短于镜头时长`);
  }
}

export async function editWithAgent(input: z.infer<typeof chatRequestSchema>, assets: DemoAsset[]) {
  const id = input.sessionId ?? randomUUID();
  if (running.has(id)) throw new Error('这个会话正在处理上一条消息');
  running.add(id);
  try {
    const workspace = path.join(sessionRoot(), id);
    await mkdir(workspace, {recursive: true});
    const sessionFile = path.join(workspace, 'session.json');
    const session: Session = JSON.parse(await readFile(sessionFile, 'utf8').catch(() => '{"history":[]}'));
    const capabilities = await editorCapabilities();
    let scenes = input.scenes as StoryboardScene[];
    let reply = '';
    const calls: string[] = [];
    if (!configured()) {
      if (input.requestedSkill || /名场面穿越|穿越广告/.test(input.message)) {
        reply = '名场面穿越是独立 Skill，原脚本和关键帧保持原样。配置服务端 Agent 模型后，才可由主 Agent 加载并遵循这套流程；本次没有启动生成。';
      } else {
        const result = applyChatEdit(scenes, input.message);
        if (result.changed) validateEdit(result.storyboard, assets);
        scenes = result.storyboard;
        reply = `快捷指令模式：${result.reply}`;
      }
    } else {
      const staged = path.join(workspace, '.claude/skills', skillName);
      if (capabilities.skills.length) await cp(skillDirectory(), staged, {recursive: true});
      const resultText = (value: unknown) => ({content: [{type: 'text' as const, text: JSON.stringify(value)}]});
      let toolCount = 0;
      const count = (name: string) => {if (++toolCount > 12) throw new Error('本轮工具调用已达上限'); calls.push(name);};
      const editor = createSdkMcpServer({name: 'editor', version: '1.0.0', tools: [
        tool('read_edit', '读取当前镜头、素材和本轮编辑状态', {}, async () => {count('read_edit'); return resultText({scenes, assets});}),
        tool('replace_edit', '提交完整剪辑方案；服务端校验素材、事实和台词长度。失败不修改。', {scenes: z.array(sceneSchema).min(1).max(12)}, async (args) => {
          count('replace_edit');
          try {validateEdit(args.scenes, assets); scenes = args.scenes; return resultText({applied: true, scenes});}
          catch (error) {return {...resultText({applied: false, error: (error as Error).message}), isError: true};}
        }),
      ]});
      const readable = [staged, path.resolve('docs/名场面穿越'), path.resolve('data/chuanyue')];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);
      const requestedSkill = input.requestedSkill ?? (input.message.includes(skillName) ? skillName : undefined);
      const prompt = JSON.stringify({
        history: session.sdkSessionId ? [] : session.history.slice(-16),
        request: input.message, requestedSkill, skillInstruction: requestedSkill ? `先使用 Skill 工具加载 ${requestedSkill}，然后遵循原文件和 references；不要改原文件。` : undefined,
        currentEdit: scenes, assets,
      });
      try {
        const stream = query({prompt, options: {
          cwd: workspace, model: process.env.EDITOR_AGENT_MODEL ?? 'sonnet',
          systemPrompt: '你是卫华视频生产线的主剪辑 Agent。用户通过自然语言修改剪辑，像 ChatCut 一样说明具体改动并调用编辑工具。参考 Loomi 边界：SDK 管会话和工具循环，领域工具校验事实与素材。名场面穿越是独立 Skill，只在明确要求时加载，绝不能把它改写为故事板模板，不能改原 Skill、脚本、关键帧。修改节奏时先减少空等，再精简台词，数值和来源不变。调用 replace_edit 成功才可以说已修改。Skill 中的生图、视频、配音工具若不可用，明确报告，不能声称生成完成。现有工程可能含另一会话制作的控制室 HUD，不能改那个渲染器。不要执行付费生成、发布或修改外部 ChatCut 项目；需要时说明待接的能力。',
          ...(session.sdkSessionId ? {resume: session.sdkSessionId} : {}),
          persistSession: true, settingSources: capabilities.skills.length ? ['project'] : [],
          skills: capabilities.skills.map((skill) => skill.name), plugins: [], tools: capabilities.skills.length ? ['Skill', 'Read'] : [],
          disallowedTools: ['Bash', 'Write', 'Edit', 'Agent', 'Task', 'WebSearch', 'WebFetch'],
          mcpServers: {editor, ...(process.env.CHATCUT_MCP_URL ? {chatcut: {type: 'http' as const, url: process.env.CHATCUT_MCP_URL}} : {})},
          allowedTools: ['mcp__editor__read_edit', 'mcp__editor__replace_edit'],
          canUseTool: async (name, args) => {
            const file = typeof args.file_path === 'string' ? path.resolve(workspace, args.file_path) : '';
            const permitted = name.startsWith('mcp__editor__') || (name === 'Skill' && args.skill === skillName)
              || (name === 'Read' && readable.some((directory) => file.startsWith(directory + path.sep)));
            return permitted ? {behavior: 'allow', updatedInput: args} : {behavior: 'deny', message: '只允许编辑领域工具和读取当前 Skill 资料'};
          },
          maxTurns: 8, abortController: controller,
        }});
        for await (const event of stream) {
          if (event.type === 'system' && event.subtype === 'init') session.sdkSessionId = event.session_id;
          if (event.type === 'assistant') for (const block of event.message.content) if (block.type === 'text') reply = block.text;
          if (event.type === 'result') {
            if (event.subtype !== 'success') throw new Error('Agent 本轮未完成；已执行的编辑见当前方案。');
            reply = event.result;
          }
        }
      } finally {clearTimeout(timeout);}
    }
    session.history.push({role: 'user', content: input.message}, {role: 'assistant', content: reply});
    await writeFile(sessionFile, JSON.stringify(session, null, 2));
    return {sessionId: id, reply, scenes, runtime: capabilities.runtime, calls};
  } finally {running.delete(id);}
}
