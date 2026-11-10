import {z} from 'zod';

export type SkillDescriptor = {
  id: string;
  name: string;
  description: string;
  kind: 'agent' | 'toolkit';
  status: 'ready' | 'planned';
  tools: string[];
};

export type AigcClaim = {value: string; source: string};

export type AigcShot = {
  id: string;
  seconds: number;
  role: 'establishing' | 'detail' | 'motion' | 'closing';
  prompt: string;
  aiLabel: string;
};

export type AigcPlan = {
  skillId: 'industrial-aigc-video';
  topic: string;
  durationSeconds: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  claims: AigcClaim[];
  shots: AigcShot[];
  guardrails: string[];
};

const planInput = z.object({
  topic: z.string().trim().min(2).max(120),
  durationSeconds: z.number().int().min(4).max(30).default(15),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  claims: z.array(z.object({value: z.string().trim().min(1).max(80), source: z.string().url()})).max(12).default([]),
});

const catalog: SkillDescriptor[] = [
  {id: 'industrial-aigc-video', name: '重工业 AIGC 视频', description: '从主题生成可审核的工业概念镜头，并交给剪辑流水线。', kind: 'agent', status: 'ready', tools: ['plan_shots', 'generate_video', 'review_asset', 'send_to_editor']},
  {id: 'caption-packaging', name: '字幕与科技包装', description: '为已锁定故事板生成字幕安全区、HUD 和节奏包装参数。', kind: 'toolkit', status: 'ready', tools: ['build_caption_track', 'build_hud']},
  {id: 'voiceover-sync', name: '中文配音同步', description: '按旁白时长校准镜头、字幕和音频 ducking。', kind: 'toolkit', status: 'ready', tools: ['synthesize_voice', 'sync_timing', 'qc_audio']},
];

export function getSkillCatalog(): SkillDescriptor[] {
  return catalog.map((skill) => ({...skill, tools: [...skill.tools]}));
}

function distribute(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({length: count}, (_, index) => base + (index < remainder ? 1 : 0));
}

export function createAigcPlan(input: z.input<typeof planInput>): AigcPlan {
  const parsed = planInput.parse(input);
  const count = parsed.durationSeconds <= 8 ? 2 : parsed.durationSeconds <= 18 ? 3 : 4;
  const seconds = distribute(parsed.durationSeconds, count);
  const roles: AigcShot['role'][] = count === 2
    ? ['establishing', 'closing']
    : count === 3
      ? ['establishing', 'motion', 'closing']
      : ['establishing', 'detail', 'motion', 'closing'];
  const prompts = [
    `工业纪录片开场，${parsed.topic}，大型起重设备与厂区空间，稳定推进，真实材质，电影级灯光`,
    `工业设备结构细节，${parsed.topic}，钢梁、吊钩、钢丝绳与控制界面，慢速微距，结构清晰`,
    `设备运动镜头，${parsed.topic}，平稳跟拍与轻微升降，强调协作和尺度，不添加未经核对的参数`,
    `品牌收束镜头，${parsed.topic}，设备停在厂区天际线前，留出字幕安全区，干净有力量`,
  ];
  return {
    skillId: 'industrial-aigc-video',
    topic: parsed.topic,
    durationSeconds: parsed.durationSeconds,
    aspectRatio: parsed.aspectRatio,
    claims: parsed.claims,
    shots: roles.map((role, index) => ({
      id: `AIGC-${String(index + 1).padStart(2, '0')}`,
      seconds: seconds[index],
      role,
      prompt: `${prompts[index]}。画面左下角保留“AI 生成示意”标识。`,
      aiLabel: 'AI 生成示意',
    })),
    guardrails: [
      '产品参数只允许来自 claims，模型不得自行补写数字。',
      '生成素材必须保留 AI 生成示意标识，审核通过后才进入故事板。',
      '创建任务后只轮询原任务 ID，不因超时重复扣费。',
    ],
  };
}
