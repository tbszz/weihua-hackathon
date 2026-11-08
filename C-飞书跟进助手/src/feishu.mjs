import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root, uid } from './store.mjs';

export function cli(args) {
 const entry=process.env.LARK_CLI_ENTRY || path.join(process.env.APPDATA||'', 'npm/node_modules/@larksuite/cli/scripts/run.js');
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(APPDATA|COMSPEC|HOME|LOCALAPPDATA|PATH|PATHEXT|SYSTEMDRIVE|SYSTEMROOT|TEMP|TMP|USERPROFILE|WINDIR)$/i.test(k)));
 env.LARKSUITE_CLI_NO_UPDATE_NOTIFIER='1';env.LARKSUITE_CLI_NO_SKILLS_NOTIFIER='1';
 return new Promise((resolve,reject)=>execFile(process.execPath,[entry,...args],{cwd:root,env,windowsHide:true,timeout:90000,maxBuffer:8*1024*1024},(err,stdout,stderr)=>{
  let value;try {value=JSON.parse(stdout);}catch {return reject(new Error((stderr||stdout||err?.message||'飞书未返回有效数据').slice(0,1500)));}
  if(err||value.error||(typeof value.code==='number'&&value.code!==0))return reject(new Error(JSON.stringify(value).slice(0,1800)));
  resolve(value);
 }));
}
export function findValue(obj,key) {if(!obj||typeof obj!=='object')return null;if(obj[key]!=null)return obj[key];for(const val of Object.values(obj)){const found=findValue(val,key);if(found!=null)return found;}return null;}
export async function connectionStatus() {
 try {const who=await cli(['whoami']);return {available:who.available,identity:who.identity,user:who.onBehalfOf?.userName||'',appId:who.appId,mode:'本机 lark-cli',checkedAt:new Date().toISOString()};}
 catch(e){return {available:false,error:e.message};}
}
const schemas={
 customers:['本地ID','客户/项目','项目编号','负责人','最近跟进','跟进记录'],
 nodes:['本地ID','节点名称','项目编号','节点类型','负责人','计划日期','预计日期','状态','风险等级','风险原因'],
 risks:['本地ID','风险描述','项目编号','类别','等级','提交人','状态','来源','原文依据'],
 sales:['本地ID','项目编号','月份','区域','结果','丢单说明','主因','次因','需复核']
};
const titles={customers:'客户档案',nodes:'项目节点',risks:'风险登记',sales:'成交与丢单'};
export async function provision(store) {
 const d=store.data;
 if(!d.integrations.feishu) {
  const made=await cli(['base','+base-create','--as','user','--name','小华跟进助手 · P0 演示（虚构数据）','--time-zone','Asia/Shanghai','--table-name',titles.customers,'--fields',JSON.stringify(schemas.customers.map(name=>({name,type:'text'})))]);
  const token=findValue(made,'app_token')||findValue(made,'base_token');
  if(!token)throw new Error('飞书创建返回缺少 base token：'+JSON.stringify(made).slice(0,600));
  d.integrations.feishu={token,url:findValue(made,'url')||`https://feishu.cn/base/${token}`,tables:{},syncedAt:null};store.save();
 }
 const cfg=d.integrations.feishu;
 const listed=await cli(['base','+table-list','--as','user','--base-token',cfg.token]);
 const tables=findValue(listed,'tables')||findValue(listed,'items')||[];
 for(const [key,names]of Object.entries(schemas)) {
  if(cfg.tables[key])continue;
  let table=Array.isArray(tables)?tables.find(t=>t.name===titles[key]||t.table_name===titles[key]):null;
  if(!table)table=await cli(['base','+table-create','--as','user','--base-token',cfg.token,'--name',titles[key],'--fields',JSON.stringify(names.map(name=>({name,type:'text'})))]);
  const id=findValue(table,'table_id')||findValue(table,'id');if(!id)throw new Error('未获得表 ID：'+JSON.stringify(table).slice(0,600));
  cfg.tables[key]=id;store.save();
 }
 return cfg;
}
export function mappedRows(d,key) {
 return d[key].map(x=>{
  const fields=key==='customers'?{'本地ID':x.id,'客户/项目':x.name,'项目编号':x.project,'负责人':x.owner||'','最近跟进':x.lastFollowup||'','跟进记录':x.followups.map(f=>`${f.time}：${f.summary}`).join('\n')}:
  key==='nodes'?{'本地ID':x.id,'节点名称':x.name,'项目编号':x.project,'节点类型':x.type,'负责人':x.owner||'','计划日期':x.due||'','预计日期':x.expected||'','状态':x.status,'风险等级':x.level||'正常','风险原因':x.reason||''}:
  key==='risks'?{'本地ID':x.id,'风险描述':x.description,'项目编号':x.project,'类别':x.category,'等级':x.level,'提交人':x.owner||'','状态':x.status,'来源':x.source,'原文依据':x.quote||''}:
  {'本地ID':x.id,'项目编号':x.project,'月份':x.month,'区域':x.region,'结果':x.result,'丢单说明':x.note,'主因':x.result==='丢单'?x.label:'','次因':(x.secondary||[]).join('、'),'需复核':x.needsReview?'是':'否'};
  return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,String(v??'')]));
 });
}
export function remoteIndex(result) {
 const data=result.data||result;
 if(data.has_more)throw new Error('Demo 表超过 200 条，需要扩展分页后再同步');
 const ix=data.fields?.indexOf('本地ID');
 if(ix===undefined||ix<0)throw new Error('飞书表缺少本地ID字段');
 const index={};
 for(const [i,row]of (data.data||[]).entries()) {
  const key=row[ix];if(!key)continue;
  if(index[key])throw new Error('飞书表存在重复本地ID，请检查：'+key);
  const id=data.record_id_list?.[i];if(!id)throw new Error('飞书未返回记录 ID');index[key]=id;
 }
 return index;
}
export async function verifyRows(rows,read,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))) {
 for(let attempt=0;attempt<5;attempt++) {
  const verified=await read(),remote=verified.data||verified,cols=remote.fields;
  const index=remoteIndex(verified);let mismatch=null;
  for(const row of rows) {
   const pos=remote.record_id_list?.indexOf(index[row['本地ID']]);
   if(pos==null||pos<0){mismatch='飞书写入读回缺少记录：'+row['本地ID'];break;}
   for(const [name,val]of Object.entries(row))if(String(remote.data[pos][cols.indexOf(name)]??'')!==val){mismatch='飞书写入读回不一致：'+row['本地ID']+' / '+name;break;}
   if(mismatch)break;
  }
  if(!mismatch)return index;
  if(attempt===4)throw new Error(mismatch);
  await pause(500*2**attempt);
 }
}
export async function sync(store) {
 const cfg=await provision(store);const counts={};
 for(const key of Object.keys(schemas)) {
  const rows=mappedRows(store.data,key);counts[key]=0;
  const common=['--as','user','--base-token',cfg.token,'--table-id',cfg.tables[key]];
  const fields=await cli(['base','+field-list',...common]);
  const remoteFields=findValue(fields,'fields')||[];
  for(const name of schemas[key])if(!remoteFields.some(f=>f.name===name))throw new Error(`飞书表 ${titles[key]} 缺少字段 ${name}`);
  const listed=await cli(['base','+record-list',...common,'--format','json','--limit','200']);
  cfg.records??={};
  const index={...cfg.records[key],...remoteIndex(listed)};cfg.records[key]=index;store.save();
  const creates=rows.filter(row=>!index[row['本地ID']]),updates=rows.filter(row=>index[row['本地ID']]);
  for(let i=0;i<creates.length;i+=20) {
   const batch=creates.slice(i,i+20);
   const result=await cli(['base','+record-batch-create',...common,'--json',JSON.stringify({create_records:batch})]);
   const ids=findValue(result,'record_id_list');
   if(!Array.isArray(ids)||ids.length!==batch.length)throw new Error('飞书批量写入未返回完整记录 ID，下次同步将先读回核对');
   batch.forEach((row,j)=>index[row['本地ID']]=ids[j]);store.save();
  }
  for(let i=0;i<updates.length;i+=20) {
   const batch=updates.slice(i,i+20);
   await cli(['base','+record-batch-update',...common,'--json',JSON.stringify({update_records:Object.fromEntries(batch.map(row=>[index[row['本地ID']],row]))})]);
  }
  // Verify server state instead of treating a successful HTTP response as proof of a write.
  await verifyRows(rows,()=>cli(['base','+record-list',...common,'--format','json','--limit','200']));
  counts[key]=rows.length;
 }
 cfg.syncedAt=new Date().toISOString();cfg.counts=counts;store.save();return {...cfg,counts};
}
export async function exportReport(store,report) {
 if(report.feishuUrl)return report;
 const rel=`data/runtime/${uid('report')}.md`;fs.writeFileSync(path.join(root,rel),report.markdown);
 try {
  const result=await cli(['docs','+create','--as','user','--title',`${report.month} 成交与丢单分析 · P0 演示初稿`,'--doc-format','markdown','--content','@'+rel]);
  const doc=findValue(result,'document_id')||findValue(result,'doc_token')||findValue(result,'token');
  report.feishuUrl=findValue(result,'document_url')||findValue(result,'url')||(doc?`https://feishu.cn/docx/${doc}`:null);
  if(!report.feishuUrl)throw new Error('文档创建未返回 URL：'+JSON.stringify(result).slice(0,600));
  report.feishuId=doc;store.save();return report;
 } finally {fs.unlinkSync(path.join(root,rel));}
}
