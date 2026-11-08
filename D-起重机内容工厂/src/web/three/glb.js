import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { hydrateAssembly, disposeObject } from './assembly.js';

export async function encodeGlb(root) {
  return new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: false });
}
export async function decodeGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) throw new Error('GLB 文件头无效，请选择完整的 .glb 文件');
  const header=new DataView(buffer);
  if(header.getUint32(0,true)!==0x46546c67 || header.getUint32(4,true)!==2 || header.getUint32(8,true)!==buffer.byteLength) throw new Error('GLB 文件头或长度无效');
  const gltf = await new GLTFLoader().parseAsync(buffer,'');
  const root=gltf.scene;
  let hasParts=false; root.traverse(n=>{if(n.userData.part)hasParts=true;});
  if(!hasParts) {
    // External GLBs preserve their real hierarchy. Mesh components get metadata for the tree.
    const outer=new THREE.Group(); outer.name='imported';
    outer.userData.part={id:'imported',label:'导入模型',parent:null,base:[0,0,0],explode:[0,0,0],layer:0};
    outer.add(root);
    const box=new THREE.Box3().setFromObject(root), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
    if(box.isEmpty() || !Number.isFinite(size.length())) {disposeObject(root);throw new Error('GLB 中没有可显示的网格');}
    root.position.sub(center); root.position.y += size.y/2; outer.scale.setScalar(14/Math.max(size.x,size.y,size.z,0.001));
    let index=0;
    const assign=(n,parentId,depth)=>{
      let nextParent=parentId;
      if(n.isMesh || (n.isGroup && n!==root)) {
        const id='glb-part-'+index++;
        n.userData.part={id,label:n.name || '零件 '+index,parent:parentId,base:n.position.toArray(),explode:[0,0,0],layer:Math.min(3,depth)};
        nextParent=id;
      }
      n.children.forEach(child=>assign(child,nextParent,depth+1));
    };
    assign(root,'imported',0);
    const model=hydrateAssembly(outer);
    model.imported=true; model.hasExplosion=false;
    return model;
  }
  const model=hydrateAssembly(root);
  model.imported=true; model.hasExplosion=true;
  return model;
}
