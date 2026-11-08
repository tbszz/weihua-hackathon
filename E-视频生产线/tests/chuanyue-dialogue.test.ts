import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

describe('名场面穿越对白镜头', () => {
  it('keeps every AI dialogue clip long enough for its full audio', () => {
    const project = JSON.parse(readFileSync(new URL('../data/chuanyue/卫华起重机/project-v4.json', import.meta.url), 'utf8')) as {
      shots: Array<{id: string; seconds: number; sourceVolume?: number}>;
    };
    const dialogue = new Map(project.shots.filter((shot) => ['S1a', 'S2a', 'S3a', 'S4a'].includes(shot.id)).map((shot) => [shot.id, shot]));
    for (const id of ['S1a', 'S2a', 'S3a', 'S4a']) expect(dialogue.get(id)?.seconds).toBeGreaterThanOrEqual(4.4);
  });
});
