export const CRANE_PARTS = [
  { id: 'gantry', parent: null, label: '整机 · 3800t 双主梁门机', layer: 0, kind: 'group', position: [0, 3.9, 0], size: [10.4, 0.35, 1.5], color: 0xf0ae37, explode: [0, 0.4, 0] },
  { id: 'girder-a', parent: 'gantry', label: '主梁 A', layer: 1, kind: 'box', position: [0, 4.35, -0.65], size: [10, 0.55, 0.36], color: 0xf0ae37, explode: [0, 0.8, -0.55] },
  { id: 'girder-b', parent: 'gantry', label: '主梁 B', layer: 1, kind: 'box', position: [0, 4.35, 0.65], size: [10, 0.55, 0.36], color: 0xc98224, explode: [0, 1, 0.55] },
  { id: 'end-beam-left', parent: 'gantry', label: '左端梁', layer: 1, kind: 'box', position: [-4.8, 4.1, 0], size: [0.42, 0.42, 1.75], color: 0xb56b20, explode: [-0.7, 0, 0] },
  { id: 'end-beam-right', parent: 'gantry', label: '右端梁', layer: 1, kind: 'box', position: [4.8, 4.1, 0], size: [0.42, 0.42, 1.75], color: 0xb56b20, explode: [0.7, 0, 0] },
  { id: 'leg-lf', parent: 'gantry', label: '刚腿 · 左前', layer: 1, kind: 'leg', position: [-4.65, 2.1, -0.68], size: [0.38, 3.9, 0.38], color: 0xb9c9c2, explode: [-0.7, 0, -0.25] },
  { id: 'leg-lb', parent: 'gantry', label: '柔腿 · 左后', layer: 1, kind: 'leg', position: [-4.65, 2.1, 0.68], size: [0.38, 3.9, 0.38], color: 0x94aaa0, explode: [-0.7, 0, 0.25] },
  { id: 'leg-rf', parent: 'gantry', label: '刚腿 · 右前', layer: 1, kind: 'leg', position: [4.65, 2.1, -0.68], size: [0.38, 3.9, 0.38], color: 0xb9c9c2, explode: [0.7, 0, -0.25] },
  { id: 'leg-rb', parent: 'gantry', label: '柔腿 · 右后', layer: 1, kind: 'leg', position: [4.65, 2.1, 0.68], size: [0.38, 3.9, 0.38], color: 0x94aaa0, explode: [0.7, 0, 0.25] },
  { id: 'catwalk-front', parent: 'gantry', label: '主梁检修走台', layer: 1, kind: 'box', position: [0, 3.75, -1.05], size: [9.6, 0.12, 0.22], color: 0x4e625a, explode: [0, 0.3, -0.5] },
  { id: 'railing-front', parent: 'catwalk-front', label: '走台栏杆', layer: 1, kind: 'rail', position: [0, 4.02, -1.08], size: [9.5, 0.42, 0.04], color: 0xd1ddd7, explode: [0, 0.3, -0.5] },
  { id: 'wheel-left', parent: 'gantry', label: '左侧大车运行机构', layer: 1, kind: 'wheelset', position: [-4.55, 0.35, 0], size: [0.9, 0.42, 1.9], color: 0x4f6159, explode: [-0.5, -0.1, 0] },
  { id: 'wheel-right', parent: 'gantry', label: '右侧大车运行机构', layer: 1, kind: 'wheelset', position: [4.55, 0.35, 0], size: [0.9, 0.42, 1.9], color: 0x4f6159, explode: [0.5, -0.1, 0] },
  { id: 'upper-trolley', parent: 'gantry', label: '上小车 · 1900t', layer: 2, kind: 'trolley', position: [-2.05, 4.72, -0.65], size: [1.75, 0.45, 1.05], color: 0xe8753e, explode: [0, 1.25, -0.65] },
  { id: 'lower-trolley', parent: 'gantry', label: '下小车 · 1900t', layer: 2, kind: 'trolley', position: [2.05, 4.72, 0.65], size: [1.75, 0.45, 1.05], color: 0xe8d3a1, explode: [0, 1.35, 0.65] },
  { id: 'upper-motor', parent: 'upper-trolley', label: '上小车起升电机', layer: 3, kind: 'cylinder', position: [-2.2, 5.12, -0.65], size: [0.3, 0.7, 0.3], color: 0x5dd1ba, explode: [-0.25, 0.95, -0.65] },
  { id: 'upper-reducer', parent: 'upper-trolley', label: '上小车减速机', layer: 3, kind: 'box', position: [-1.65, 5.12, -0.65], size: [0.45, 0.38, 0.45], color: 0x6dbfaf, explode: [0.15, 1.1, -0.65] },
  { id: 'upper-drum', parent: 'upper-trolley', label: '上小车卷筒', layer: 3, kind: 'drum', position: [-2.05, 5.15, -0.65], size: [0.7, 0.26, 0.26], color: 0xe9bd50, explode: [0, 1.3, -0.65] },
  { id: 'lower-motor', parent: 'lower-trolley', label: '下小车起升电机', layer: 3, kind: 'cylinder', position: [1.9, 5.12, 0.65], size: [0.3, 0.7, 0.3], color: 0x5dd1ba, explode: [-0.15, 1.05, 0.65] },
  { id: 'lower-reducer', parent: 'lower-trolley', label: '下小车减速机', layer: 3, kind: 'box', position: [2.45, 5.12, 0.65], size: [0.45, 0.38, 0.45], color: 0x6dbfaf, explode: [0.25, 1.1, 0.65] },
  { id: 'lower-drum', parent: 'lower-trolley', label: '下小车卷筒', layer: 3, kind: 'drum', position: [2.05, 5.15, 0.65], size: [0.7, 0.26, 0.26], color: 0xe9bd50, explode: [0, 1.3, 0.65] },
  { id: 'upper-rope', parent: 'upper-trolley', label: '上小车钢丝绳', layer: 3, kind: 'rope', position: [-2.05, 3.85, -0.65], size: [0.05, 1.6, 0.05], color: 0xdfe7e2, explode: [0, 1.45, -0.65] },
  { id: 'lower-rope', parent: 'lower-trolley', label: '下小车钢丝绳', layer: 3, kind: 'rope', position: [2.05, 3.85, 0.65], size: [0.05, 1.6, 0.05], color: 0xdfe7e2, explode: [0, 1.45, 0.65] },
  { id: 'upper-hook', parent: 'upper-trolley', label: '上小车吊钩组', layer: 3, kind: 'hook', position: [-2.05, 3.0, -0.65], size: [0.42, 0.42, 0.42], color: 0xf0ae37, explode: [0, 1.55, -0.65] },
  { id: 'lower-hook', parent: 'lower-trolley', label: '下小车吊钩组', layer: 3, kind: 'hook', position: [2.05, 3.0, 0.65], size: [0.42, 0.42, 0.42], color: 0xf0ae37, explode: [0, 1.55, 0.65] },
];

export function buildPartTree(parts = CRANE_PARTS) {
  const nodes = new Map(parts.map((part) => [part.id, { ...part, children: [] }]));
  const roots = [];
  nodes.forEach((node) => {
    if (node.parent && nodes.has(node.parent)) nodes.get(node.parent).children.push(node);
    else roots.push(node);
  });
  return roots;
}

export function getPartById(id, parts = CRANE_PARTS) {
  return parts.find((part) => part.id === id) || null;
}

export function explodePosition(part, level) {
  const factor = level >= part.layer ? 1 : 0;
  return part.position.map((value, index) => value + part.explode[index] * factor);
}
