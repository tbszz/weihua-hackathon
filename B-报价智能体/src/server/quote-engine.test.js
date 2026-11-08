import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeQuote,
  buildKnowledgeEntry,
  redactText,
  reviewJudgement,
} from './quote-engine.js';

const sample = `
项目名称：华北钢厂 32/10t 桥式起重机
联系人：张工，电话 13812345678，合同金额 1,280,000 元。
1.2 型号规格：QD 32/10t-28.5m A8，室内使用。
3.2 整机涂装：环氧富锌底漆 2 遍，聚氨酯面漆 3 遍，总干膜厚不小于 240μm，颜色 RAL1003。
3.4 减速机：采用 SEW 或同等品牌，硬齿面。
4.1 起升电机：采用 ABB 品牌，防护等级 IP55，绝缘等级 F。
5.2 验收：甲方满意为准，动载试验按 1.2 倍额定载荷执行。
12.3 交付：每延期一天按合同总价 1% 支付违约金，未设累计上限；质保期自终验合格起 36 个月。
`;

test('redacts personal data and contract amount while keeping engineering values', () => {
  const result = redactText(sample);
  assert.match(result.text, /<联系人>/);
  assert.match(result.text, /<手机号>/);
  assert.match(result.text, /<金额>/);
  assert.match(result.text, /28\.5m A8/);
  assert.doesNotMatch(result.text, /13812345678/);
});

test('analyzes a protocol into five labels, risks, and traceable evidence', () => {
  const result = analyzeQuote({ filename: 'demo.txt', text: sample });
  assert.equal(result.model_mode, '本地规则演示');
  assert.ok(result.judgements.some((item) => item.label_final === '不满足' && item.rule_ids.includes('MDL-02')));
  assert.ok(result.judgements.some((item) => item.label_final === '非标' && item.rule_ids.includes('PNT-01')));
  assert.ok(result.judgements.some((item) => item.label_final === '非标' && item.rule_ids.includes('GBX-03') && item.review_hints.length));
  assert.ok(result.judgements.some((item) => item.label_final === '可偏离' && item.category === '油漆'));
  assert.ok(result.risks.some((item) => item.rule_id === 'RSK-01' && item.level === '高'));
  assert.ok(result.judgements.every((item) => item.claim.evidence.length >= 2));
});

test('review creates an auditable knowledge entry from a judgement', () => {
  const analysis = analyzeQuote({ filename: 'demo.txt', text: sample });
  const target = analysis.judgements.find((item) => item.rule_ids.includes('GBX-03'));
  const reviewed = reviewJudgement(analysis, {
    judgement_id: target.id,
    label: '可偏离',
    reason: '客户写了“或同等品牌”，本次按蒲瑞同等品牌申报偏离。',
    quote_idea: '按蒲瑞 H 系列报价，偏离表说明品牌替代，保留 SEW 备选加价。',
    reviewer: '报价员A',
  });
  assert.equal(reviewed.judgement.label_final, '可偏离');
  assert.equal(reviewed.review.status, 'pending_leader');
  assert.equal(reviewed.knowledge.status, '待组长审核');
  assert.match(reviewed.review.audit_id, /^RV-/);
  assert.ok(reviewed.knowledge.evidence.includes('STD-GBX-001'));
});

test('approved knowledge entry can be generated from the review result', () => {
  const analysis = analyzeQuote({ filename: 'demo.txt', text: sample });
  const target = analysis.judgements.find((item) => item.category === '减速机');
  const reviewed = reviewJudgement(analysis, {
    judgement_id: target.id,
    label: '可偏离',
    reason: '同等品牌条款允许报价员申报蒲瑞替代。',
    quote_idea: '按标配报价，偏离表说明品牌替代。',
    reviewer: '报价员A',
  });
  const entry = buildKnowledgeEntry(reviewed);
  assert.equal(entry.status, '待组长审核');
  assert.equal(entry.category, '减速机');
  assert.equal(entry.source.type, '人工改判');
});
