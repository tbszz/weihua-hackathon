import { analyzeQuote, redactText, RULES_VERSION } from './quote-engine.js';

const labelCases = [
  { name: 'A8 工作级别', text: '1.2 型号规格：QD 32/10t-28.5m A8', expected: '不满足' },
  { name: 'A6 常规型号', text: '1.2 型号规格：QD 32/10t-28.5m A6', expected: '标配' },
  { name: '面漆超出标配', text: '3.2 涂装：面漆 3 遍，总干膜厚 240μm。', expected: '非标' },
  { name: '指定颜色', text: '3.2 涂装：颜色 RAL1003。', expected: '可偏离' },
  { name: '指定减速机不能被同等品牌放宽', text: '3.4 减速机：SEW 或同等品牌，硬齿面。', expected: '非标' },
  { name: '模糊品牌认定', text: '3.4 减速机：同等品牌。', expected: '模糊' },
  { name: '进口电机与 IP55', text: '4.1 电机：ABB 品牌，IP55。', expected: '非标' },
];

export function runEvaluation() {
  const cases = labelCases.map(({ name, text, expected }) => {
    const actual = analyzeQuote({ text }).judgements.map((item) => item.label_final).join('、') || '未识别';
    return { name, expected, actual, passed: actual === expected };
  });
  for (const { name, text, expected } of [
    { name: '延期罚则风险', text: '12.3 交付：每延期一天按合同总价 1% 支付违约金。', expected: 'RSK-01' },
    { name: '36 个月质保风险', text: '12.4 质保：质保期 36 个月。', expected: 'RSK-03' },
    { name: '主观验收标准风险', text: '5.2 验收：甲方满意为准。', expected: 'RSK-05' },
  ]) {
    const actual = analyzeQuote({ text }).risks.map((item) => item.rule_id).join('、') || '未识别';
    cases.push({ name, expected, actual, passed: actual === expected });
  }
  const privacy = redactText('联系人：张工，电话 13812345678，合同金额 1,280,000 元，跨度 28.5m，延期罚款 1%/天。').text;
  const privacyPassed = !/13812345678|1,280,000|张工/.test(privacy) && privacy.includes('28.5m') && privacy.includes('1%/天');
  cases.push({ name: '敏感字段脱敏并保留工程数值', expected: '敏感字段隐藏，工程数值保留', actual: privacyPassed ? '敏感字段隐藏，工程数值保留' : '脱敏或数值保留失败', passed: privacyPassed });
  const passed = cases.filter((item) => item.passed).length;
  return {
    rules_version: RULES_VERSION, run_at: new Date().toISOString(), total: cases.length,
    passed, failed: cases.length - passed, cases,
    scope_note: '固定模拟条款的规则回归，覆盖五类标签、风险和脱敏；不代表真实协议准确率或召回率。',
  };
}
