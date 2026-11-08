import fs from 'node:fs/promises';
import path from 'node:path';
import {createTripo, ProviderError} from './tripo.mjs';
import {readTripoConfig,tripoFetcher} from './config.js';
import {createModelCache} from './model-cache.mjs';

const config=readTripoConfig(),fetcher=tripoFetcher();
const provider=createTripo({...config,fetcher});
const folder=path.resolve('data/runtime/tripo');
const stateFile=path.join(folder,'latest.json');
const cache=createModelCache(folder,fetcher);
let lock=null,refresh=null;
export const reference={image:'/references/3800t-official-render.jpg',url:'https://img.cranewh.com/uploads/20250820/1755652114274478.jpg',source:'https://www.cranewh.com/detail/5679.html'};
async function read(){try{return JSON.parse(await fs.readFile(stateFile,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
async function save(task){await fs.mkdir(folder,{recursive:true});await fs.writeFile(stateFile,JSON.stringify(task,null,2));}
function clean(task){
  if(!task)return null;
  const {id,status,progress,model,createdAt,error,localUrl,reference,faceLimit}=task;
  return {id,status,progress,model,createdAt,error,localUrl,reference,faceLimit};
}
export async function tripoStatus({balance=false}={}) {
  const connection={configured:!!config.apiKey,source:config.source,model:config.model};
  if(balance)Object.assign(connection,await provider.balance());
  return {...connection,task:clean(await read())};
}
export async function startGeneration(){
  if(lock)return lock;
  lock=(async()=>{
    const previous=await read();
    if(previous && !['failed','canceled'].includes(previous.status))return clean(previous);
    if(!config.apiKey)throw new ProviderError('未找到 Tripo 密钥，请设置 TRIPO_API_KEY。',503);
    const account=await provider.balance();
    if(!account.ready)throw new ProviderError('Tripo 额度不足。',402);
    const result=await provider.create({mode:'image-url',imageUrl:reference.url,faceLimit:100000});
    const task={id:result.id,version:result.version,status:'queued',progress:0,model:config.model,faceLimit:100000,createdAt:new Date().toISOString(),reference};
    await save(task);return clean(task);
  })().finally(()=>lock=null);
  return lock;
}
export async function refreshGeneration(){
  if(refresh)return refresh;
  refresh=(async()=>{
    const task=await read();if(!task)return null;
    if(task.localUrl || ['failed','canceled'].includes(task.status))return clean(task);
    const remote=await provider.status(task.id,task.version);
    Object.assign(task,remote);
    if(remote.status==='succeeded'){
      if(!remote.modelUrl)throw new ProviderError('任务已完成但尚未返回 GLB 下载地址。');
      await cache(task);task.localUrl='/files/tripo/'+task.id+'.glb';
    }
    await save(task);return clean(task);
  })().finally(()=>refresh=null);
  return refresh;
}
export function modelPath(id) {
  if(!/^[a-zA-Z0-9_-]{1,200}$/.test(id))throw new ProviderError('模型编号无效。',400);
  return path.join(folder,id+'.glb');
}

