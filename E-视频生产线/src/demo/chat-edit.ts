import type {StoryboardScene} from './pipeline';

export type ChatEditResult = {storyboard: StoryboardScene[]; reply: string; changed: boolean};

const refreshTimes = (scenes: StoryboardScene[]) => {
  let cursor = 0;
  return scenes.map((scene) => {
    const start = cursor;
    cursor += scene.seconds;
    return {...scene, time: `${format(start)}–${format(cursor)}`};
  });
};

const format = (seconds: number) => {
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};

/** Deterministic, bounded edit tool for the chat surface. It never invents copy or facts. */
export function applyChatEdit(storyboard: StoryboardScene[], input: string): ChatEditResult {
  const request = input.trim();
  if (!request) return {storyboard, reply: '你可以说“把第 3 段缩短到 6 秒”“删掉最后一段”或“节奏快一点”。', changed: false};
  const durationMatch = request.match(/第\s*(\d+)\s*段[^\d]{0,12}(\d+(?:\.\d+)?)\s*秒/);
  if (durationMatch) {
    const index = Number(durationMatch[1]) - 1;
    const seconds = Number(durationMatch[2]);
    if (!storyboard[index]) return {storyboard, reply: `现在只有 ${storyboard.length} 段，找不到第 ${index + 1} 段。`, changed: false};
    if (seconds < 2 || seconds > 30) return {storyboard, reply: '单段时长只能在 2–30 秒之间。', changed: false};
    const next = refreshTimes(storyboard.map((scene, current) => current === index ? {...scene, seconds} : scene));
    return {storyboard: next, reply: `已把第 ${index + 1} 段改为 ${seconds} 秒。`, changed: true};
  }
  const deleteMatch = request.match(/(?:删掉|删除|去掉)第\s*(\d+)\s*段/);
  const deleteLast = /删掉最后一段|删除最后一段|去掉最后一段/.test(request);
  if (deleteMatch || deleteLast) {
    const index = deleteLast ? storyboard.length - 1 : Number(deleteMatch![1]) - 1;
    if (index < 0 || index >= storyboard.length) return {storyboard, reply: '没有可以删除的镜头。', changed: false};
    if (storyboard.length === 1) return {storyboard, reply: '至少保留一个镜头。', changed: false};
    return {storyboard: refreshTimes(storyboard.filter((_, current) => current !== index)), reply: `已删除第 ${index + 1} 段，后面的镜头已自动前移。`, changed: true};
  }
  if (/节奏.*太慢|太慢|节奏.*快|快一点|加快/.test(request)) {
    const next = refreshTimes(storyboard.map((scene) => ({...scene, seconds: Math.max(2, Math.round(scene.seconds * 0.8 * 10) / 10)})));
    return {storyboard: next, reply: '已把每段压缩约 20%，并重新排列时间码。', changed: true};
  }
  if (/节奏.*慢|慢一点|放慢/.test(request)) {
    const next = refreshTimes(storyboard.map((scene) => ({...scene, seconds: Math.min(30, Math.round(scene.seconds * 1.2 * 10) / 10)})));
    return {storyboard: next, reply: '已把每段延长约 20%，并重新排列时间码。', changed: true};
  }
  return {storyboard, reply: '我只会修改镜头顺序和时长，不会擅自改写台词或数字。可以试试“把第 3 段缩短到 6 秒”。', changed: false};
}
