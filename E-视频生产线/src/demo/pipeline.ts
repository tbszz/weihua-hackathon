export type TemplateId = 'mega-equipment' | 'smart-factory';

export type DemoAsset = {
  id: string;
  name: string;
  role: string;
  label: string;
  color: string;
  image: string;
  kind?: 'image' | 'video';
  durationSeconds?: number;
  source?: string;
};

export type Claim = {
  value: string;
  label: string;
  source: string;
};

export type StoryboardScene = {
  id: string;
  time: string;
  seconds: number;
  title: string;
  narration: string;
  overlay: string;
  transition: string;
  assetId: string;
  role: string;
  claim?: Claim;
};

export type DemoJob = {
  topic: string;
  template: TemplateId;
  assets: DemoAsset[];
};

export type RenderResult = {
  status: 'complete' | 'failed';
  durationSeconds: number;
  sceneCount: number;
  checks: {label: string; status: 'pass' | 'fail' | 'warning'; detail: string}[];
  outputUrl?: string;
  reportUrl?: string;
};

const demoAssets: DemoAsset[] = [
  {id: 'asset-aerial', name: '3800t 门机公开照片', role: 'aerial_wide', label: '卫华官网 · 演示引用', color: '#27333b', image: '/demo/official-wide.jpg', source: 'https://www.cranewh.com/detail/5739.html'},
  {id: 'asset-structure', name: '门机主体公开照片', role: 'structure_detail', label: '卫华官网 · 演示引用', color: '#364650', image: '/demo/official-port.jpg', source: 'https://www.cranewh.com/detail/5739.html'},
  {id: 'asset-lift', name: '整体提升公开照片', role: 'girder_lift', label: '卫华官网 · 演示引用', color: '#4b3730', image: '/demo/official-lift.jpg', source: 'https://www.cranewh.com/detail/5739.html'},
  {id: 'asset-control', name: '控制室屏幕', role: 'control_room', label: 'CONTROL / DATA', color: '#213d46', image: '/demo/crane-control.svg'},
  {id: 'asset-people', name: '工程师作业', role: 'people_work', label: 'PEOPLE / WORK', color: '#433f36', image: '/demo/crane-people.svg'},
  {id: 'asset-skyline', name: '港口剪影（结构示意）', role: 'brand_end', label: 'PORT / SILHOUETTE', color: '#342c3a', image: '/demo/crane-skyline.svg'},
];

export function createInitialJob(): DemoJob {
  return {
    topic: '3800 吨门机完成整体提升',
    template: 'mega-equipment',
    assets: demoAssets,
  };
}

export function createDemoStoryboard(topic: string, assets: DemoAsset[], template: TemplateId): StoryboardScene[] {
  if (!topic.trim() || topic.length > 50) throw new Error('主题应为 1–50 字');
  const byRole = (role: string, fallback = 0) => [...assets].reverse().find((asset) => asset.role === role) ?? assets[fallback] ?? demoAssets[fallback];
  if (template === 'smart-factory') {
    return [
      scene('S1', '00:00–00:05', 5, '一座会思考的工厂', '从一台起重机，看见重工业的智能脉搏。', '智能工厂 / SMART FACTORY', '光带擦除', byRole('aerial_wide')),
      scene('S2', '00:05–00:13', 8, '数据先于动作抵达', '每一次动作，都由控制系统提前计算。', 'DATA IN MOTION', '缩放穿越', byRole('control_room')),
      scene('S3', '00:13–00:23', 10, '让钢铁保持精确', '结构、载荷和节拍，在同一套系统里协同。', '精度 · 安全 · 协同', '扫描线', byRole('structure_detail')),
      scene('S4', '00:23–00:34', 11, '人和设备一起升级', '工程师把经验写进流程，让现场更从容。', 'HUMAN × MACHINE', '光带擦除', byRole('people_work')),
      scene('S5', '00:34–00:40', 6, '把每一次起吊做成答案', '卫华，让重器更聪明地工作。', 'WEIHUA / INDUSTRIAL INTELLIGENCE', '缩放穿越', byRole('girder_lift')),
      scene('S6', '00:40–00:45', 5, topic, '从一台设备，走向一座工厂。', '卫华重器 · 让世界更高效', '品牌收束', byRole('aerial_wide')),
    ];
  }
  return [
    scene('S1', '00:00–00:06', 6, topic, '在浙江温州，一台巨型门机完成了整体提升。', '3800 t / MEGA EQUIPMENT', '光带擦除', byRole('aerial_wide')),
    scene('S2', '00:06–00:10', 4, '先看懂它的骨架', '双主梁协同，托起重器的力量。', 'DOUBLE GIRDER / STRUCTURE', '缩放穿越', byRole('structure_detail')),
    scene('S3', '00:10–00:20', 10, '它到底有多高？', '整机高 166.5 米，最大起升高度 130 米。', '166.5 m', '扫描线', byRole('aerial_wide'), {value: '166.5 m', label: '整机高度', source: 'https://www.cranewh.com/detail/5739.html'}),
    scene('S4', '00:20–00:30', 10, '两台小车，一起扛住重量', '双小车各 1900 吨，协同完成每一次精准起吊。', '2 × 1900 t', '光带擦除', byRole('control_room'), {value: '2 × 1900 t', label: '双小车额定起重', source: '官方技术资料 · 3800t 门机'}),
    scene('S5', '00:30–00:42', 12, '把巨物稳稳送到位', '2026 年 7 月 3 日，整机完成整体提升。', '2026-07-03 / LIFT COMPLETE', '缩放穿越', byRole('girder_lift'), {value: '2026-07-03', label: '整体提升完成', source: 'https://www.cranewh.com/detail/5739.html'}),
    scene('S6', '00:42–01:00', 18, '重器起于细节', '从设计、制造到现场，每一个细节都在回答同一个问题：如何把更大的力量，交给更可靠的系统。', 'WEIHUA / BUILT FOR HEAVY DUTY', '品牌收束', byRole('aerial_wide')),
  ];
}

function scene(id: string, time: string, seconds: number, title: string, narration: string, overlay: string, transition: string, asset: DemoAsset, claim?: Claim): StoryboardScene {
  return {id, time, seconds, title, narration, overlay, transition, assetId: asset.id, role: asset.role, claim};
}

export function validateStoryboard(storyboard: StoryboardScene[]) {
  if (!storyboard.length) throw new Error('故事板不能为空');
  const allowed = new Set(['3800', '166.5', '130', '1900', '2', '2026', '07', '7', '03', '3']);
  for (const item of storyboard) {
    if (!Number.isFinite(item.seconds) || item.seconds < 2 || item.seconds > 30) throw new Error('单段时长应为 2–30 秒');
    if (!item.title.trim() || !item.narration.trim()) throw new Error('标题和配音不能为空');
    if (item.narration.length > item.seconds * 5) throw new Error(`${item.id} 配音太长，请缩短文案或延长镜头`);
    for (const number of `${item.title} ${item.narration} ${item.overlay} ${item.claim?.value ?? ''}`.match(/\d+(?:\.\d+)?/g) ?? []) {
      if (!allowed.has(number)) throw new Error(`无出处的数字：${number}。请使用已核对的 3800t 参数`);
    }
  }
  return true;
}

export function findAsset(job: DemoJob, assetId: string): DemoAsset {
  return job.assets.find((asset) => asset.id === assetId) ?? job.assets[0];
}
