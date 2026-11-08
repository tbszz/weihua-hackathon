import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.mjs';
import { addDays,todayISO,digest } from '../src/domain.mjs';
test('节点变化更新自动风险依据，降级不重复轰炸，完成解除一次',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'follow-scan-'));
 try {
  const store=new Store(path.join(dir,'state.json'));const today=todayISO();
  store.data.nodes=[{id:'n',project:'p',name:'采购件',type:'采购到货',due:addDays(today,-5),status:'进行中'}];store.data.risks=[];
  assert.equal(store.scan().changed.length,1);
  store.data.nodes[0].expected=addDays(today,5);assert.equal(store.scan().changed.length,1);
  const r=store.data.risks[0];assert.match(r.description,/10 天/);
  store.data.nodes[0].expected=addDays(today,6);store.scan();assert.match(r.description,/11 天/);
  store.data.nodes[0].expected=null;assert.equal(store.scan().changed.length,0);assert.equal(r.level,'橙');
  store.data.nodes[0].status='已完成';assert.equal(store.scan().changed[0].resolved,true);assert.equal(r.status,'已关闭');
  assert.equal(store.scan().changed.length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('客户的请求不被当成客户自己的待办承诺',()=>{
 const d=digest('Client: Please send the offer before 2026-11-10.\n王磊: 我会在 2026-11-10 发送报价。');
 assert.equal(d.todos[0].owner,null);assert.equal(d.todos[1].owner,'王磊');
});
