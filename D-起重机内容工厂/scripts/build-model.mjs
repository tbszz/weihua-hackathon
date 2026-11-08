import './node-file-reader.js';
import fs from 'node:fs/promises';
import { createCraneAssembly, inspectAssembly, disposeObject } from '../src/web/three/assembly.js';
import { encodeGlb, decodeGlb } from '../src/web/three/glb.js';
const model=createCraneAssembly();
const buffer=await encodeGlb(model.root);
const loaded=await decodeGlb(buffer);
await fs.mkdir('public/models',{recursive:true});
await fs.writeFile('public/models/weihua-3800t-demo.glb',new Uint8Array(buffer));
const manifest={name:'3800t 双主梁门机 · 通用结构宣传示意',source:'本项目参数化生成，非厂商 CAD 或工程模型',...inspectAssembly(loaded),bytes:buffer.byteLength,generatedAt:new Date().toISOString()};
await fs.writeFile('public/models/manifest.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest));
disposeObject(model.root);disposeObject(loaded.root);

