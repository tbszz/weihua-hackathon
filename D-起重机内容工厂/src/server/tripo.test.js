import test from 'node:test';
import assert from 'node:assert/strict';
import {createTripo} from './providers/tripo.mjs';
import {readTripoConfig} from './providers/config.js';
test('Tripo uses high-detail geometry for official-reference generation',async()=>{
  const calls=[];
  const fetcher=async(url,opts)=>{calls.push({url,...opts});return {ok:true,status:200,json:async()=>({code:0,data:{task_id:'task-demo'}})};};
  const p=createTripo({apiKey:'test-token',fetcher});
  await p.create({mode:'image-url',imageUrl:'https://img.cranewh.com/uploads/20250820/1755652114274478.jpg',faceLimit:100000});
  const body=JSON.parse(calls[0].body);
  assert.equal(body.geometry_quality,'detailed');
  assert.equal(body.face_limit,100000);
  assert.equal(body.input,'https://img.cranewh.com/uploads/20250820/1755652114274478.jpg');
});
test('Tripo result mapping accepts nested GLB output and cancellation',async()=>{
  const p=createTripo({apiKey:'test-token',fetcher:async()=>({ok:true,status:200,json:async()=>({code:0,data:{status:'success',progress:100,output:{model_url:'https://cdn.tripo3d.ai/result.glb'}}})})});
  assert.equal((await p.status('task-demo')).status,'succeeded');
});
test('missing config never returns a fabricated connection',()=>{
  const c=readTripoConfig({env:{},sharedPath:'data/runtime/non-existent-key-file'});
  assert.equal(c.source,'missing');assert.equal(c.apiKey,'');
});
