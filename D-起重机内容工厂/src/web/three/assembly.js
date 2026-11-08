import * as THREE from 'three';

// All geometry is a generic promotional reconstruction, not a certified engineering model.
export function createCraneAssembly({ span = 107, height = 166.5 } = {}) {
  const s = Math.max(30, Math.min(250, Number(span))) / 10;
  const h = Math.max(30, Math.min(250, Number(height))) / 10;
  const root = new THREE.Group(); root.name = 'WEIHUA_illustrative_assembly';
  const parts = new Map(); const pickables = [];
  const colors = { gold: 0xc72b20, light: 0xee4931, iron: 0xa3221e, pale: 0xb8cbca, orange: 0xe85627, teal: 0x477e83, black: 0x27313a, silver: 0xb8c2c7 };
  const mat = (c) => new THREE.MeshStandardMaterial({ color: colors[c] ?? c, roughness: 0.52, metalness: 0.3, side: THREE.DoubleSide });
  function part(id, label, parent, pos = [0,0,0], layer = 1, explode = [0,0,0], description = '') {
    const g = new THREE.Group(); g.name = id; g.position.set(...pos);
    g.userData.part = { id, label, parent: parent?.userData.part?.id || null, base: [...pos], layer, explode, description };
    (parent || root).add(g); parts.set(id, g); return g;
  }
  function mesh(g, geo, color, pos = [0,0,0], rotation) {
    const m = new THREE.Mesh(geo, mat(color)); m.position.set(...(pos || [0,0,0]));
    if (rotation) m.rotation.set(...rotation);
    m.castShadow = true; m.receiveShadow = true; m.userData.partId = g.userData.part.id;
    g.add(m); pickables.push(m); return m;
  }
  const box = (g, size, color, pos, rotation) => mesh(g, new THREE.BoxGeometry(...size), color, pos, rotation);
  const cyl = (g, radius, length, color, pos, axis = 'z') => mesh(g, new THREE.CylinderGeometry(radius,radius,length,20),color,pos,axis === 'x' ? [0,0,Math.PI/2] : axis === 'z' ? [Math.PI/2,0,0] : null);
  const ring = (g, radius, tube, color, pos) => mesh(g,new THREE.TorusGeometry(radius,tube,6,24),color,pos);
  function rod(g,a,b,r,color) {
    const v1 = new THREE.Vector3(...a), v2 = new THREE.Vector3(...b), d = v2.clone().sub(v1);
    const m = mesh(g,new THREE.CylinderGeometry(r,r,d.length(),6),color);
    m.position.copy(v1).add(v2).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()); return m;
  }
  function taperedBox(g,a,b,wa,wb,depth,color) {
    const len=new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));
    const shape=new THREE.Shape();shape.moveTo(-wa/2,-len/2);shape.lineTo(wa/2,-len/2);shape.lineTo(wb/2,len/2);shape.lineTo(-wb/2,len/2);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geo.translate(0,0,-depth/2);
    const m=mesh(g,geo,color);m.position.copy(new THREE.Vector3(...a)).add(new THREE.Vector3(...b)).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return m;
  }
  const machine = part('crane','双主梁门式起重机',null,[0,0,0],0,[0,0,0],'官方规格驱动外形尺度，内部机构按通用结构建模。');
  const structure = part('structure','金属结构',machine,[0,0,0],0);
  const y = h - 1.4;
  for (const [i,z] of [-1.25,1.25].entries()) {
    const girder = part('girder-'+i,'主梁 '+(i+1),structure,[0,y,z],1,[0,1.4,i ? 1.2 : -1.2],'双主梁承载及小车轨道，内部筋板为结构示意。');
    box(girder,[s+2.4,0.15,0.7],'gold',[0,0.63,0]);
    box(girder,[s+2.4,0.15,0.7],'gold',[0,-0.63,0]);
    box(girder,[s+2.4,1.2,0.09],'iron',[0,0,0]);
    for(const side of [-1,1])box(girder,[s+2.4,1.4,0.07],'gold',[0,0,side*0.34]);
    for(let n=0;n<26;n++)box(girder,[0.025,1.4,0.02],'iron',[-(s+2.3)/2+n*(s+2.3)/25,0,-0.382]);
    box(girder,[s+2.4,0.1,0.1],'silver',[0,0.78,0]);
    for(let k=0;k<=16;k++) {
      const x=-(s+2.1)/2+(s+2.1)*k/16;
      box(girder,[0.08,1.2,0.62],'gold',[x,0,0]);
      if(k<16) rod(girder,[x,-0.55,-0.3],[x+(s+2.1)/16,0.55,-0.3],0.045,'gold');
    }
    const walk = part('walk-'+i,'检修走台与栏杆',girder,[0,0.08,i ? 0.6 : -0.6],2,[0,0.8,i ? 0.65 : -0.65]);
    box(walk,[s+2.3,0.07,0.48],'iron',[0,0,0]);
    for (let k=0;k<=20;k++) rod(walk,[-(s+2.2)/2+k*(s+2.2)/20,0,0],[-(s+2.2)/2+k*(s+2.2)/20,0.65,0],0.025,'gold');
    rod(walk,[-(s+2.2)/2,0.65,0],[(s+2.2)/2,0.65,0],0.025,'gold');
    rod(walk,[-(s+2.2)/2,0.33,0],[(s+2.2)/2,0.33,0],0.02,'gold');
  }
  for (const [side,x] of [['left',-s/2],['right',s/2]]) {
    const sign = x<0?-1:1;
    const leg = part(side+'-support',side==='left'?'刚性支腿总成':'柔性支腿总成',structure,[x,0,0],1,[sign*2,0,0],'支腿形式为门机通用示意，待技术中心核准。');
    for(const z of [-1,1]) {
      const top=[0,y-0.6,z*1.25], bottom=[sign*0.45,0.7,z*2.1];
      taperedBox(leg,bottom,top,side==='left'?0.5:0.32,side==='left'?1.05:0.3,side==='left'?0.8:0.38,'gold');
      for(let n=0;n<8;n++) {
        const yy=1.5+(y-3)*n/8;
        box(leg,[0.7,0.06,0.06],'gold',[0,yy,z*(2.1-(yy/y)*0.85)]);
      }
    }
    if(side==='left')box(leg,[0.8,y*0.15,2.5],'gold',[0,y*0.86,0]);
    box(leg,[0.7,0.5,4.8],'iron',[sign*0.45,0.7,0]);
    const wheels=part(side+'-wheels','大车车轮组',leg,[sign*0.45,0.38,0],2,[sign*0.6,-0.1,0],'车轮沿地面轨道运行；轮数及尺寸为示意。');
    for(let bogie=0;bogie<4;bogie++) {
      const zbase=-2.1+bogie*1.4;
      const group=part(side+'-bogie-'+bogie,'均衡台车 '+(bogie+1),wheels,[0,0,zbase],3,[sign*0.35,0,(bogie-1.5)*0.45]);
      box(group,[0.62,0.22,1.12],'iron',[0,0.23,0]);
      for(let k=0;k<4;k++)for(const sideOffset of [-0.21,0.21]) {
        cyl(group,0.14,0.16,'black',[sideOffset,0,-0.42+k*0.28],'x');
        cyl(group,0.055,0.18,'silver',[sideOffset,0,-0.42+k*0.28],'x');
      }
    }
    const travel=part(side+'-travel-motor','大车驱动与减速机',wheels,[0.3,0.25,1.65],3,[sign*1,0.3,0.8]);
    box(travel,[0.44,0.4,0.5],'teal'); cyl(travel,0.17,0.5,'iron',[0,0,0.45]);
    const axle=part(side+'-axle','车轮传动轴',wheels,[0,0,0],3,[sign*0.8,0.2,0]);
    cyl(axle,0.08,4.5,'silver',null,'z');
    const buffer=part(side+'-buffer','端部缓冲器',leg,[sign*0.45,0.7,2.6],2,[0,0,1]);
    cyl(buffer,0.18,0.5,'black'); box(buffer,[0.5,0.45,0.1],'orange',[0,0,-0.3]);
    const ladder=part(side+'-ladder','检修爬梯',leg,[0.33,y*0.5,-1.5],2,[sign*0.7,0,-0.8]);
    for(const xx of [-0.16,0.16]) rod(ladder,[xx,-y*0.4,0],[xx,y*0.4,0],0.025,'gold');
    for(let k=0;k<28;k++) rod(ladder,[-0.16,-y*0.4+k*y*0.8/27,0],[0.16,-y*0.4+k*y*0.8/27,0],0.018,'gold');
  }
  for(const [i,x] of [-s/2,s/2].entries()) {
    const end=part('end-'+i,'上端梁',structure,[x,y,0],1,[i?1:-1,0.9,0]);
    box(end,[0.6,0.7,3.2],'gold'); for(let k=0;k<5;k++) box(end,[0.66,0.06,0.06],'silver',[0,0.38,-1+k*0.5]);
  }
  const cabin=part('cabin','司机室',machine,[-s*0.34,y-2,-1.9],1,[-1,-0.5,-1.5]);
  box(cabin,[1,1.2,1],'gold'); box(cabin,[0.84,0.63,0.04],0x244f63,[0,0.2,-0.52]);
  box(cabin,[0.04,0.6,0.83],0x244f63,[-0.52,0.2,0]);
  const trolleys=part('trolleys','双小车系统',machine,[0,0,0],0);
  for(const [name,x,z] of [['upper',-s*0.23,-0.1],['lower',s*0.23,0.1]]) {
    const label=name==='upper'?'上小车':'下小车';
    const trolley=part(name+'-trolley',label+' · 1900t',trolleys,[x,y+(name==='upper'?1.05:-0.7),z],1,[0,name==='upper'?2.1:-1.2,name==='upper'?-0.4:0.4],'额定起重量 1900t，来源：卫华官网 5679；布置为通用示意。');
    const frame=part(name+'-frame','小车架',trolley,[0,0,0],2,[0,-0.3,0]);
    for(const zz of [-1.1,1.1]) box(frame,[2.2,0.24,0.18],name==='upper'?'orange':'gold',[0,0,zz]);
    for(const xx of [-0.96,0.96]) box(frame,[0.18,0.24,2.4],'iron',[xx,0,0]);
    for(const xx of [-0.85,0.85]) for(const zz of [-1.25,1.25]) cyl(frame,0.19,0.17,'black',[xx,-0.17,zz]);
    const hoist=part(name+'-hoist','起升机构',trolley,[0,0.25,0],2,[0,1,0],'电机→减速机→卷筒→钢丝绳→滑轮→吊钩。');
    const motor=part(name+'-motor','起升电机',hoist,[-0.65,0.32,0],3,[-1.2,0.5,-0.7],'提供起升动力；功率及具体型号未公开。');
    cyl(motor,0.27,0.68,'teal',null,'x');
    for(let f=0;f<8;f++) { const a=f*Math.PI/4; box(motor,[0.6,0.04,0.06],'pale',[0,Math.cos(a)*0.27,Math.sin(a)*0.27]); }
    cyl(motor,0.1,0.93,'silver',null,'x'); box(motor,[0.48,0.12,0.5],'iron',[0,-0.3,0]);
    const reducer=part(name+'-reducer','减速机',hoist,[0.18,0.3,0],3,[0.9,0.5,-0.7],'降低转速并提高输出转矩；蒲瑞自产品类参考。');
    box(reducer,[0.5,0.5,0.62],'iron'); cyl(reducer,0.16,0.65,'gold',null,'x');
    for(const yy of [-0.2,0.2]) for(const zz of [-0.24,0.24]) cyl(reducer,0.035,0.56,'silver',[0,yy,zz],'x');
    const drum=part(name+'-drum','卷筒组',hoist,[0,0.35,0.73],3,[0,1.25,1.1],'收放钢丝绳，将转动变为吊具的垂直运动。');
    cyl(drum,0.28,1.5,'gold',null,'x');
    for(const xx of [-0.8,0.8]) cyl(drum,0.37,0.08,'iron',[xx,0,0],'x');
    for(let k=0;k<22;k++) {
      const m=mesh(drum,new THREE.TorusGeometry(0.285,0.012,4,20),'silver',[-0.7+k*0.066,0,0]); m.rotation.y=Math.PI/2;
    }
    const brake=part(name+'-brake','制动器',hoist,[0.65,0.3,0],3,[1.3,0.4,0]);
    cyl(brake,0.22,0.1,'orange',null,'x'); box(brake,[0.15,0.5,0.44],'iron',[0.12,0,0]);
    const drop=name==='upper'?5.2:6.3;
    const pulleys=part(name+'-pulleys','滑轮组',trolley,[0,-drop,0.4],2,[0,-0.7,0],'多倍率绳系分担载荷；数量与倍率为示意。');
    for(let k=0;k<4;k++) { cyl(pulleys,0.22,0.1,'silver',[-0.24+k*0.16,0,0],'x'); }
    box(pulleys,[0.8,0.5,0.08],'gold',[0,0,-0.25]); box(pulleys,[0.8,0.5,0.08],'gold',[0,0,0.25]);
    const ropes=part(name+'-ropes','钢丝绳系',trolley,[0,0,0.4],2,[0,-0.3,0]);
    for(let line=0;line<10;line++)rod(ropes,[-0.35+line*0.078,0,0],[-0.35+line*0.078,-drop+0.2,0],0.01,'silver');
    if(name==='upper') {
      const twin=part('upper-outboard-block','上小车第二组吊具',trolley,[0,-drop,-1.7],2,[0,-0.8,-0.9]);
      box(twin,[0.75,0.43,0.42],0xd4a742);cyl(twin,0.13,0.4,'silver',[0,-0.4,0],'y');
      const curve2=new THREE.CatmullRomCurve3([[0,-0.55,0],[-0.18,-0.7,0],[-0.1,-0.95,0],[0.16,-0.9,0],[0.23,-0.75,0]].map(v=>new THREE.Vector3(...v)));
      mesh(twin,new THREE.TubeGeometry(curve2,18,0.065,8,false),'black');
      for(let line=0;line<10;line++)rod(ropes,[-0.35+line*0.078,0,-2.1],[-0.35+line*0.078,-drop+0.2,-2.1],0.01,'silver');
    }
    const hook=part(name+'-hook','吊钩组',pulleys,[0,-0.55,0],3,[0,-0.7,0],'吊钩组可独立查看；不代替真实产品结构图。');
    cyl(hook,0.12,0.4,'silver',[0,0.15,0],'y');
    const curve=new THREE.CatmullRomCurve3([[0,0.1,0],[-0.2,-0.2,0],[-0.12,-0.4,0],[0.17,-0.36,0],[0.24,-0.16,0]].map(v=>new THREE.Vector3(...v)));
    mesh(hook,new THREE.TubeGeometry(curve,20,0.08,8,false),'gold');
    const travel=part(name+'-travel','小车运行机构',trolley,[0.65,0.1,-1],2,[1.1,0.6,-0.8]);
    box(travel,[0.35,0.28,0.4],'teal'); cyl(travel,0.14,0.45,'silver',[0.3,0,0],'x');
    const electric=part(name+'-electrics','电控箱',trolley,[-0.75,0.5,-0.7],2,[-1,0.5,-0.6]);
    box(electric,[0.4,0.7,0.3],'pale'); box(electric,[0.3,0.4,0.02],'iron',[0,0,0.16]);
    const coupling=part(name+'-coupling','联轴器',hoist,[-0.18,0.3,0],3,[0,0.8,-0.7]);
    cyl(coupling,0.14,0.2,'orange',null,'x');
    const roof=part(name+'-weather-cover','起升机房罩壳',trolley,[0,1.15,0],2,[0,1.3,0]);
    box(roof,[2.2,0.75,1.7],'gold');box(roof,[2.25,0.07,1.76],'light',[0,0.42,0]);
    for(let grille=0;grille<9;grille++)box(roof,[0.035,0.4,0.025],'black',[-0.7+grille*0.13,0,0.86]);
  }
  return hydrateAssembly(root);
}

export function hydrateAssembly(root) {
  const parts=new Map(), pickables=[], tree=[], byId=new Map();
  root.traverse(node=>{
    if(node.userData.part) {
      const p=node.userData.part; parts.set(p.id,node);
      byId.set(p.id,{id:p.id,label:p.label,parent:p.parent,layer:p.layer,description:p.description,children:[]});
    }
    if(node.isMesh) { node.castShadow=true; node.receiveShadow=true; pickables.push(node); }
  });
  byId.forEach(n=>{ if(n.parent && byId.has(n.parent)) byId.get(n.parent).children.push(n); else tree.push(n); });
  root.updateMatrixWorld(true);
  return {root,parts,pickables,tree};
}
export function applyExplosion(model, value) {
  model.parts.forEach(g=>{
    const p=g.userData.part, t=p.layer===0?0:THREE.MathUtils.clamp(value-p.layer+1,0,1);
    const ease=t*t*(3-2*t);
    g.position.set(...p.base).addScaledVector(new THREE.Vector3(...p.explode),ease);
  });
  model.root.updateMatrixWorld(true);
}
export function inspectAssembly(model) {
  let meshes=0, triangles=0; model.root.traverse(n=>{ if(n.isMesh) { meshes++; triangles+=(n.geometry.index?.count||n.geometry.attributes.position?.count||0)/3; } });
  return {meshes,parts:model.parts.size,triangles:Math.round(triangles)};
}
export function disposeObject(root) {
  const geometries=new Set(), materials=new Set(), textures=new Set();
  root.traverse(n=>{
    if(n.geometry) geometries.add(n.geometry);
    for(const m of (Array.isArray(n.material)?n.material:[n.material])) if(m) {
      materials.add(m); for(const value of Object.values(m)) if(value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(v=>v.dispose()); geometries.forEach(v=>v.dispose()); materials.forEach(v=>v.dispose());
}
