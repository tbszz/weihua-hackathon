import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

describe('名场面穿越音轨路由', () => {
  it('mutes non-dialogue video audio and covers the final subtitle', () => {
    const project = JSON.parse(readFileSync(new URL('../data/chuanyue/卫华起重机/project-v7.json', import.meta.url), 'utf8')) as {
      shots: Array<{id: string; sourceVolume: number}>;
      subtitles: Array<{text: string}>;
      voices: Array<{line?: string}>;
    };
    for (const shot of project.shots) {
      expect(shot.sourceVolume).toBe(['S1a', 'S2a', 'S4a'].includes(shot.id) ? 1 : 0);
    }
    expect(project.subtitles.some((item) => item.text === '卫华起重 大国重器')).toBe(true);
    expect(project.voices.some((item) => item.line?.includes('卫华起重'))).toBe(true);
    expect(project.voices.some((item) => item.line?.includes('这么高你也够得着'))).toBe(true);
    expect(project.voices.some((item) => item.line?.includes('我乃河南卫华造起重机滴'))).toBe(true);
  });
});
