import crypto from 'node:crypto';

export const RULES_VERSION = 'QT-RULES v0.3-demo';
export const MODEL_MODE = '本地规则演示';

const LABELS = ['标配', '非标', '模糊', '不满足', '可偏离'];

const baseEvidence = (clause, sourceId, sourceTitle, extra = {}) => [
  { type: '协议原文', locator: `${clause.clause_no || '通用'} · ${clause.quote}`, page: clause.page },
  { type: '依据条目', locator: sourceId, title: sourceTitle },
  ...(extra.evidence || []),
];

function auditId(prefix = 'Q') {
  return `${prefix}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

function clauseId(index) {
  return `C-${String(index + 1).padStart(2, '0')}`;
}

function splitClauses(text) {
  return text
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter(({ raw }) => raw.length > 0)
    .map(({ raw, line }, index) => {
      const match = raw.match(/^(\d+(?:\.\d+)*)\s*([^:：]+)[:：]\s*(.+)$/);
      const clauseNo = match?.[1] || `通用-${index + 1}`;
      const title = match?.[2]?.trim() || '协议内容';
      const quote = match?.[3]?.trim() || raw;
      return { id: clauseId(index), clause_no: clauseNo, title, quote, raw, line, page: Math.max(1, Math.ceil(line / 18)) };
    });
}

export function redactText(text) {
  const mapping = [];
  let result = String(text || '');
  const replacements = [
    { regex: /(联系人\s*[:：]\s*)[\u4e00-\u9fa5]{2,6}/g, token: '<联系人>' },
    { regex: /1[3-9]\d{9}/g, token: '<手机号>' },
    { regex: /(合同金额\s*[:：]?\s*)(?:人民币\s*)?[\d,]+(?:\.\d+)?\s*(?:元|万元)/g, token: '$1<金额>' },
  ];
  for (const { regex, token } of replacements) {
    result = result.replace(regex, (...args) => {
      const match = args[0];
      mapping.push({ original: match, replacement: typeof token === 'string' && token.includes('$1') ? match.replace(regex, token) : token });
      return typeof token === 'string' && token.includes('$1') ? match.replace(regex, token) : token;
    });
  }
  return { text: result, mapping };
}

function makeJudgement({ clause, category, label, reason, ruleIds, sourceId, sourceTitle, surchargeRefs = [], reviewHints = [], missingFields = [] }) {
  const confidence = label === '标配' ? 0.96 : label === '模糊' ? 0.7 : 0.93;
  return {
    id: `J-${clause.id}-${category}-${ruleIds[0]}`,
    clause_id: clause.id,
    clause_no: clause.clause_no,
    category,
    quote: clause.quote,
    label_final: label,
    label_rule: label,
    label_llm: reviewHints.length ? '可偏离' : label,
    reason,
    rule_ids: ruleIds,
    surcharge_refs: surchargeRefs,
    missing_fields: missingFields,
    review_hints: reviewHints,
    review_status: 'pending',
    verified: true,
    claim: {
      text: reason,
      confidence,
      evidence: baseEvidence(clause, sourceId, sourceTitle),
    },
  };
}

function evaluateClause(clause) {
  const text = clause.raw;
  const judgements = [];

  if (/QD\s*\d+\s*\/\s*\d+t?[^\n]*\bA8\b/i.test(text)) {
    judgements.push(makeJudgement({
      clause, category: '整机 / 型号', label: '不满足', ruleIds: ['MDL-02'],
      reason: '工作级别 A8 超出当前模拟标配范围 A3/A5/A6/A7，需技术确认后再报价。',
      sourceId: 'STD-MDL-001', sourceTitle: '桥式起重机标配范围：工作级别 A3/A5/A6/A7',
    }));
  } else if (/QD\s*\d+\s*\/\s*\d+t?/i.test(text)) {
    judgements.push(makeJudgement({
      clause, category: '整机 / 型号', label: '标配', ruleIds: ['MDL-OK-01'],
      reason: '型号规格字段完整，当前演示规则未发现超出标配范围的参数。',
      sourceId: 'STD-MDL-001', sourceTitle: '桥式起重机型号与参数范围（模拟）',
    }));
  }

  if (/涂装|底漆|面漆|干膜|防腐|RAL/i.test(text)) {
    const rules = [];
    const reasons = [];
    if (/面漆\s*3\s*遍|面漆三遍/.test(text)) { rules.push('PNT-01'); reasons.push('面漆 3 遍高于标配 2 遍'); }
    const dft = text.match(/(\d{2,4})\s*[μuµ]?m/i);
    if (dft && Number(dft[1]) > 160) { rules.push('PNT-02'); reasons.push(`总干膜厚 ${dft[1]}μm 高于标配 160μm`); }
    if (rules.length) {
      judgements.push(makeJudgement({
        clause, category: '油漆', label: '非标', ruleIds: rules,
        reason: `${reasons.join('，')}，属于非标加价点。`,
        sourceId: 'STD-PNT-001', sourceTitle: '油漆标配：面漆 2 遍、总干膜厚 160μm',
        surchargeRefs: ['SC-PNT-02@v2'],
      }));
    }
    if (/RAL\s*\d+/i.test(text)) {
      judgements.push(makeJudgement({
        clause, category: '油漆', label: '可偏离', ruleIds: ['PNT-04'],
        reason: '协议指定 RAL 颜色，属于可申报偏离项；报价按标配颜色并在偏离表说明。',
        sourceId: 'STD-PNT-001', sourceTitle: '油漆颜色可偏离规则（模拟）',
      }));
    }
  }

  if (/减速机|SEW|弗兰德|硬齿面/i.test(text)) {
    if (/SEW|弗兰德|进口/i.test(text)) {
      judgements.push(makeJudgement({
        clause, category: '减速机', label: '非标', ruleIds: ['GBX-01', ...( /同等|相当于/.test(text) ? ['GBX-03'] : []) ],
        reason: '协议指定 SEW/进口品牌，模拟标配为蒲瑞 H 系列，属于非标加价点。',
        sourceId: 'STD-GBX-001', sourceTitle: '减速机标配：蒲瑞 H 系列硬齿面',
        surchargeRefs: ['SC-GBX-01@v2'],
        reviewHints: /同等|相当于/.test(text) ? ['客户同时写了“或同等品牌”，报价员需确认替代品牌是否被接受。'] : [],
      }));
    } else {
      judgements.push(makeJudgement({
        clause, category: '减速机', label: /同等|相当于/.test(text) ? '模糊' : '标配',
        ruleIds: /同等|相当于/.test(text) ? ['GBX-03'] : ['GBX-OK-01'],
        reason: /同等|相当于/.test(text) ? '出现“同等品牌”但未定义认定标准，需澄清。' : '减速机要求与当前模拟标配一致。',
        sourceId: 'STD-GBX-001', sourceTitle: '减速机标配与同等品牌认定说明',
      }));
    }
  }

  if (/电机|IP\d+|绝缘等级|ABB|西门子/i.test(text)) {
    const rules = [];
    if (/ABB|西门子/i.test(text)) rules.push('MOT-03');
    if (/IP(?:55|65)/i.test(text)) rules.push('MOT-01');
    if (/绝缘等级\s*H/i.test(text)) rules.push('MOT-02');
    if (rules.length) {
      judgements.push(makeJudgement({
        clause, category: '电机', label: '非标', ruleIds: rules,
        reason: '电机品牌或防护等级超出当前模拟标配清单，属于非标配置。',
        sourceId: 'STD-MOT-001', sourceTitle: '电机标配：国产变频电机、IP54、绝缘等级 F',
        surchargeRefs: ['SC-MOT-03@v2'],
      }));
    } else {
      judgements.push(makeJudgement({
        clause, category: '电机', label: '标配', ruleIds: ['MOT-OK-01'],
        reason: '电机关键参数落在当前模拟标配范围内。',
        sourceId: 'STD-MOT-001', sourceTitle: '电机标配范围（模拟）',
      }));
    }
  }

  if (/甲方满意|动载试验|静载试验|第三方检验|CE|验收/i.test(text)) {
    if (/甲方满意|动载试验\s*(?:按)?\s*1\.2|第三方检验|\bCE\b/i.test(text)) {
      judgements.push(makeJudgement({
        clause, category: '验收与认证', label: /甲方满意/.test(text) ? '不满足' : '非标',
        ruleIds: /甲方满意/.test(text) ? ['ACC-03'] : ['ACC-01'],
        reason: /甲方满意/.test(text) ? '“甲方满意为准”缺少可验证验收标准，不能直接按标配承诺。' : '验收试验倍数高于当前模拟标配，需核实试验成本与责任边界。',
        sourceId: 'STD-ACC-001', sourceTitle: '验收与认证标配规则（模拟）',
        surchargeRefs: /甲方满意/.test(text) ? [] : ['SC-ACC-01@v2'],
      }));
    }
  }

  if (/优质|知名品牌|先进|满足使用要求|按甲方要求/.test(text) && !judgements.length) {
    judgements.push(makeJudgement({
      clause, category: '通用配套', label: '模糊', ruleIds: ['FZY-01'],
      reason: '条款使用模糊描述但缺少可验收参数，依据不足，需人工澄清。',
      sourceId: 'KB-FZY-001', sourceTitle: '模糊词与缺参处理规则',
    }));
  }

  return judgements;
}

function evaluateRisks(clauses) {
  const risks = [];
  for (const clause of clauses) {
    const text = clause.raw;
    const rate = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:[/／]?\s*天|支付|违约)/);
    if (/延期|违约金|罚款/.test(text) && rate && Number(rate[1]) > 0.5) {
      risks.push({
        id: `R-${clause.id}-RSK-01`, clause_id: clause.id, clause_no: clause.clause_no,
        type: '延期罚则', level: '高', rule_id: 'RSK-01', facts: { penalty_rate: `${rate[1]}%/天`, cap: /上限|累计/.test(text) ? '未明确' : '未明确' },
        quote: clause.quote, explain: `延期罚款 ${rate[1]}%/天，高于模拟阈值 0.5%/天，且未看到累计上限。`,
        suggested_reply: '建议偏离：0.5%/天，累计不超过合同总价 5%。',
      });
    }
    const warranty = text.match(/质保期[^\d]*(\d+)\s*个月/);
    if (warranty && Number(warranty[1]) > 24) {
      risks.push({
        id: `R-${clause.id}-RSK-03`, clause_id: clause.id, clause_no: clause.clause_no,
        type: '质保期', level: Number(warranty[1]) > 36 ? '高' : '中', rule_id: 'RSK-03', facts: { warranty_months: Number(warranty[1]) },
        quote: clause.quote, explain: `质保期 ${warranty[1]} 个月，高于模拟标配 24 个月。`,
        suggested_reply: '建议按 24 个月执行，起算时间与终验节点写入应答。',
      });
    }
    if (/甲方满意|一次验收不合格即可退货|无条件退换货/.test(text)) {
      risks.push({
        id: `R-${clause.id}-RSK-05`, clause_id: clause.id, clause_no: clause.clause_no,
        type: '验收 / 退换货', level: '高', rule_id: 'RSK-05', facts: {}, quote: clause.quote,
        explain: '验收标准主观或带有退换货触发条件，需在报价前澄清。',
        suggested_reply: '建议补充可量化验收标准，并删除无条件退换货表述。',
      });
    }
  }
  return risks;
}

export function analyzeQuote({ filename = '未命名协议.txt', text = '' }) {
  const redacted = redactText(text).text;
  const clauses = splitClauses(redacted);
  const judgements = clauses.flatMap(evaluateClause);
  const risks = evaluateRisks(clauses);
  const count = Object.fromEntries(LABELS.map((label) => [label, judgements.filter((item) => item.label_final === label).length]));
  return {
    task_id: `QT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(2).toString('hex')}`.toUpperCase(),
    filename,
    model_mode: MODEL_MODE,
    rules_version: RULES_VERSION,
    audit_id: auditId(),
    masked_text: redacted,
    clauses,
    judgements,
    risks,
    counts: count,
    knowledge: [],
    review_log: [],
    created_at: new Date().toISOString(),
  };
}

export function buildKnowledgeEntry(reviewed) {
  const { judgement, review } = reviewed;
  return {
    id: `KB-QT-${crypto.randomBytes(3).toString('hex')}`.toUpperCase(),
    version: 1,
    status: '待组长审核',
    category: judgement.category,
    clause_pattern: { keywords: judgement.quote.match(/[A-Za-z]{2,}|[\u4e00-\u9fa5]{2,}/g)?.slice(0, 5) || [] },
    clause_example: judgement.quote,
    judgement: judgement.label_final,
    reasoning: review.reason,
    quote_idea: review.quote_idea,
    evidence: judgement.claim.evidence.map((item) => item.locator),
    source: { type: '人工改判', review_record: review.audit_id, task: reviewed.task_id },
    author: review.reviewer,
    created_at: new Date().toISOString().slice(0, 10),
  };
}

export function reviewJudgement(analysis, input) {
  const judgement = analysis.judgements.find((item) => item.id === input.judgement_id);
  if (!judgement) throw new Error('找不到要改判的条款');
  if (!LABELS.includes(input.label)) throw new Error(`不支持的标签：${input.label}`);
  if (!input.reason?.trim()) throw new Error('改判理由不能为空');
  if (!input.quote_idea?.trim()) throw new Error('报价思路不能为空');
  const review = {
    audit_id: auditId('RV'),
    reviewer: input.reviewer || '报价员A',
    from: judgement.label_final,
    to: input.label,
    reason: input.reason.trim(),
    quote_idea: input.quote_idea.trim(),
    status: input.label === '可偏离' && judgement.label_final !== '可偏离' ? 'pending_leader' : 'approved_by_operator',
    created_at: new Date().toISOString(),
  };
  const nextJudgement = { ...judgement, label_final: input.label, review_status: review.status, manual_reason: review.reason };
  const nextAnalysis = { ...analysis, judgements: analysis.judgements.map((item) => item.id === judgement.id ? nextJudgement : item) };
  const result = { task_id: analysis.task_id, judgement: nextJudgement, review, knowledge: null };
  result.knowledge = buildKnowledgeEntry(result);
  nextAnalysis.review_log = [...analysis.review_log, review];
  nextAnalysis.knowledge = [...analysis.knowledge, result.knowledge];
  result.analysis = nextAnalysis;
  return result;
}

export function createQuoteResult(analysis) {
  return {
    type: 'QuoteResult', version: '0.1', task_id: analysis.task_id, filename: analysis.filename,
    summary: { ...analysis.counts, risk_count: analysis.risks.length },
    parameters: analysis.clauses.filter((clause) => /QD|起重|跨度|工作级别/.test(clause.raw)).map((clause) => ({ clause_no: clause.clause_no, text: clause.quote })),
    nonstandard_items: analysis.judgements.filter((item) => ['非标', '不满足', '可偏离'].includes(item.label_final)).map((item) => ({ clause_no: item.clause_no, category: item.category, label: item.label_final, reason: item.reason })),
    risks: analysis.risks.map(({ id, clause_no, type, level, explain }) => ({ id, clause_no, type, level, explain })),
    knowledge_ids: analysis.knowledge.map((entry) => entry.id),
    audit_id: analysis.audit_id,
  };
}

export { splitClauses, evaluateRisks };
