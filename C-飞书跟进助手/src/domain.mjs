export const levels = {正常:0, 黄:1, 橙:2, 红:3};
export const todayISO = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const addDays = (date,n) => new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s; }
export function evaluateNode(n,today=todayISO(),all=[]) {
  if (['已完成','已取消'].includes(n.status)||n.actual) return {level:'正常',reason:'已完成或已到货',days:0};
  if (!validDate(n.due)) return {level:'黄',reason:'节点没有计划日期',days:null};
  const left=Math.round((Date.parse(n.due)-Date.parse(today))/86400000);
  let level='正常',reason='按计划推进';
  if(n.type==='采购到货') {
    const target=validDate(n.expected)&&n.expected>today?n.expected:today;
    const delay=Math.round((Date.parse(target)-Date.parse(n.due))/86400000);
    if(delay>0) {level=delay>7?'红':delay>3?'橙':'黄'; reason=`到货延迟 ${delay} 天${n.expected?'（按供应商预计日期）':''}`;}
    else if(left<=3&&!n.expected) {level='黄';reason=`还剩 ${left} 天，未确认到货`;}
    if(levels[level]>=2) {
      const impacted=all.filter(x=>x.project===n.project&&x.type==='生产'&&!['已完成','已取消'].includes(x.status)&&x.due&&x.due<target);
      if(impacted.length)reason+='；可能影响生产节点：'+impacted.map(x=>`${x.name}（计划 ${x.due}）`).join('、');
    }
  } else if(left<0) {level=n.type==='投标截止'||left < -7?'红':left < -3?'橙':'黄';reason=n.type==='投标截止'?'投标截止已过，未标记完成':`已逾期 ${-left} 天`;}
  else if(left===0&&['投标截止','报价截止'].includes(n.type)) {level='橙';reason='今天截止';}
  else if(left<=({投标截止:3,报价截止:2,客户反馈:1,非标确认:1,生产:5,发货:5}[n.type]??1)) {level='黄';reason=`还剩 ${left} 天`;}
  return {level,reason,days:left};
}

export const categoryNames={PRICE:'价格',COMPETITOR:'竞品拿下',BUDGET_CANCEL:'客户预算取消',SCHEDULE:'工期不匹配',REQ_CHANGE:'客户需求变更',QUALIFICATION:'资质问题',TECH:'技术不满足',COMMERCIAL:'商务条款',RELATIONSHIP:'关系 / 渠道',PAUSED:'暂停（非丢单）',UNKNOWN:'信息不足'};
const lossPatterns=[
 ['COMPETITOR',/选了|选择了.*供应商|竞品.*(?:中标|拿下)|被.*拿走|lost to|chose.*supplier/i],
 ['BUDGET_CANCEL',/取消|砍了|不投了|冻结|资金没批|cancel/i],
 ['QUALIFICATION',/资质|认证|证书|业绩|当地注册|准入|名录|\bCE\b|\bISO\b/i],
 ['SCHEDULE',/交期|工期|\d+\s*天到货|排产.*天|来不及|lead time|delivery.*(?:late|long)/i],
 ['TECH',/达不到|做不了|技术.*不满足|参数.*不符/i],
 ['REQ_CHANGE',/改成|需求变更|方案.*改|规格.*改/i],
 ['COMMERCIAL',/付款|质保|罚则|商务.*谈不拢|payment|warranty/i],
 ['RELATIONSHIP',/内定|代理.*换|决策链|关系/i],
 ['PRICE',/贵|价格|报价.*(?:低|高)|price|higher|cheaper/i],
 ['PAUSED',/明年|再说|推迟|延后|再启动|paused|postpone/i]
];
export function classifyLoss(text='') {
  const evidence=text.trim();
  const hits=lossPatterns.filter(([,p])=>p.test(evidence)).map(([k])=>k);
  const primary=hits[0]||'UNKNOWN';
  return {primary,label:categoryNames[primary],secondary:hits.slice(1,3),evidence,confidence:primary==='UNKNOWN'?1:0.8,method:'规则',needsReview:primary==='UNKNOWN'||hits.length>1};
}

function sourceLines(text) {
 return text.split(/\r?\n/).map((raw,i)=>({quote:raw.trim(),line:i+1,id:`L${i+1}`})).filter(x=>x.quote);
}
export function digest(text) {
  const lines=sourceLines(text);
  const demands=[],concerns=[],todos=[];
  for(const line of lines) {
    const q=line.quote;
    if(/need|require|需求|需要|要求|跨度|起升|付款|advance|commissioning|delivery/i.test(q))demands.push({...line,text:q});
    if(/higher|price.*high|others|lower|not only|担心|顾虑|太贵|贵了|延期|不能|风险|不满意/i.test(q))concerns.push({...line,text:q});
    if(/will send|send.*(?:by|before)|please send|回复|确认.*后|待办|提交|发送|跟进|安排|尽快/i.test(q)) {
      const explicit=q.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      const speaker=q.match(/-\s*([^:]+):/)?.[1] || q.match(/^([^:：]{1,40})[:：]/)?.[1] || null;
      const owner=/please send|请.*(?:发送|提交|回复)|客户[:：]|\bclient\b/i.test(q)?null:speaker;
      todos.push({...line,text:q,owner,due:explicit&&validDate(explicit[1])?explicit[1]:null});
    }
  }
  const numbers=[...new Set(text.match(/\d+(?:[.,]\d+)?\s*(?:%|t\b|m\b|吨|米|天|台|万|年|月|日)/gi)||[])];
  return {summary:(demands[0]?.quote||lines[0]?.quote||'').slice(0,150),demands,concerns,todos,numbers,mode:'原文抽取',warnings:['相对日期与未明确的负责人需人工补齐；原文摘录保留，不推测业务事实。'],lines};
}
export function captureRisk(text='') {
  const quiet=/周会|会议|聚餐|例会|meeting/i.test(text)&&!/(发货|采购|交付|客户|验收|付款|shipment)/i.test(text);
  const issue=/延期|延迟|推迟|缺件|没到货|还没到|没到|变更|改成|重出|返工|投诉|罚款|不满意|不能|卡住|来不及|下周才能发|delay|postpone|penalty/i.test(text);
  const isRisk=issue&&!quiet;
  const category=/款|付款|财务|payment/i.test(text)?'商务/回款':/厂家|采购|缺件|到货|减速机|supplier/i.test(text)?'采购到货':/客户|验收|图纸|需求/i.test(text)?'客户需求':'项目进度';
  return {isRisk,description:text,quote:text,category,level:'黄',reason:isRisk?'命中项目风险线索，请提交人确认':'未检测到项目风险线索',method:'关键词规则'};
}
export function monthlyReport(sales,month) {
 const rows=sales.filter(x=>x.month===month);
 const won=rows.filter(x=>x.result==='成交').length,lost=rows.filter(x=>x.result==='丢单').length,paused=rows.filter(x=>x.result==='暂停').length;
 const reasons={},regions={};
 for(const x of rows.filter(x=>x.result==='丢单')) {const label=classifyLoss(x.note).label;reasons[label]=(reasons[label]||0)+1;regions[x.region]=(regions[x.region]||0)+1;}
 return {month,total:rows.length,won,lost,paused,winRate:won+lost?Math.round(won/(won+lost)*1000)/10:0,reasons:Object.entries(reasons).sort((a,b)=>b[1]-a[1]),regions:Object.entries(regions).sort((a,b)=>b[1]-a[1]),rows};
}
export function reportMarkdown(r) {
 return `# ${r.month} 成交与丢单分析（演示初稿）\n\n> 全部为虚构演示数据。统计由代码计算；暂停不进入成单率分母。\n\n## 1. 本月概览\n\n共 ${r.total} 条，成交 ${r.won} 条，丢单 ${r.lost} 条，暂停 ${r.paused} 条。\n\n## 2. 成单率\n\n${r.winRate}% = ${r.won} ÷ (${r.won} + ${r.lost})。\n\n## 3. 丢单原因\n\n${r.reasons.map(([k,v])=>`- ${k}：${v} 条`).join('\n')||'无丢单记录'}\n\n## 4. 区域分布\n\n${r.regions.map(([k,v])=>`- ${k}：${v} 条（占丢单 ${r.lost?Math.round(v/r.lost*1000)/10:0}%）`).join('\n')||'无数据'}\n\n## 5. 待复核事项\n\n${r.rows.filter(x=>x.result==='丢单'&&classifyLoss(x.note).needsReview).map(x=>`- ${x.id} / ${x.project}：${classifyLoss(x.note).label}，原文：${x.note}`).join('\n')||'无'}\n\n## 6. 记录依据\n\n${r.rows.map(x=>`- ${x.id} / ${x.project} / ${x.region} / ${x.result}：${x.note||'已成交'}`).join('\n')}\n`;
}
