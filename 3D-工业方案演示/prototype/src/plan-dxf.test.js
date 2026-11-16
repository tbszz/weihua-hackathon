import assert from 'node:assert/strict';
import test from 'node:test';
import { inferPlant } from '../../demo/src/scene/infer-plant.js';
import { planToDxf } from './plan-dxf.js';

test('a grid read off a picture comes back out of the plant parser as the same bays', () => {
  const { text, summary } = planToDxf({ spans_m: [27, 24, 30], length_m: 120, pitch_m: 6, source: '图上尺寸标注' });
  assert.deepEqual(summary.厂房_m, [120, 81]);
  const r = inferPlant(text, 'test.dxf');
  assert.deepEqual(r.summary.跨, ['A 跨 27.0 m', 'B 跨 24.0 m', 'C 跨 30.0 m']);
  assert.equal(r.summary.柱距_m, 6);
  assert.equal(r.summary.柱线, 21);
  assert.equal(r.summary.柱.钢柱, 21 * 4);
  assert.equal(r.summary.行车, 3);
  assert.equal(r.summary.吊车梁, 6);
  assert.equal(r.summary.方向, '行车沿 X 向运行');
});

test('uneven pitches, concrete columns, areas and equipment are kept', () => {
  const { text } = planToDxf({
    source: '用户给定',
    spans_m: [27],
    pitches_m: [6, 6, 9, 9, 6, 6],
    column: 'concrete',
    areas: [{ name: '成品区', x_m: 30, y_m: 13.5, w_m: 18, d_m: 10 }],
    equipment: [{ name: '开卷机', x_m: 8, y_m: 13.5, w_m: 6, d_m: 3 }],
  });
  const r = inferPlant(text, 'test.dxf');
  assert.equal(r.summary.柱.混凝土柱, 7 * 2);
  assert.equal(r.summary.分区, 1);
  assert.equal(r.summary.设备, 1);
  assert.ok(r.plant.labels.some((l) => l.text === '成品区'));
});

test('bad input is refused with the reason, not clamped', () => {
  assert.throws(() => planToDxf({ spans_m: [27] }), /缺柱距/);
  assert.throws(() => planToDxf({ spans_m: [27], length_m: 60, pitch_m: 6 }), /尺寸来源/);
  assert.throws(() => planToDxf({ spans_m: [27], length_m: 100, pitch_m: 6, source: '用户给定' }), /整数倍/);
  assert.throws(() => planToDxf({ spans_m: [2], length_m: 60, pitch_m: 6, source: '用户给定' }), /6–60 m/);
  assert.throws(() => planToDxf({ spans_m: [30, 30, 30], length_m: 60, pitch_m: 6, source: '用户给定' }), /小于总宽/);
  assert.throws(() => planToDxf({ spans_m: [27], length_m: 60, pitch_m: 6, source: '用户给定', areas: [{ name: '小区', x_m: 10, y_m: 10, w_m: 5, d_m: 5 }] }), /放进 equipment/);
  assert.throws(() => planToDxf({ spans_m: [27], length_m: 60, pitch_m: 6, source: '用户给定', equipment: [{ name: '远', x_m: 100, y_m: 10, w_m: 5, d_m: 5 }] }), /超出厂房/);
});

test('a bay outside 9–40 m is reported as getting no crane', () => {
  const { summary, text } = planToDxf({ spans_m: [27, 7.5], length_m: 60, pitch_m: 6, source: '用户给定' });
  assert.match(summary.不配行车的跨, /7.5 m/);
  assert.equal(inferPlant(text, 't.dxf').summary.行车, 1);
});

test('proportions from a picture only pass when snapped to GB/T 50006 modules', () => {
  const ok = planToDxf({ spans_m: [24, 15], length_m: 72, pitch_m: 12, source: '按图比例+标准模数' });
  assert.match(ok.summary.尺寸来源, /需用户核对/);
  assert.throws(() => planToDxf({ spans_m: [25, 15], length_m: 72, pitch_m: 6, source: '按图比例+标准模数' }), /跨度 25 m/);
  assert.throws(() => planToDxf({ spans_m: [16], length_m: 63, pitch_m: 7, source: '按图比例+标准模数' }), /跨度 16 m.*柱距 7 m/);
  // Written-down sizes are taken as they are, on module or not.
  assert.doesNotThrow(() => planToDxf({ spans_m: [25], length_m: 63, pitch_m: 7, source: '图上尺寸标注' }));
});
