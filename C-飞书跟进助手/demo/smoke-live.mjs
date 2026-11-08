// Explicit opt-in end-to-end check against the running Demo and current Feishu identity.
// Writes only the Demo's fictitious data; does not send messages to any group or customer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from '../src/store.mjs';
import { addDays } from '../src/domain.mjs';
import { cli } from '../src/feishu.mjs';

if(!process.argv.includes('--run'))throw new Error('真实写入演示数据需显式运行：node demo/smoke-live.mjs --run');
const origin=`http://127.0.0.1:${process.env.PORT||4183}`;
async function api(p,b,method='POST'){const r=await fetch(origin+p,b===undefined?undefined:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}
const checks=[];
const check=(name,details)=>{checks.push({name,pass:true,details});console.log('PASS',name,JSON.stringify(details));};
const start=await api('/api/state'),project=start.customers[0].id;
const draft=await api('/api/digest',{project,text:start.sample});
const before=start.customers[0].followups.length;
assert.equal((await api('/api/state')).customers[0].followups.length,before);
await api(`/api/drafts/${draft.id}/confirm`,{});await api(`/api/drafts/${draft.id}/confirm`,{});
assert.equal((await api('/api/state')).customers[0].followups.length,before+1);
check('中英文摘要：确认前不回填，重复确认只追加一次',{demands:draft.demands.length,concerns:draft.concerns.length,todos:draft.todos.length});
const edited=await api('/api/nodes/node-1',{expected:addDays(start.today,5)},'PATCH');
assert.equal(edited.level,'红');assert.match(edited.reason,/主梁组焊/);
check('修改供应商预计到货日期：等级与下游影响重算',{level:edited.level,reason:edited.reason});
const risk=await api('/api/risks/detect',{project,owner:'赵强（演示测试）',text:'【MVP实测】客户第二笔款还没到，财务说不能排发货'});
const riskBefore=(await api('/api/state')).risks.filter(x=>x.draftId===risk.id).length;
await api(`/api/drafts/${risk.id}/confirm`,{level:'橙'});await api(`/api/drafts/${risk.id}/confirm`,{level:'橙'});
assert.equal((await api('/api/state')).risks.filter(x=>x.draftId===risk.id).length,Math.max(1,riskBefore));
check('文字风险：人工确认入库且重复确认不重复登记',{category:risk.category});
await api('/api/scan',{});const scan=await api('/api/scan',{});assert.equal(scan.changed.length,0);
check('重复扫描不重复提醒',{scanned:scan.scanned,newNotifications:scan.changed.length});
const report=await api('/api/reports',{month:start.today.slice(0,7)});
assert.equal(report.total,45);assert.equal(report.won,15);assert.equal(report.lost,27);assert.equal(report.paused,3);assert.equal(report.winRate,35.7);
check('月报数字与手算一致',{total:report.total,won:report.won,lost:report.lost,paused:report.paused,winRate:report.winRate});
const evaluated=await api('/api/evals');assert.equal(evaluated.passed,evaluated.total);
check('已有样例评测',{passed:evaluated.passed,total:evaluated.total});
const sync=await api('/api/feishu/sync',{});
check('飞书四表真实写入并逐字段读回',{url:sync.url,counts:sync.counts});
const sync2=await api('/api/feishu/sync',{});assert.deepEqual(sync2.counts,sync.counts);
check('飞书重复同步：同本地ID更新，不新增重复记录',sync2.counts);
const doc=await api(`/api/reports/${report.id}/feishu`,{});
const fetched=await cli(['docs','+fetch','--as','user','--doc',doc.feishuUrl,'--doc-format','markdown']);
const content=JSON.stringify(fetched);assert.match(content,/35\.7/);assert.match(content,/45/);assert.match(content,/27/);
check('飞书月报真实创建并读回统计数字',{url:doc.feishuUrl});
const evidence={time:new Date().toISOString(),origin,checks,baseUrl:sync.url,documentUrl:doc.feishuUrl,browserManual:'未完成：电脑工具无法可靠确认 Windows 浏览器 URL，已中止 UI 自动化。DOM 集成测试另行通过。'};
fs.writeFileSync(path.join(root,'demo/live-test-results.json'),JSON.stringify(evidence,null,2));
console.log('RESULT',JSON.stringify({passed:checks.length,base:sync.url,report:doc.feishuUrl}));
