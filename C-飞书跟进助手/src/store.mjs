import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { todayISO, addDays, classifyLoss, evaluateNode, levels } from './domain.mjs';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const uid=(prefix)=>prefix+'-'+randomUUID().slice(0,12);
export function csv(text) {
 const rows=[]; let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++) {const c=text[i]; if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}
 if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}const head=rows.shift();return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(head.map((k,i)=>[k,r[i]||''])));
}
export function seed() {
 const today=todayISO(),month=today.slice(0,7),prev=addDays(month+'-01',-1).slice(0,7);
 const source=csv(fs.readFileSync(path.join(root,'data/milestones-seed.csv'),'utf8'));
 const nodes=source.map((x,i)=>({id:`node-${i+1}`,project:x.project_no,projectName:x.project_name,type:x.node_type,name:x.node_name,owner:x.owner,due:x.offset_days?addDays(today,Number(x.offset_days)):null,expected:x.expected_offset_days?addDays(today,Number(x.expected_offset_days)):null,status:x.status,updatedAt:new Date().toISOString()}));
 const customers=[...new Map(source.map(x=>[x.project_no,{id:x.project_no,project:x.project_no,name:x.project_name,owner:x.owner,region:x.project_name.includes('国内')?'国内':'海外',followups:[]}])).values()];
 const samples=csv(fs.readFileSync(path.join(root,'data/losses-sample.csv'),'utf8'));
 const sales=[];
 for(const [m,count,wins,pauses] of [[month,45,15,3],[prev,40,14,2]])for(let i=0;i<count;i++) {
  const s=samples[(i-wins+samples.length*100)%samples.length]; const result=i<wins?'成交':i>=count-pauses?'暂停':'丢单';
  const note=result==='成交'?'技术方案与交付计划经客户确认':result==='暂停'?'客户说明年二季度再启动':s.loss_note==='客户说明年二季度再启动'?'客户嫌价格太贵，未能成交':s.loss_note;
  sales.push({id:`sale-${m}-${i+1}`,project:`DEMO-${m.replace('-','')}-${String(i+1).padStart(3,'0')}`,month:m,region:s.region,result,note,...classifyLoss(note)});
 }
 return {version:1,seedDate:today,customers,nodes,sales,drafts:[],risks:[],reports:[],logs:[],integrations:{feishu:null},notifications:{},ingested:{},settings:{autoScan:true},lastScan:null};
}
export class Store {
 constructor(file=path.join(root,'data/runtime/state.json')) {this.file=file;fs.mkdirSync(path.dirname(file),{recursive:true});this.data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):seed();this.save();}
 save() {const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify(this.data,null,2));fs.renameSync(temp,this.file);}
 log(action,detail,status='success') {this.data.logs.unshift({id:uid('log'),time:new Date().toISOString(),action,detail,status});this.data.logs=this.data.logs.slice(0,200);this.save();}
 scan() {
  const d=this.data,now=Date.now(),changed=[];
  for(const n of d.nodes) {
   const was=n.level;Object.assign(n,evaluateNode(n,todayISO(),d.nodes));
   const prev=d.notifications[n.id];
   if(n.level!=='正常') {
    const history=prev?.byLevel|| (prev?{[prev.level]:prev.at}:{});
    if(!prev||levels[n.level]>levels[prev.level]||now-(history[n.level]||0)>=86400000) {changed.push(n);history[n.level]=now;}
    d.notifications[n.id]={level:n.level,at:history[n.level]||now,byLevel:history};
   }
   if(n.level==='正常'&&was&&was!=='正常'){changed.push({...n,resolved:true});delete d.notifications[n.id];}
   if(n.level==='红'&&!d.risks.some(r=>r.nodeId===n.id&&r.status!=='已关闭'))d.risks.push({id:uid('risk'),nodeId:n.id,project:n.project,description:n.reason,quote:n.reason,category:n.type,level:'红',owner:n.owner,source:'节点扫描',status:'已确认',createdAt:new Date().toISOString()});
   if(n.level!=='正常')for(const r of d.risks.filter(r=>r.nodeId===n.id&&r.status!=='已关闭'))Object.assign(r,{description:n.reason,quote:n.reason,level:n.level});
   if(n.level==='正常')for(const r of d.risks.filter(r=>r.nodeId===n.id&&r.status!=='已关闭'))r.status='已关闭';
  }
  d.lastScan=new Date().toISOString();this.save();return {changed,active:d.nodes.filter(n=>n.level!=='正常').sort((a,b)=>levels[b.level]-levels[a.level]),scanned:d.nodes.length};
 }
}
