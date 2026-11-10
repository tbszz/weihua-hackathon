import {describe, expect, it} from 'vitest';
import {createAigcPlan, getSkillCatalog} from '../src/server/skills';

describe('AIGC skill registry', () => {
  it('lists the editing and generation skills as Loomi capabilities', () => {
    const skills = getSkillCatalog();
    expect(skills.map((skill) => skill.id)).toEqual([
      'industrial-aigc-video',
      'caption-packaging',
      'voiceover-sync',
    ]);
    expect(skills[0].tools).toContain('generate_video');
  });

  it('builds a bounded plan and keeps unverified numbers out of prompts', () => {
    const plan = createAigcPlan({
      topic: '走进卫华智能工厂',
      durationSeconds: 20,
      aspectRatio: '16:9',
      claims: [{value: '3800 吨', source: 'https://example.com/claim'}],
    });
    expect(plan.skillId).toBe('industrial-aigc-video');
    expect(plan.shots.length).toBeGreaterThanOrEqual(2);
    expect(plan.shots.reduce((sum, shot) => sum + shot.seconds, 0)).toBe(20);
    expect(plan.shots.every((shot) => shot.prompt.includes('AI 生成示意'))).toBe(true);
    expect(plan.shots.some((shot) => shot.prompt.includes('3800 吨'))).toBe(false);
    expect(plan.claims).toEqual([{value: '3800 吨', source: 'https://example.com/claim'}]);
  });
});

