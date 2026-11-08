import {z} from 'zod';

// 「名场面穿越」成片工程：所有时间都是成片时间轴上的秒数（镜头按顺序硬切拼接）。
const media = z.string().min(1);

export const chuanyueProjectSchema = z.object({
  title: z.string().min(1).max(60),
  width: z.number().int().min(320).max(3840).default(1920),
  height: z.number().int().min(320).max(3840).default(1080),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(30),
  shots: z.array(z.object({
    id: z.string().min(1).max(30),
    src: media,
    trimStart: z.number().min(0).default(0),
    seconds: z.number().min(0.2).max(30),
    sourceVolume: z.number().min(0).max(2).default(0),
    // 竖排书法场景标题（如「长坂坡」），相对本镜头开始的秒数
    title: z.string().max(8).optional(),
    titleStart: z.number().min(0).default(0),
    titleSeconds: z.number().min(0.5).default(3),
  })).min(1).max(40),
  subtitles: z.array(z.object({text: z.string().min(1).max(30), start: z.number().min(0), end: z.number().min(0)})).default([]),
  voices: z.array(z.object({src: media, start: z.number().min(0), volume: z.number().min(0).max(3).default(1), speaker: z.string().optional(), line: z.string().optional()})).default([]),
  sfx: z.array(z.object({src: media, start: z.number().min(0), volume: z.number().min(0).max(3).default(0.8), note: z.string().optional()})).default([]),
  bgm: z.object({src: media, start: z.number().min(0).default(0), trimStart: z.number().min(0).default(0), volume: z.number().min(0).max(2).default(0.35)}).optional(),
  loudness: z.object({targetLufs: z.number().min(-24).max(-6).default(-9.5), truePeak: z.number().min(-6).max(0).default(-1)}).default({targetLufs: -9.5, truePeak: -1}),
  claims: z.array(z.object({text: z.string(), source: z.string().min(1)})).default([]),
});

export type ChuanyueProject = z.infer<typeof chuanyueProjectSchema>;

export const totalSeconds = (project: Pick<ChuanyueProject, 'shots'>) => project.shots.reduce((sum, shot) => sum + shot.seconds, 0);

export const isImage = (src: string) => /\.(jpe?g|png|webp)(\?|$)/i.test(src);

// 结构检查：字幕/配音不越界，字幕不重叠
export function validateProject(project: ChuanyueProject) {
  const total = totalSeconds(project);
  const problems: string[] = [];
  const sorted = [...project.subtitles].sort((a, b) => a.start - b.start);
  sorted.forEach((item, index) => {
    if (item.end <= item.start) problems.push(`字幕「${item.text}」结束时间早于开始时间`);
    if (item.end > total + 0.01) problems.push(`字幕「${item.text}」超出成片时长 ${total.toFixed(2)} 秒`);
    if (index > 0 && item.start < sorted[index - 1].end - 0.01) problems.push(`字幕「${item.text}」与上一条重叠`);
  });
  for (const voice of project.voices) if (voice.start > total) problems.push(`配音 ${voice.line ?? voice.src} 开始时间超出成片`);
  for (const shot of project.shots) if (shot.title && shot.titleStart + 0.5 > shot.seconds) problems.push(`${shot.id} 标题出现得太晚`);
  if (problems.length) throw new Error(problems.join('\n'));
  return total;
}
