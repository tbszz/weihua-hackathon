// 「名场面穿越」关键帧：逐镜头调用 Codex 自带的 image_gen 生成 16:9 关键帧。
// 用法：npm run chuanyue:keyframes -- <keyframes.json> [--only S1a,S2b] [--force]
// keyframes.json：{"outDir": "keyframes", "style": "可选，覆盖默认风格后缀", "shots": [{"id": "S0", "prompt": "画面描述", "refs": ["参考图路径"]}]}
// 已存在的 <id>.png 默认跳过（避免重复消耗额度），--force 才重新生成。路径都相对于 JSON 文件。
import {spawn} from 'node:child_process';
import {access, mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';

export const KEYFRAME_STYLE = '第一人称主观视角，画面下方可见主角的双手和小臂，写实电影级画面，体积光，尘雾颗粒，暖灰色调，浅景深，35mm 电影镜头，高细节，16:9 横版构图，画面里不要出现任何文字、字幕、水印和标志';

const schema = z.object({
  outDir: z.string().default('keyframes'),
  style: z.string().optional(),
  shots: z.array(z.object({id: z.string().regex(/^[\w-]+$/), prompt: z.string().min(4), refs: z.array(z.string()).default([])})).min(1),
});

const args = process.argv.slice(2);
const file = args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--only');
if (!file) throw new Error('用法：npm run chuanyue:keyframes -- <keyframes.json> [--only S1a,S2b] [--force]');
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : undefined;
const force = args.includes('--force');
const base = path.dirname(path.resolve(file));
const config = schema.parse(JSON.parse(await readFile(path.resolve(file), 'utf8')));
const outDir = path.resolve(base, config.outDir);
await mkdir(outDir, {recursive: true});
const exists = (target: string) => access(target).then(() => true, () => false);

function codex(prompt: string, images: string[]) {
  const commandArgs = ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', outDir, ...images.flatMap((image) => ['-i', image]), '-'];
  return new Promise<string>((resolve, reject) => {
    const child = spawn('codex', commandArgs, {shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'pipe']});
    let output = '';
    child.stdout.on('data', (chunk) => {output += chunk;});
    child.stderr.on('data', (chunk) => {output += chunk;});
    const timer = setTimeout(() => {child.kill(); reject(new Error('Codex 生成超时（10 分钟）'));}, 600000);
    child.on('close', (code) => {clearTimeout(timer); code === 0 ? resolve(output) : reject(new Error(`codex 退出码 ${code}\n${output.slice(-1500)}`));});
    child.stdin.end(prompt);
  });
}

const failures: string[] = [];
for (const shot of config.shots) {
  if (only && !only.has(shot.id)) continue;
  const target = path.join(outDir, `${shot.id}.png`);
  if (!force && await exists(target)) {console.log(`[keyframes] 跳过 ${shot.id}（已存在）`); continue;}
  const refs = shot.refs.map((ref) => path.resolve(base, ref));
  for (const ref of refs) if (!await exists(ref)) throw new Error(`${shot.id} 参考图不存在：${ref}`);
  const prompt = [
    '使用你内置的 image_gen 工具生成 1 张 16:9 横版图片，不要写代码画图，不要修改任何其他文件。',
    refs.length ? '附带的参考图是产品的真实外观：保持其结构、比例和配色一致，只改变场景与视角。' : '',
    `画面：${shot.prompt}`,
    `风格：${config.style ?? KEYFRAME_STYLE}`,
    `生成后把图片复制到当前目录，命名为 ${shot.id}.png（覆盖同名文件），最后只回复该文件的绝对路径。`,
  ].filter(Boolean).join('\n');
  console.log(`[keyframes] 生成 ${shot.id} …`);
  try {
    await codex(prompt, refs);
    if (!await exists(target)) throw new Error('Codex 已结束，但没有找到输出文件');
    console.log(`[keyframes] 完成 ${shot.id} → ${target}`);
  } catch (error) {
    failures.push(shot.id);
    console.error(`[keyframes] 失败 ${shot.id}：${(error as Error).message}`);
  }
}
await import('node:fs/promises').then(({rm}) => rm(path.join(outDir, '.omx'), {recursive: true, force: true}));
if (failures.length) {console.error(`[keyframes] 失败镜头：${failures.join(', ')}（不会自动重试）`); process.exitCode = 1;}
