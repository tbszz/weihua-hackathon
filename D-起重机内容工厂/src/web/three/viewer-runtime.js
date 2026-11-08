import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCraneAssembly, applyExplosion, disposeObject, inspectAssembly } from './assembly.js';
import { decodeGlb, encodeGlb } from './glb.js';

export class ViewerRuntime {
  constructor(host, { span, height, onSelect, onError }) {
    this.host=host; this.onSelect=onSelect; this.onError=onError; this.disposed=false;
    this.mode='iso'; this.theme='paper'; this.explosion=0; this.targetExplosion=0; this.selected=null; this.isolated=false;
    this.section={enabled:false,axis:'z',fraction:0.5}; this.running=false; this.visible=true;
    this.renderer=new THREE.WebGLRenderer({ antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.3;
    this.renderer.localClippingEnabled=true;
    host.appendChild(this.renderer.domElement);
    this.scene=new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xf3f7ff,0x66716b,2.6));
    const sun=new THREE.DirectionalLight(0xffffff,3.3);sun.position.set(10,25,18);this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xaacbde,1.5);fill.position.set(-15,8,-8);this.scene.add(fill);
    this.camera=new THREE.OrthographicCamera(-10,10,10,-10,0.01,400);
    this.camera.position.set(27,23,32);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;this.controls.dampingFactor=0.08;
    this.controls.minZoom=0.45;this.controls.maxZoom=8;this.controls.maxPolarAngle=Math.PI*0.93;
    this.controls.addEventListener('change',()=>this.dirty=true);
    this.scene.add(new THREE.GridHelper(42,42,0xbac8c6,0xe0e5e1));
    this.floor=this.scene.children.at(-1);this.floor.position.y=-0.08;
    this.outlines=[];this.clipPlane=new THREE.Plane();
    this.adopt(createCraneAssembly({span,height}));
    this.renderer.setClearColor(0xf0f3ee);
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.down=null;
    this.onDown=e=>this.down={x:e.clientX,y:e.clientY};
    this.onUp=e=>{
      if(!this.down || Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5 || this.mode==='three')return;
      const rect=this.renderer.domElement.getBoundingClientRect();
      this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
      this.ray.setFromCamera(this.pointer,this.camera);
      const hit=this.ray.intersectObjects(this.model.pickables,false).find(item=>{
        if(!item.object.visible)return false;
        let parent=item.object.parent;while(parent){if(!parent.visible)return false;parent=parent.parent;}
        return !this.section.enabled || this.clipPlane.distanceToPoint(item.point)>=0;
      });
      let node=hit?.object;
      while(node && !node.userData.part)node=node.parent;
      this.onSelect?.(node?.userData.part?.id || null);
    };
    this.onLost=e=>{e.preventDefault();this.onError?.('图形上下文已丢失，请点击“重载模型”重试。');this.disposed=true;this.cancelRecording();};
    this.renderer.domElement.addEventListener('pointerdown',this.onDown);
    this.renderer.domElement.addEventListener('pointerup',this.onUp);
    this.renderer.domElement.addEventListener('webglcontextlost',this.onLost);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
    this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.dirty=true;});this.intersection.observe(host);
    this.resize();this.dirty=true;this.lastFrame=0;
    const tick=(now)=>{
      if(this.disposed)return;
      this.frame=requestAnimationFrame(tick);
      if(now-this.lastFrame<32)return;
      const dt=Math.min((now-this.lastFrame)/1000,0.1);this.lastFrame=now;
      if(!this.visible && !this.recording)return;
      if(this.recording) this.advanceRecording(now);
      if(Math.abs(this.explosion-this.targetExplosion)>0.001) {
        this.explosion=THREE.MathUtils.damp(this.explosion,this.targetExplosion,8,dt);this.dirty=true;
      }
      if(this.running && this.model.parts.has('upper-drum')) {
        this.model.parts.get('upper-drum').children[0].rotation.x+=dt*1.3;this.dirty=true;
      }
      applyExplosion(this.model,this.explosion);
      this.model.root.updateMatrixWorld(true);
      this.updateSection(); this.controls.update();
      if(this.dirty || this.recording || this.running){this.render();this.dirty=false;}
    };
    this.frame=requestAnimationFrame(tick);
  }
  adopt(model) {
    if(this.model){this.scene.remove(this.model.root);disposeObject(this.model.root);}
    this.model=model;this.scene.add(model.root);
    this.outlines=[];
    model.pickables.forEach(mesh=>{
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      if(!model.imported || !materials.some(m=>m.map)) {
        const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,28),new THREE.LineBasicMaterial({color:0x344f58,transparent:true,opacity:0.24}));
        edge.userData.outline=true;mesh.add(edge);this.outlines.push(edge);
      }
      materials.forEach(m=>{m.userData.baseColor=m.color?.getHex();m.side=THREE.DoubleSide;});
    });
    this.bounds=new THREE.Box3().setFromObject(model.root);this.center=this.bounds.getCenter(new THREE.Vector3());
    this.size=this.bounds.getSize(new THREE.Vector3());
    this.explosion=0;this.targetExplosion=0;this.selected=null;this.isolated=false;
    this.fit();this.dirty=true;
  }
  resize(){
    const {width,height}=this.host.getBoundingClientRect();this.width=Math.max(1,width);this.height=Math.max(1,height);
    this.renderer.setSize(this.width,this.height,false);
    const extent=Math.max(this.size?.y || 16,(this.size?.x || 14)/(this.width/this.height))*0.68+1.7;
    this.camera.left=-extent*this.width/this.height;this.camera.right=extent*this.width/this.height;
    this.camera.top=extent;this.camera.bottom=-extent;this.camera.updateProjectionMatrix();
    this.dirty=true;
  }
  fit(){
    this.mode=this.mode==='three'?'three':'iso';
    this.controls.target.copy(this.center);
    this.camera.position.copy(this.center).add(new THREE.Vector3(24,16,27));this.camera.up.set(0,1,0);this.camera.zoom=1;
    this.camera.lookAt(this.center);this.camera.updateProjectionMatrix();this.controls.update();this.resize();
  }
  setView(mode){
    this.mode=mode;this.controls.enabled=mode==='iso';
    this.isolated=false;this.isolate(false);
    const directions={iso:[24,16,27],front:[0,0,40],top:[0,40,0.01],side:[-40,0,0]};
    if(directions[mode]){
      this.controls.target.copy(this.center);
      this.camera.position.copy(this.center).add(new THREE.Vector3(...directions[mode]));
      this.camera.up.set(0,1,0);if(mode==='top')this.camera.up.set(0,0,-1);
      this.camera.lookAt(this.center);this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();
    }
    this.dirty=true;
  }
  setTheme(theme){
    this.theme=theme;this.renderer.setClearColor(theme==='paper'?0xe9edf0:0x102d40);
    this.floor.material.color.setHex(theme==='paper'?0xaec2bc:0x528095);
    this.outlines.forEach(e=>{e.material.color.setHex(theme==='paper'?0x344f58:0xb4d4e0);e.material.opacity=theme==='paper'?0.23:0.4;});
    this.dirty=true;
  }
  setExplosion(value){this.targetExplosion=THREE.MathUtils.clamp(value,0,3);this.dirty=true;}
  select(id) {
    this.selected=id;
    const selected=this.model.parts.get(id);
    this.model.pickables.forEach(m=>{
      let n=m, match=false;
      while(n){if(n===selected)match=true;n=n.parent;}
      (Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>{if(mat.emissive){mat.emissive.setHex(match?0x0b665e:0);mat.emissiveIntensity=match?0.75:0;}});
    });
    if(this.isolated)this.isolate(true);
    this.dirty=true;
  }
  isolate(value){
    this.isolated=value && Boolean(this.selected);
    const target=this.model.parts.get(this.selected);
    this.model.pickables.forEach(m=>{
      let n=m,match=false;
      while(n){if(n===target)match=true;n=n.parent;}
      m.visible=!this.isolated || match;
    });
    this.dirty=true;
  }
  focus(){
    const selected=this.model.parts.get(this.selected);if(!selected)return;
    this.mode='iso';this.controls.enabled=true;
    const box=new THREE.Box3().setFromObject(selected),c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3());
    this.controls.target.copy(c);this.camera.position.copy(c).add(new THREE.Vector3(20,13,23));
    this.camera.up.set(0,1,0);this.camera.zoom=Math.min(6,18/Math.max(s.length(),1.2));
    this.camera.lookAt(c);this.camera.updateProjectionMatrix();this.controls.update();this.dirty=true;
  }
  setSection(enabled,axis='z',fraction=0.5){this.section={enabled,axis,fraction};this.updateSection();this.dirty=true;}
  updateSection(){
    const {enabled,axis,fraction}=this.section;
    const box=new THREE.Box3().setFromObject(this.model.root);
    const position=THREE.MathUtils.lerp(box.min[axis]-0.01,box.max[axis]+0.01,fraction);
    const normal=new THREE.Vector3();normal[axis]=-1;
    this.clipPlane.set(normal,position);
    this.model.pickables.forEach(m=>{
      for(const mat of (Array.isArray(m.material)?m.material:[m.material]))mat.clippingPlanes=enabled?[this.clipPlane]:[];
    });
    this.outlines.forEach(e=>{e.material.clippingPlanes=enabled?[this.clipPlane]:[];});
  }
  camerasForViews(aspect) {
    const extent=Math.max(this.size.y,this.size.x/aspect,this.size.z/aspect)*0.72+2;
    const cam=(direction,top=false)=>{
      const c=new THREE.OrthographicCamera(-extent*aspect,extent*aspect,extent,-extent,0.01,400);
      c.position.copy(this.center).add(new THREE.Vector3(...direction));
      if(top)c.up.set(0,0,-1);c.lookAt(this.center);c.updateProjectionMatrix();return c;
    };
    return [cam([0,0,50]),cam([-50,0,0]),cam([0,50,0.01],true),cam([30,22,30])];
  }
  render(){
    const r=this.renderer;r.setScissorTest(false);r.setViewport(0,0,this.width,this.height);r.clear();
    if(this.mode==='three') {
      const w=this.width/2,h=this.height/2,cameras=this.camerasForViews(w/h);
      const cells=[[0,h],[w,h],[0,0],[w,0]];
      r.setScissorTest(true);this.floor.visible=false;
      cameras.forEach((camera,i)=>{r.setViewport(cells[i][0],cells[i][1],w,h);r.setScissor(cells[i][0],cells[i][1],w,h);r.render(this.scene,camera);});
      this.floor.visible=true;r.setScissorTest(false);r.setViewport(0,0,this.width,this.height);
    } else r.render(this.scene,this.camera);
    if(this.recording)this.drawRecordingFrame();
  }
  async load(buffer){
    const next=await decodeGlb(buffer);
    if(this.disposed){disposeObject(next.root);return;}
    this.adopt(next);return inspectAssembly(next);
  }
  async glb(){
    const amount=this.explosion;applyExplosion(this.model,0);
    const edges=this.outlines.map(e=>({edge:e,parent:e.parent}));edges.forEach(({edge,parent})=>parent.remove(edge));
    try {return await encodeGlb(this.model.root);}
    finally {edges.forEach(({edge,parent})=>parent.add(edge));applyExplosion(this.model,amount);this.dirty=true;}
  }
  snapshot(){
    this.render();return new Promise((resolve,reject)=>this.renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(new Error('图版导出失败')),'image/png'));
  }
  startRecording(onProgress){
    if(this.recording)return Promise.reject(new Error('已有录制任务'));
    if(!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream)return Promise.reject(new Error('此浏览器不支持画布录制'));
    if(document.hidden)return Promise.reject(new Error('请保持当前演示页面可见后再录制'));
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    if(!mime)return Promise.reject(new Error('此浏览器没有可用的 WebM 编码器'));
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const context=canvas.getContext('2d'),stream=canvas.captureStream(30);
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000});
    const snapshot={mode:this.mode,explosion:this.targetExplosion,position:this.camera.position.clone(),target:this.controls.target.clone(),zoom:this.camera.zoom,section:{...this.section},running:this.running};
    this.mode='iso';this.controls.enabled=false;this.isolate(false);this.section.enabled=false;this.running=false;this.explosion=0;this.targetExplosion=0;
    this.controls.target.copy(this.center);this.camera.zoom=1;this.camera.up.set(0,1,0);
    this.camera.position.copy(this.center).add(new THREE.Vector3(25,18,30));this.camera.lookAt(this.center);this.camera.updateProjectionMatrix();
    const chunks=[];
    return new Promise((resolve,reject)=>{
      const restore=()=>{
        stream.getTracks().forEach(t=>t.stop());
        this.mode=snapshot.mode;this.targetExplosion=snapshot.explosion;
        this.camera.position.copy(snapshot.position);this.camera.zoom=snapshot.zoom;this.camera.updateProjectionMatrix();
        this.controls.target.copy(snapshot.target);this.controls.enabled=this.mode==='iso';
        this.section=snapshot.section;this.running=snapshot.running;this.recording=null;this.dirty=true;
      };
      const task={recorder,canvas,context,start:performance.now(),onProgress,cancelled:false,error:null};
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{task.error=new Error('视频编码失败');if(recorder.state!=='inactive')recorder.stop();};
      recorder.onstop=()=>{
        const cancelled=task.cancelled,error=task.error;restore();
        if(error)reject(error);else if(cancelled)reject(new Error('录制已取消'));else resolve(new Blob(chunks,{type:mime}));
      };
      this.recording=task;recorder.start(250);this.dirty=true;
    });
  }
  advanceRecording(now){
    const t=(now-this.recording.start)/1000;
    if(document.hidden){this.recording.error=new Error('页面切到后台，录制已停止，请保持页面可见后重试');this.recording.recorder.stop();return;}
    this.targetExplosion=t<1?0:t<8?(t-1)*3/7:3;
    const angle=(t/12)*0.4;
    this.camera.position.copy(this.center).add(new THREE.Vector3(39*Math.sin(0.7+angle),22,39*Math.cos(0.7+angle)));
    this.camera.lookAt(this.center);this.recording.onProgress?.(Math.min(100,Math.floor(t/12*100)));
    if(t>=12 && this.recording.recorder.state!=='inactive')this.recording.recorder.stop();
  }
  drawRecordingFrame(){
    const {canvas,context:c}=this.recording;
    c.fillStyle=this.theme==='paper'?'#f0f3ee':'#102d40';c.fillRect(0,0,canvas.width,canvas.height);
    const input=this.renderer.domElement,scale=Math.min(1160/input.width,590/input.height);
    const w=input.width*scale,h=input.height*scale;
    c.drawImage(input,(1280-w)/2,(720-h)/2+15,w,h);
    c.fillStyle=this.theme==='paper'?'#25434c':'#d8e8eb';c.font='bold 23px sans-serif';c.fillText('WEIHUA / 3800t · 双主梁门式起重机',38,44);
    c.font='14px sans-serif';c.fillText('结构示意，非工程图 · 四层拆解导览',38,680);
    c.fillText('L'+Math.min(3,Math.floor(this.targetExplosion)),1170,680);
  }
  cancelRecording(){if(this.recording && this.recording.recorder.state!=='inactive'){this.recording.cancelled=true;this.recording.recorder.stop();}}
  dispose(){
    this.cancelRecording();this.disposed=true;cancelAnimationFrame(this.frame);
    this.observer?.disconnect();this.intersection?.disconnect();
    const canvas=this.renderer.domElement;
    canvas.removeEventListener('pointerdown',this.onDown);canvas.removeEventListener('pointerup',this.onUp);canvas.removeEventListener('webglcontextlost',this.onLost);
    this.controls.dispose();disposeObject(this.scene);this.renderer.dispose();canvas.remove();
  }
}

