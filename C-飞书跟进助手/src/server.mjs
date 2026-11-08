import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, root, uid, csv } from './store.mjs';
import { digest, captureRisk, monthlyReport, reportMarkdown, todayISO, validDate, classifyLoss } from './domain.mjs';
import * as feishu from './feishu.mjs';

function fail(message,status=400) {throw Object.assign(new Error(message),{status});}
function nonempty(value,label,max=50000) {if(typeof value!=='string'||!value.trim())fail(`${label}不能为空`);if(value.length>max)fail(`${label}最多 ${max} 字符`);return value.trim();}
async function body(req) {let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>500000)fail('请求内容过大',413);}try{return JSON.parse(raw||'{}');}catch{fail('JSON 格式无效');}}
export function createApp(store=new Store(),options={}) {
 let flight=null;
 const server=http.createServer(async(req,res)=>{
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try {
   const host=req.headers.host;
   if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host||''))fail('只允许本地访问',403);
   if(req.headers.origin&&req.headers.origin!==`http://${host}`)fail('不允许跨站请求',403);
   const url=new URL(req.url,`http://${host}`),p=url.pathname,d=store.data;
   if(!p.startsWith('/api/')) {
    const allowed={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
    if(!allowed[p])return json({error:'页面不存在'},404);
    const type=p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html';
    res.writeHead(200,{'Content-Type':type+'; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"});return res.end(fs.readFileSync(path.join(root,'public',allowed[p])));
   }
   if(req.method==='GET'&&p==='/api/state')return json({...d,sample:fs.readFileSync(path.join(root,'data/chat-sample-01.txt'),'utf8'),today:todayISO(),mode:'原文抽取 + 确定性规则',serverTime:new Date().toISOString()});
   if(req.method==='GET'&&p==='/api/feishu/status')return json(await feishu.connectionStatus());
   if(req.method==='GET'&&p==='/api/evals') {
    const loss=csv(fs.readFileSync(path.join(root,'data/losses-sample.csv'),'utf8')).map(x=>({name:x.project_no,expected:x.expected_primary,actual:classifyLoss(x.loss_note).primary}));
    const risk=csv(fs.readFileSync(path.join(root,'data/risk-messages-sample.csv'),'utf8')).map(x=>({name:x.text,expected:x.is_risk==='1',actual:captureRisk(x.text).isRisk}));
    const cases=[...loss,...risk].map(x=>({...x,pass:x.expected===x.actual}));return json({cases,passed:cases.filter(x=>x.pass).length,total:cases.length,scope:'已有 8 条分类 + 6 条文字风险样例；不等同于 PRD 完整评测集'});
   }
   if(!['POST','PATCH'].includes(req.method))fail('接口不存在',404);
   const b=await body(req);
   const project=(id)=>{const c=d.customers.find(x=>x.id===id);if(!c)fail('请先选择已有客户/项目');return c;};
   if(p==='/api/digest') {
    const text=nonempty(b.text,'沟通内容'),customer=project(b.project);
    const draft={id:uid('draft'),kind:'digest',project:customer.id,text,status:'待确认',createdAt:new Date().toISOString(),...digest(text)};
    d.drafts.unshift(draft);store.log('生成沟通摘要',`${customer.name}；待确认，尚未回填`);return json(draft);
   }
   if(p==='/api/risks/detect') {
    const text=nonempty(b.text,'风险原文'),customer=project(b.project),owner=nonempty(b.owner,'提交人',100);
    const result=captureRisk(text);
    if(!result.isRisk){store.log('风险预筛','未发现风险线索');return json(result);}
    const existing=d.drafts.find(x=>x.kind==='risk'&&x.text===text&&x.project===customer.id);
    if(existing)return json(existing);
    const draft={...result,id:uid('draft'),kind:'risk',project:customer.id,text,owner,status:'待确认',createdAt:new Date().toISOString()};
    d.drafts.unshift(draft);store.log('生成风险草稿','未确认，不入风险登记');return json(draft);
   }
   const draftAction=p.match(/^\/api\/drafts\/([^/]+)\/(confirm|ignore)$/);
   if(draftAction) {
    const draft=d.drafts.find(x=>x.id===draftAction[1]);if(!draft)fail('草稿不存在',404);
    if(draft.status!=='待确认')return json(draft);
    if(draftAction[2]==='ignore'){draft.status='已忽略';store.log('忽略草稿',draft.id);return json(draft);}
    if(draft.kind==='digest') {
     const customer=project(draft.project);customer.followups.push({id:draft.id,time:new Date().toISOString(),summary:draft.summary,demands:draft.demands,concerns:draft.concerns,todos:draft.todos,source:draft.text});customer.lastFollowup=new Date().toISOString();
     for(const todo of draft.todos.filter(x=>x.due&&x.owner))d.nodes.push({id:uid('node'),project:customer.project,projectName:customer.name,name:todo.text,type:'客户反馈',owner:todo.owner,due:todo.due,expected:null,status:'未开始',draftId:draft.id});
    } else {
     const level=b.level||draft.level;if(!['黄','橙','红'].includes(level))fail('风险等级无效');
     d.risks.push({id:uid('risk'),draftId:draft.id,project:draft.project,description:draft.description,quote:draft.text,category:draft.category,level,owner:draft.owner,source:'文字录入',status:'已确认',createdAt:new Date().toISOString()});
    }
    draft.status='已确认';draft.confirmedAt=new Date().toISOString();store.log('确认回填',`${draft.kind} / ${draft.id}`);return json(draft);
   }
   const nodePath=p.match(/^\/api\/nodes\/([^/]+)$/);
   if(nodePath&&req.method==='PATCH') {
    const n=d.nodes.find(x=>x.id===nodePath[1]);if(!n)fail('节点不存在',404);
    for(const key of ['due','expected'])if(key in b&&b[key]&&!validDate(b[key]))fail('日期格式或实际日期无效');
    if(b.status&&!['未开始','进行中','已完成','已取消'].includes(b.status))fail('节点状态无效');
    for(const key of ['due','expected','status'])if(key in b)n[key]=b[key]||null;
    n.updatedAt=new Date().toISOString();store.scan();store.log('更新节点',n.name);return json(n);
   }
   if(p==='/api/scan') {const result=store.scan();store.log('扫描节点',`${result.scanned} 个节点，${result.active.length} 个需关注，${result.changed.length} 条新提醒`);return json(result);}
   if(p==='/api/reports') {
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(b.month||''))fail('月份格式应为 YYYY-MM');
    const report={id:uid('report'),...monthlyReport(d.sales,b.month),createdAt:new Date().toISOString()};report.markdown=reportMarkdown(report);d.reports.unshift(report);store.log('生成月报',b.month);return json(report);
   }
   if(p==='/api/ingest') {
    if(!['Opportunity','QuoteResult'].includes(b.type))fail('上游类型仅支持 Opportunity / QuoteResult');
    nonempty(b.externalId,'外部 ID',200);nonempty(b.owner,'负责人',100);nonempty(b.name,'项目名称',200);
    if(!Array.isArray(b.nodes)||!b.nodes.length)fail('至少需要一个节点');
    for(const n of b.nodes){nonempty(n.name,'节点名称',300);if(!['报价截止','投标截止','客户反馈','采购到货','非标确认','生产','发货'].includes(n.type))fail('节点类型无效');if(n.due&&!validDate(n.due))fail('节点日期无效');}
    if(b.risks!==undefined&&(!Array.isArray(b.risks)||b.risks.some(x=>typeof x!=='string')))fail('风险项应为文本数组');
    const key=b.type+':'+b.externalId;if(d.ingested[key])return json({project:d.ingested[key],duplicate:true});
    const id=uid('XM');d.customers.push({id,project:id,name:b.name,owner:b.owner,region:b.region||'待补充',externalId:b.externalId,followups:[]});
    for(const n of b.nodes)d.nodes.push({id:uid('node'),project:id,projectName:b.name,name:n.name,type:n.type,due:n.due||null,owner:b.owner,status:'未开始'});
    for(const text of b.risks||[])d.risks.push({id:uid('risk'),project:id,description:text,quote:text,category:'上游报价',level:'黄',owner:b.owner,source:b.type,status:'已确认',createdAt:new Date().toISOString()});
    d.ingested[key]=id;store.scan();store.log('上游建档',`${b.type} / ${b.externalId}`);return json({project:id,duplicate:false});
   }
   if(p==='/api/feishu/sync'||/^\/api\/reports\/[^/]+\/feishu$/.test(p)) {
    if(flight)fail('飞书任务正在执行，请等待完成',409);
    flight=(async()=>{
     try {
      if(p==='/api/feishu/sync'){store.scan();const result=await feishu.sync(store);store.log('同步飞书四表',JSON.stringify(result.counts));return result;}
      const report=d.reports.find(x=>x.id===p.split('/')[3]);if(!report)fail('月报不存在',404);
      const result=await feishu.exportReport(store,report);store.log('导出飞书月报',result.feishuUrl);return result;
     }catch(e){store.log('飞书任务失败',e.message,'error');throw e;}
    })();
    try{return json(await flight);}finally{flight=null;}
   }
   fail('接口不存在',404);
  }catch(e){json({error:e.message},e.status||500);}
 });
 let timer;
 if(options.scheduler!==false) {timer=setInterval(()=>{try{if(store.data.settings.autoScan){const r=store.scan();if(r.changed.length)store.log('定时节点扫描',`${r.changed.length} 条新提醒；本地提醒队列`);}}catch(e){console.error(e.message);}},30000);timer.unref();}
 server.on('close',()=>clearInterval(timer));return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const store=new Store();store.scan();const server=createApp(store);const port=Number(process.env.PORT||4183);
 server.listen(port,'127.0.0.1',()=>console.log(`小华跟进助手：http://127.0.0.1:${port}（仅本机；数据：${store.file}）`));
}
