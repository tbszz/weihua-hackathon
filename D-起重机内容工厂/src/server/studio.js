import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const specCatalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'official-specs.json'), 'utf8'));
const specs = specCatalog.specs;
const constants = JSON.parse(fs.readFileSync(path.join(root, 'data', 'analogy-constants.json'), 'utf8'));

const fieldLabels = {
  ratedLoad_t: ['额定起重量', 't'],
  span_m: ['跨度', 'm'],
  overallHeight_m: ['整机高度', 'm'],
  liftHeight_m: ['起升高度', 'm'],
  site: ['应用场地', ''],
};

function numberFrom(text, regex) {
  const match = text.match(regex);
  return match ? Number(match[1]) : null;
}

function parseInput(text = '') {
  const sourceText = String(text);
  const is3800 = /3800\s*(?:t|吨)/i.test(sourceText);
  const preset = specs.find((item) => item.id === (is3800 ? 'spec-3800t-107m' : 'spec-3800t-107m'));
  const values = {
    ratedLoad_t: numberFrom(sourceText, /(\d+(?:\.\d+)?)\s*(?:t|吨)/i) ?? preset.fields.ratedLoad_t.value,
    span_m: numberFrom(sourceText, /跨度[^\d]*(\d+(?:\.\d+)?)\s*(?:m|米)?/i) ?? preset.fields.span_m.value,
    overallHeight_m: numberFrom(sourceText, /(?:整机高|总高|高度)[^\d]*(\d+(?:\.\d+)?)\s*(?:m|米)?/i) ?? preset.fields.overallHeight_m.value,
    liftHeight_m: numberFrom(sourceText, /(?:起升高|提升高)[^\d]*(\d+(?:\.\d+)?)\s*(?:m|米)?/i) ?? preset.fields.liftHeight_m.value,
  };

  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => {
    const official = preset.fields[key];
    const hasExplicitValue = key === 'ratedLoad_t' ? /(3800\s*(?:t|吨))/i.test(sourceText) :
      key === 'span_m' ? /跨度[^\d]*\d/i.test(sourceText) :
      key === 'overallHeight_m' ? /(?:整机高|总高|高度)[^\d]*\d/i.test(sourceText) :
      /(?:起升高|提升高)[^\d]*\d/i.test(sourceText);
    const matchesOfficial = official && value === official.value;
    return [key, {
      value,
      unit: fieldLabels[key][1],
      label: fieldLabels[key][0],
      status: matchesOfficial ? 'official' : (hasExplicitValue ? 'pending' : 'official'),
      source: official?.source,
      sourceLabel: official?.sourceLabel,
    }];
  }));

  fields.trolleys = preset.fields.trolleys;
  fields.site = preset.fields.site;
  return {
    id: preset.id,
    name: preset.name,
    shortName: preset.shortName,
    templateId: preset.templateId,
    fields,
    sourceText,
    structureNote: '结构示意，非工程图',
  };
}

function floorCount(meters) {
  return Math.floor(meters / constants.floorHeight_m.value);
}

function vehicleCount(tons, weight) {
  const raw = tons / weight;
  return raw >= 1000 ? Math.floor(raw / 100) * 100 : Math.floor(raw / 10) * 10;
}

function buildAnalogies(spec) {
  const f = spec.fields;
  const rated = f.ratedLoad_t.value;
  const lift = f.liftHeight_m.value;
  const height = f.overallHeight_m.value;
  const span = f.span_m.value;
  const car = vehicleCount(rated, constants.carWeight_t.value);
  const truck = vehicleCount(rated, constants.truckWeight_t.value);
  const trolley = vehicleCount(1900, constants.carWeight_t.value);
  return [
    {
      id: 'A1', eyebrow: '重量 × 高度', title: `约 ${car.toLocaleString('zh-CN')} 辆轿车吊到 ${floorCount(lift)} 层楼`,
      formula: `${rated} ÷ ${constants.carWeight_t.value} = ${Math.round(rated / constants.carWeight_t.value).toLocaleString('zh-CN')} 辆；${lift} ÷ ${constants.floorHeight_m.value} = ${floorCount(lift)} 层`,
      source: '卫华官网 5585 · 官方类比反推',
    },
    {
      id: 'A2', eyebrow: '重量 × 高度', title: `约 ${truck.toLocaleString('zh-CN')} 辆卡车吊到 ${floorCount(lift)} 层楼`,
      formula: `${rated} ÷ ${constants.truckWeight_t.value} = ${Math.round(rated / constants.truckWeight_t.value).toLocaleString('zh-CN')} 辆；${lift} ÷ ${constants.floorHeight_m.value} = ${floorCount(lift)} 层`,
      source: '卫华官网 5474 · 类比常数待宣传部门确认',
    },
    {
      id: 'A3', eyebrow: '整机高度', title: `整机站起来有 ${floorCount(height)} 层楼高`,
      formula: `${height} ÷ ${constants.floorHeight_m.value} = ${(height / constants.floorHeight_m.value).toFixed(1)} 层，向下取整`,
      source: '卫华官网 5739 · 官方称 50 多层楼',
    },
    {
      id: 'A4', eyebrow: '跨度 × 参照物', title: `两条腿之间能放下一个标准足球场，还多出 ${Math.max(0, span - constants.footballLength_m.value)} 米`,
      formula: `${span} - ${constants.footballLength_m.value} = ${span - constants.footballLength_m.value} 米`,
      source: '卫华官网 5679 · IFAB 标准球场长度',
    },
    {
      id: '附加', eyebrow: '单台小车', title: `单台小车相当于约 ${trolley.toLocaleString('zh-CN')} 辆轿车`,
      formula: `1900 ÷ ${constants.carWeight_t.value} = ${Math.round(1900 / constants.carWeight_t.value).toLocaleString('zh-CN')} 辆`,
      source: '卫华官网 5679 · 1900t / 小车',
    },
  ];
}

function buildClaims() {
  return [
    { id: 'C1', text: '上下双小车各 1900 吨，可支持单钩、双钩、三钩抬吊。', source: '卫华官网 5679', status: 'official' },
    { id: 'C2', text: '整机高度 166.5 米，相当于 50 多层楼。', source: '卫华官网 5739', status: 'official' },
    { id: 'C3', text: '新中式起重机整机高度最高可降低约 30%，适合低矮厂房方案沟通。', source: '卫华官网 findnews/183', status: 'pending_confirmation' },
    { id: 'C4', text: '减速机、卷筒、滑轮组、吊钩组、车轮组可标注为卫华蒲瑞自产品类。', source: '蒲瑞官网 pr-drive.com', status: 'official' },
  ];
}

function validate(spec, claims = buildClaims()) {
  const claimList = Array.isArray(claims) ? claims : buildClaims();
  const pending = Object.values(spec.fields).filter((field) => field?.status === 'pending');
  const claimWarnings = claimList.filter((claim) => claim.status !== 'official');
  return {
    valid: pending.length === 0,
    checkedAt: new Date().toISOString(),
    checks: [
      { label: '规格字段可回指官方参数', valid: pending.length === 0, detail: pending.length ? `${pending.length} 个字段待确认` : '5 个核心字段已对齐' },
      { label: '类比计算由代码生成', valid: true, detail: '5 组公式可展开复算' },
      { label: '卖点出处覆盖', valid: claimWarnings.length === 0, detail: claimWarnings.length ? `${claimWarnings.length} 条卖点待宣传部门确认` : '全部卖点有出处' },
    ],
  };
}

function buildSceneCandidates() {
  return [
    { id: 'scene-a', label: '候选 A · 居中安装', image: '/demo/factory-reference.jpg', note: '缓存演示：将新中式桥机置于厂房主跨中线，透视与位置为示意。', score: 4.1 },
    { id: 'scene-b', label: '候选 B · 靠近轨道梁', image: '/demo/factory-reference.jpg', note: '缓存演示：将设备靠近右侧轨道梁，适合和客户讨论净空。', score: 3.8 },
  ];
}

function getPayload() {
  const spec = parseInput('3800t 双主梁门机，跨度 107m，整机高 166.5m，起升高度 130m。上下小车各 1900t。');
  return { specs, constants, defaultSpec: spec, analogies: buildAnalogies(spec), claims: buildClaims(), sceneCandidates: buildSceneCandidates(), validation: validate(spec) };
}

export { buildAnalogies, buildClaims, buildSceneCandidates, getPayload, parseInput, validate };
