import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

describe('名场面穿越合成模板', () => {
  it('does not include the control-room HUD overlay', () => {
    const source = readFileSync(new URL('../src/remotion/Chuanyue.tsx', import.meta.url), 'utf8');
    expect(source).not.toContain('ControlRoomOverlay');
    expect(source).not.toContain('PREDICTIVE CONTROL / DEMO');
    expect(source).not.toContain('INPUT / LOAD PROFILE');
  });
});
