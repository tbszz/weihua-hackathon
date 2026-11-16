// A plant plan read off a picture (column grid, bay spans, areas, equipment) written out as a plain
// DXF in millimetres, shaped the way demo/src/scene/infer-plant.js reads drawings: small closed
// outlines for columns, one big outline round them for the hall, rectangles for areas and machines.
// The plant is laid out with the runway along X (the long side), bays stacked along Y.

const STEEL = { w: 400, d: 600, layer: '钢柱' };
const CONCRETE = { w: 600, d: 800, layer: '混凝土柱' };
const HALL_MARGIN = 500; // wall outline outside the axis lines
const AREA_MIN = 15000; // infer-plant draws a closed outline this long or longer as a zone
const MACHINE = [2000, 15000];

const num = (v) => Math.round(v * 10) / 10;

// Where the grid numbers came from. A picture with no dimensions gives proportions only; those are
// accepted only once snapped to the GB/T 50006 modules (spans ≤ 18 m on 3 m, larger spans and all
// column pitches on 6 m), so a guess can never pass for a size someone wrote down.
export const SOURCES = ['图上尺寸标注', '用户给定', '按图比例+标准模数'];
export const MODULE_SOURCE = SOURCES[2];

export function offModule(spansM, pitchesM) {
  const off = (v, m) => Math.abs(v / m - Math.round(v / m)) > 1e-6;
  return [
    ...spansM.filter((s) => off(s, s <= 18 ? 3 : 6)).map((s) => `跨度 ${s} m（${s <= 18 ? '≤18 m 用 3 m 倍数' : '>18 m 用 6 m 倍数'}）`),
    ...[...new Set(pitchesM)].filter((p) => off(p, 6)).map((p) => `柱距 ${p} m（用 6 m 倍数）`),
  ];
}

function polyline(layer, points) {
  const out = ['0', 'LWPOLYLINE', '8', layer, '90', String(points.length), '70', '1'];
  for (const p of points) out.push('10', String(num(p.x)), '20', String(num(p.y)));
  return out;
}

function text(layer, x, y, height, value) {
  return ['0', 'TEXT', '8', layer, '10', String(num(x)), '20', String(num(y)), '30', '0', '40', String(height), '1', String(value).replace(/[\r\n]+/g, ' ')];
}

const rect = (cx, cy, w, d) => [
  { x: cx - w / 2, y: cy - d / 2 }, { x: cx + w / 2, y: cy - d / 2 },
  { x: cx + w / 2, y: cy + d / 2 }, { x: cx - w / 2, y: cy + d / 2 },
];

function list(value, name, [lo, hi], max) {
  if (!Array.isArray(value) || !value.length) throw new Error(`${name} 至少要有 1 个数`);
  if (value.length > max) throw new Error(`${name} 最多 ${max} 个，收到 ${value.length} 个`);
  value.forEach((v, i) => {
    if (!Number.isFinite(v) || v < lo || v > hi) throw new Error(`${name} 第 ${i + 1} 个是 ${v}，应在 ${lo}–${hi} m 之间`);
  });
  return value.map((v) => v * 1000);
}

// spec (metres): spans_m bays across the hall listed from Y=0 up, pitches_m column spacings along it
// (or length_m + pitch_m when they are all equal), column 'steel' | 'concrete', areas / equipment
// as { name, x_m, y_m, w_m, d_m } centred at (x, y) from the first axis intersection.
export function planToDxf(spec) {
  const spans = list(spec.spans_m, 'spans_m（各跨跨度）', [6, 60], 20);
  let pitches;
  if (spec.pitches_m?.length) pitches = list(spec.pitches_m, 'pitches_m（柱距）', [3, 30], 80);
  else if (Number.isFinite(spec.length_m) && Number.isFinite(spec.pitch_m)) {
    const n = Math.round(spec.length_m / spec.pitch_m);
    if (n < 1 || Math.abs(n * spec.pitch_m - spec.length_m) > 0.05) throw new Error(`length_m ${spec.length_m} 不是 pitch_m ${spec.pitch_m} 的整数倍，柱距不等时请逐个给 pitches_m`);
    pitches = list(Array(n).fill(spec.pitch_m), 'pitches_m（柱距）', [3, 30], 80);
  } else throw new Error('缺柱距：给 pitches_m（逐个柱距），或 length_m + pitch_m（等柱距）');
  if (!SOURCES.includes(spec.source)) throw new Error(`source 要写尺寸来源：${SOURCES.join(' / ')}。图上没标尺寸、用户也没给时先问用户`);
  if (spec.source === MODULE_SOURCE) {
    const bad = offModule(spans.map((s) => s / 1000), pitches.map((p) => p / 1000));
    if (bad.length) throw new Error(`按标准模数推算时，这些值不在 GB/T 50006 模数上：${bad.join('；')}。请就近取模数值再调`);
  }

  const xs = pitches.reduce((acc, p) => [...acc, acc.at(-1) + p], [0]);
  const ys = spans.reduce((acc, s) => [...acc, acc.at(-1) + s], [0]);
  const length = xs.at(-1);
  const width = ys.at(-1);
  if (length < width) throw new Error(`厂房长 ${length / 1000} m 小于总宽 ${width / 1000} m。行车沿长边运行：请确认 spans_m 是垂直于行车方向的各跨跨度、pitches_m 是沿行车方向的柱距，必要时对调`);

  const col = spec.column === 'concrete' ? CONCRETE : STEEL;
  const entities = [];
  // Hall outline, then one column at every axis intersection.
  entities.push(...polyline('墙', [
    { x: -HALL_MARGIN, y: -HALL_MARGIN }, { x: length + HALL_MARGIN, y: -HALL_MARGIN },
    { x: length + HALL_MARGIN, y: width + HALL_MARGIN }, { x: -HALL_MARGIN, y: width + HALL_MARGIN },
  ]));
  for (const x of xs) for (const y of ys) entities.push(...polyline(col.layer, rect(x, y, col.w, col.d)));

  const placed = (items, name, check) => (items ?? []).map((it, i) => {
    const label = it.name || `${name}${i + 1}`;
    const [x, y, w, d] = [it.x_m, it.y_m, it.w_m, it.d_m].map((v) => v * 1000);
    if (![x, y, w, d].every(Number.isFinite) || w <= 0 || d <= 0) throw new Error(`${name}「${label}」要有 x_m、y_m、w_m、d_m`);
    if (x - w / 2 < -HALL_MARGIN || x + w / 2 > length + HALL_MARGIN || y - d / 2 < -HALL_MARGIN || y + d / 2 > width + HALL_MARGIN) {
      throw new Error(`${name}「${label}」超出厂房（0–${length / 1000} × 0–${width / 1000} m）`);
    }
    check(label, Math.max(w, d));
    entities.push(...polyline(name === '分区' ? '分区' : '设备', rect(x, y, w, d)));
    entities.push(...text('文字', x - w / 2 + 300, y + d / 2 - 900, 600, label));
    return label;
  });
  const areas = placed(spec.areas, '分区', (label, big) => {
    if (big < AREA_MIN) throw new Error(`分区「${label}」最长边 ${big / 1000} m，不到 ${AREA_MIN / 1000} m 会被当成设备，请放进 equipment`);
  });
  const equipment = placed(spec.equipment, '设备', (label, big) => {
    if (big < MACHINE[0] || big >= MACHINE[1]) throw new Error(`设备「${label}」最长边 ${big / 1000} m，应在 ${MACHINE[0] / 1000}–${MACHINE[1] / 1000} m；更大的区域请放进 areas`);
  });

  const dxf = [
    '0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1015', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES', ...entities, '0', 'ENDSEC', '0', 'EOF',
  ].join('\n');
  const tooNarrow = spans.filter((s) => s < 9000 || s > 40000).map((s) => s / 1000);
  return {
    text: `${dxf}\n`,
    summary: {
      尺寸来源: spec.source === MODULE_SOURCE ? `${MODULE_SOURCE}（GB/T 50006，非实测，需用户核对）` : spec.source,
      厂房_m: [length / 1000, width / 1000],
      跨: spans.map((s) => s / 1000),
      柱距_m: [...new Set(pitches.map((p) => p / 1000))],
      柱: `${xs.length} 列 × ${ys.length} 排 = ${xs.length * ys.length} 根${spec.column === 'concrete' ? '混凝土柱' : '钢柱'}`,
      分区: areas,
      设备: equipment,
      ...(tooNarrow.length ? { 不配行车的跨: `${tooNarrow.join('、')} m（行车只配 9–40 m 的跨）` } : {}),
    },
  };
}
