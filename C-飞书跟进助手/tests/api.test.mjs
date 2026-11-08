import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.mjs';
import { Store } from '../src/store.mjs';

test('真实 HTTP：确认门禁、幂等、节点更新、月报、持久化、错误输入',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'follow-test-')); const file=path.join(dir,'state.json');
 const store=new Store(file); const server=createApp(store,{scheduler:false}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const api=async(url,body,method='POST')=>{const res=await fetch(base+url,body===undefined?undefined:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,data:await res.json()};};
 try {
  const start=(await api('/api/state')).data; const project=start.customers[0].id;
  assert.equal((await api('/api/digest',{text:'   ',project})).status,400);
  const text='客户: 需要 2 台 40t 门机，2026-11-10 前发送报价。\n客户: 价格太贵，担心延期。\n王磊: 我会在 2026-11-10 发送报价。';
  const d=(await api('/api/digest',{text,project})).data;
  assert.equal((await api('/api/state')).data.customers[0].followups.length,0);
  assert.equal((await api(`/api/drafts/${d.id}/confirm`,{})).status,200);
  assert.equal((await api(`/api/drafts/${d.id}/confirm`,{})).status,200);
  assert.equal((await api('/api/state')).data.customers[0].followups.length,1);
  const risk=(await api('/api/risks/detect',{project,text:'客户第二笔款还没到，财务说不能排发货',owner:'测试员'})).data;
  const before=(await api('/api/state')).data.risks.length;
  await api(`/api/drafts/${risk.id}/confirm`,{});await api(`/api/drafts/${risk.id}/confirm`,{});
  assert.equal((await api('/api/state')).data.risks.length,before+1);
  const scan1=(await api('/api/scan',{})).data,scan2=(await api('/api/scan',{})).data;
  assert.ok(scan1.active.length);assert.equal(scan2.changed.length,0);
  const node=start.nodes[0];
  assert.equal((await api('/api/nodes/'+node.id,{due:'2026-02-30'},'PATCH')).status,400);
  await api('/api/nodes/'+node.id,{status:'已完成'},'PATCH');
  assert.equal((await api('/api/state')).data.nodes.find(x=>x.id===node.id).level,'正常');
  const month=start.seedDate.slice(0,7);const report=(await api('/api/reports',{month})).data;
  assert.equal(report.won,15);assert.equal(report.lost,27);assert.equal(report.paused,3);assert.equal(report.winRate,35.7);
  const input={type:'Opportunity',externalId:'test-upstream',name:'测试商机',owner:'测试员',nodes:[{name:'投标截止',type:'投标截止',due:'2026-11-10'}]};
  await api('/api/ingest',input);await api('/api/ingest',input);
  assert.equal((await api('/api/state')).data.customers.filter(c=>c.externalId==='test-upstream').length,1);
  assert.equal((await api('/api/ingest',{...input,externalId:'bad',owner:''})).status,400);
  assert.equal(new Store(file).data.customers[0].followups.length,1);
  assert.equal((await api('/api/drafts/missing/confirm',{})).status,404);
  const cross=await fetch(base+'/api/scan',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'});assert.equal(cross.status,403);
 } finally {await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
