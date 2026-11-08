import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateNode, classifyLoss, digest, captureRisk, monthlyReport, addDays } from '../src/domain.mjs';

const today = '2026-11-07';
for (const [delay, level] of [[0,'正常'],[1,'黄'],[3,'黄'],[4,'橙'],[7,'橙'],[8,'红']]) {
  test(`采购延迟 ${delay} 天 = ${level}`, () => {
    assert.equal(evaluateNode({type:'采购到货',due:addDays(today,-delay),expected:today,status:'进行中'},today).level,level);
  });
}
for (const [type, offset, level] of [['投标截止',-1,'红'],['投标截止',0,'橙'],['报价截止',0,'橙'],['客户反馈',-3,'黄'],['客户反馈',-4,'橙'],['客户反馈',-8,'红'],['生产',5,'黄'],['生产',6,'正常']]) {
  test(`${type} 相差 ${offset} 天 = ${level}`,()=>assert.equal(evaluateNode({type,due:addDays(today,offset)},today).level,level));
}
test('已完成、取消、已实际到货不发提醒',()=>{
  for(const extra of [{status:'已完成'},{status:'已取消'},{type:'采购到货',actual:today}]) assert.equal(evaluateNode({type:'投标截止',due:'2026-10-01',...extra},today).level,'正常');
});
test('无计划日期需补齐，不编造',()=>assert.equal(evaluateNode({type:'发货'},today).level,'黄'));
test('采购预计日期会计算下游生产影响',()=>{
 const n={project:'P1',type:'采购到货',due:'2026-11-01',expected:'2026-11-12'};
 assert.match(evaluateNode(n,today,[{project:'P1',name:'主梁组焊',type:'生产',due:'2026-11-09'}]).reason,/主梁组焊/);
});
test('信息不足不能强行分类',()=>assert.equal(classifyLoss('丢了').primary,'UNKNOWN'));
test('竞品赢标优先于价格，依据是原文',()=>{
 const text='客户最后选了竞品甲，对方报价比我们低 7% 左右'; const c=classifyLoss(text);
 assert.equal(c.primary,'COMPETITOR'); assert.ok(c.secondary.includes('PRICE')); assert.ok(text.includes(c.evidence));
});
test('会议延期不是项目风险',()=>assert.equal(captureRisk('下午的周会延期到四点').isRisk,false));
test('付款影响发货是风险',()=>assert.equal(captureRisk('客户第二笔款还没到，财务说不能排发货').isRisk,true));
test('摘要每条结论可以原文反查，未知日期不猜',()=>{
 const text='Client: We need 2 x 40t cranes.\nClient: Your price is higher than others.\nSales: We will send the offer next Tuesday.';
 const d=digest(text);
 assert.ok(d.demands.length); assert.ok(d.concerns.length); assert.ok(d.todos.length);
 for(const x of [...d.demands,...d.concerns,...d.todos]) assert.ok(text.includes(x.quote));
 assert.equal(d.todos[0].due,null);
});
test('月报按月份过滤，暂停不进入成单率分母',()=>{
 const r=monthlyReport([{id:'a',month:'2026-11',result:'成交',region:'中东'},{id:'b',month:'2026-11',result:'丢单',region:'中东',note:'丢了'},{id:'c',month:'2026-11',result:'暂停',region:'中东'},{id:'d',month:'2026-10',result:'成交'}],'2026-11');
 assert.equal(r.won,1); assert.equal(r.lost,1); assert.equal(r.paused,1); assert.equal(r.winRate,50); assert.equal(r.total,3);
});
