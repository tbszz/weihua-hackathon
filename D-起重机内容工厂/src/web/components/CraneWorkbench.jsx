import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ViewerRuntime } from '../three/viewer-runtime.js';
import { inspectAssembly } from '../three/assembly.js';
import './crane-workbench.css';
const layers=['整机','结构','机构','零件'];

function TreeNode({node, selected, onSelect, search, depth=0}) {
  const [open,setOpen]=useState(depth<2);
  const matches=n=>n.label.includes(search)||n.children.some(matches);
  if(search && !matches(node))return null;
  return <li>
    <div className={'part-row '+(selected===node.id?'is-selected':'')} style={{paddingLeft:10+depth*10}}>
      <button className="tree-toggle" aria-label={(open?'收起':'展开')+node.label} disabled={!node.children.length} onClick={()=>setOpen(!open)}>{node.children.length?(open||search?'−':'+'):'·'}</button>
      <button className="part-name" onClick={()=>onSelect(node.id)} title={node.label}><i className={'part-dot depth-'+node.layer}/><span>{node.label}</span></button>
    </div>
    {(open||search) && node.children.length>0 && <ul>{node.children.map(child=><TreeNode key={child.id} node={child} selected={selected} onSelect={onSelect} search={search} depth={depth+1}/>)}</ul>}
  </li>;
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function request(url,options){const r=await fetch(url,options);const data=await r.json();if(!r.ok)throw new Error(data.error||'请求未完成');return data;}

export default function CraneWorkbench({spec}) {
  const host=useRef(null),runtime=useRef(null),importRef=useRef(null),videoRef=useRef(null),loaded=useRef(null);
  const [revision,setRevision]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState('');
  const [tree,setTree]=useState([]),[stats,setStats]=useState(null),[selected,setSelected]=useState(null);
  const [search,setSearch]=useState(''),[mode,setMode]=useState('iso'),[theme,setTheme]=useState('paper');
  const [explode,setExplode]=useState(0),[section,setSection]=useState(false),[axis,setAxis]=useState('z'),[cut,setCut]=useState(0.5);
  const [isolated,setIsolated]=useState(false),[source,setSource]=useState('结构示意');
  const [recording,setRecording]=useState(false),[progress,setProgress]=useState(0),[video,setVideo]=useState(null);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[drawer,setDrawer]=useState(null);
  const [variant,setVariant]=useState('structure'),[cloud,setCloud]=useState(null),[task,setTask]=useState(null),[cloudError,setCloudError]=useState('');
  const span=spec?.fields?.span_m?.value||107,height=spec?.fields?.overallHeight_m?.value||166.5;
  useEffect(()=>{
    let live=true,engine;setReady(false);setError('');loaded.current=null;
    try {
      engine=new ViewerRuntime(host.current,{span,height,onSelect:setSelected,onError:text=>live&&setError(text)});
      runtime.current=engine;setTree(engine.model.tree);setStats(inspectAssembly(engine.model));
      setSelected(null);setExplode(0);setSource('结构示意');setMode('iso');setSection(false);setIsolated(false);setReady(true);
    }catch(e){setError('三维视图未能加载：'+e.message);engine?.dispose();}
    return()=>{live=false;runtime.current=null;engine?.dispose();};
  },[span,height,revision]);
  useEffect(()=>{if(ready)runtime.current?.setTheme(theme);},[ready,theme]);
  useEffect(()=>{if(ready)runtime.current?.setView(mode);},[ready,mode]);
  useEffect(()=>{if(ready)runtime.current?.setExplosion(explode);},[ready,explode]);
  useEffect(()=>{if(ready)runtime.current?.setSection(section,axis,cut);},[ready,section,axis,cut]);
  useEffect(()=>{if(ready)runtime.current?.select(selected);},[ready,selected]);
  useEffect(()=>{if(ready)runtime.current?.isolate(isolated);},[ready,isolated,selected]);
  useEffect(()=>()=>{if(videoRef.current)URL.revokeObjectURL(videoRef.current);},[]);
  useEffect(()=>{
    let live=true;
    request('/api/tripo/status').then(data=>{if(live){setCloud(data);setTask(data.task);}}).catch(e=>live&&setCloudError(e.message));
    return()=>{live=false;};
  },[]);
  useEffect(()=>{
    if(!task || ['succeeded','failed','canceled'].includes(task.status))return;
    let live=true,inFlight=false;
    const poll=async()=>{if(inFlight)return;inFlight=true;try{const next=await request('/api/tripo/task');if(live){setTask(next);setCloudError('');}}catch(e){if(live)setCloudError(e.message);}finally{inFlight=false;}};
    poll();const id=setInterval(poll,6000);return()=>{live=false;clearInterval(id);};
  },[task?.id,task?.status]);
  useEffect(()=>{
    if(variant!=='real'||!ready||!task?.localUrl||loaded.current===task.localUrl)return;
    let live=true;const engine=runtime.current;loaded.current=task.localUrl;setBusy(true);
    fetch(task.localUrl).then(r=>{if(!r.ok)throw new Error('GLB 下载失败');return r.arrayBuffer();}).then(async buffer=>{
      if(!live||runtime.current!==engine)return;
      const next=await engine.load(buffer);if(!live)return;
      setTree(engine.model.tree);setStats(next);setSource('Tripo 写实模型');setSelected(null);setExplode(0);setMode('iso');
    }).catch(e=>{if(live){setCloudError(e.message);loaded.current=null;}}).finally(()=>live&&setBusy(false));
    return()=>{live=false;};
  },[ready,variant,task?.localUrl,revision]);
  const selectedData=useMemo(()=>runtime.current?.model.parts.get(selected)?.userData.part,[selected,stats]);
  const noExplosion=runtime.current?.model.hasExplosion===false;
  const disabled=!ready||busy||recording||!!error;
  const choose=id=>{setSelected(id);setIsolated(false);};
  function keyDown(e){
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.key==='ArrowRight'){e.preventDefault();if(!noExplosion)setExplode(v=>Math.min(3,Math.floor(v+1)));}
    if(e.key==='ArrowLeft'){e.preventDefault();if(!noExplosion)setExplode(v=>Math.max(0,Math.ceil(v-1)));}
    if(e.key==='Escape'){setDrawer(null);setSelected(null);setIsolated(false);}
    if(e.key.toLowerCase()==='f'&&selected){setMode('iso');runtime.current?.focus();}
  }
  async function perform(fn){if(disabled)return;setBusy(true);try{await fn();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  function reset(){setExplode(0);setSelected(null);setIsolated(false);setSection(false);setMode('iso');runtime.current?.fit();}
  function switchVariant(value){if(disabled)return;setVariant(value);setRevision(v=>v+1);setMessage('');}
  async function openCloud(){setDrawer(drawer==='tripo'?null:'tripo');try{const data=await request('/api/tripo/balance');setCloud(data);setTask(data.task);setCloudError('');}catch(e){setCloudError(e.message);}}
  async function generate(){
    setCloudError('');try{const next=await request('/api/tripo/generate',{method:'POST'});setTask(next);setVariant('real');}catch(e){setCloudError(e.message);}
  }
  async function importFile(e){
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>60*1024*1024){setMessage('请使用小于 60 MB 的 GLB。');return;}
    perform(async()=>{const next=await runtime.current.load(await file.arrayBuffer());setStats(next);setTree(runtime.current.model.tree);setSource(file.name);setSelected(null);setExplode(0);setMode('iso');});
  }
  function exportGlb(){perform(async()=>{download(new Blob([await runtime.current.glb()],{type:'model/gltf-binary'}),'weihua-3800t.glb');setMessage('GLB 已导出');});}
  function snapshot(){perform(async()=>{download(await runtime.current.snapshot(),'weihua-'+mode+'.png');setMessage('图版已导出');});}
  async function record(){
    if(disabled)return;setRecording(true);setProgress(0);setDrawer(null);const engine=runtime.current;
    try{const blob=await engine.startRecording(setProgress);if(runtime.current!==engine)return;if(videoRef.current)URL.revokeObjectURL(videoRef.current);const url=URL.createObjectURL(blob);videoRef.current=url;setVideo({url,size:(blob.size/1024/1024).toFixed(1)});setDrawer('video');}
    catch(e){if(runtime.current===engine)setMessage(e.message);}finally{if(runtime.current===engine)setRecording(false);}
  }
  return <section className={'crane-workbench focused-workbench theme-'+theme} onKeyDown={keyDown} data-testid="crane-workbench">
    <div className="model-action-bar">
      <div className="variant-switch" aria-label="模型类型"><button className={variant==='real'?'active':''} disabled={disabled} onClick={()=>switchVariant('real')}>写实外观</button><button className={variant==='structure'?'active':''} disabled={disabled} onClick={()=>switchVariant('structure')}>结构拆解</button></div>
      <div className="model-tools"><button className={drawer==='parts'?'active':''} onClick={()=>setDrawer(drawer==='parts'?null:'parts')}>部件</button><button className={mode==='three'?'active':''} disabled={disabled} onClick={()=>setMode(mode==='three'?'iso':'three')}>三视图</button><button className={section?'active':''} disabled={disabled} onClick={()=>setSection(v=>!v)}>剖视</button><button onClick={()=>setDrawer(drawer==='tools'?null:'tools')}>导出</button><button className="tripo-entry" onClick={openCloud}><i className={cloud?.configured?'online':''}/>Tripo</button></div>
    </div>
    <div className="model-stage-wrap" tabIndex="0" aria-label="三维模型画布">
      <div className="cw-stage" ref={host} data-testid="model-canvas"/>
      <div className="model-title"><span>卫华 · 超大起重机</span><h1>3800<span>吨</span></h1><p>双主梁门式起重机</p></div>
      <div className="model-scale"><span><b>{span}</b>m 跨度</span><span><b>{height}</b>m 整机高</span></div>
      <div className="source-label">{source}<i/>{source==='Tripo 写实模型'?'基于官方效果图生成':'基于公开资料重建'}</div>
      {busy&&<div className="model-loading">正在加载模型…</div>}
      {mode==='three'&&<div className="cw-view-labels"><span>主视图</span><span>左视图</span><span>俯视图</span><span>轴测图</span></div>}
      <button className="model-reset" disabled={disabled} onClick={reset} aria-label="复位模型视角">↺</button>
      {error&&<div className="cw-error"><strong>模型加载失败</strong><p>{error}</p><button onClick={()=>setRevision(v=>v+1)}>重试</button></div>}
      {recording&&<div className="cw-recording"><i/>录制中 {progress}%<button onClick={()=>runtime.current.cancelRecording()}>取消</button></div>}
      {selectedData&&drawer!=='parts'&&<div className="selected-callout"><button aria-label="取消零件选择" onClick={()=>setSelected(null)}>×</button><b>{selectedData.label}</b><button onClick={()=>{setMode('iso');runtime.current.focus();}}>聚焦</button><button onClick={()=>setIsolated(v=>!v)}>{isolated?'全部显示':'单独查看'}</button></div>}
    </div>
    {section&&<div className="cw-section-controls"><b>剖切</b><select aria-label="剖切方向" value={axis} onChange={e=>setAxis(e.target.value)} disabled={disabled}><option value="z">纵向</option><option value="x">横向</option><option value="y">水平</option></select><input aria-label="剖切位置" type="range" min="0" max="1" step="0.01" value={cut} onChange={e=>setCut(Number(e.target.value))} disabled={disabled}/><span>{Math.round(cut*100)}%</span></div>}
    <div className="model-bottom-bar">
      {noExplosion?<span className="model-hint">拖动旋转 · 滚轮缩放</span>:<><div className="cw-layer-buttons">{layers.map((label,i)=><button key={label} disabled={disabled} className={Math.floor(explode)===i?'active':''} onClick={()=>setExplode(i)} aria-label={'L'+i+label}>{label}</button>)}</div><input type="range" aria-label="爆炸拆解进度" min="0" max="3" step="0.01" value={explode} onChange={e=>setExplode(Number(e.target.value))} disabled={disabled}/></>}
      <div className="bottom-right"><button onClick={()=>setTheme(t=>t==='paper'?'blueprint':'paper')} disabled={recording}>{theme==='paper'?'蓝图':'原色'}</button><button className="record-primary" disabled={disabled} onClick={record}>● 录制导览</button></div>
    </div>
    {message&&<div className="floating-message" role="status">{message}<button onClick={()=>setMessage('')}>×</button></div>}
    {drawer&&<aside className="model-drawer"><div className="model-drawer-head"><strong>{{parts:'部件',tripo:'Tripo 生成',tools:'导出模型',video:'导览视频'}[drawer]}</strong><button aria-label="关闭模型面板" onClick={()=>setDrawer(null)}>×</button></div>
      {drawer==='parts'&&<><input className="part-search" aria-label="搜索零件" type="search" placeholder="搜索部件…" value={search} onChange={e=>setSearch(e.target.value)}/><ul className="cw-tree-list">{tree.map(node=><TreeNode key={node.id} node={node} selected={selected} onSelect={choose} search={search}/>)}</ul>{selectedData&&<div className="drawer-inspector"><b>{selectedData.label}</b><p>{selectedData.description||'外部 GLB 网格'}</p><button disabled={!selected} onClick={()=>{setMode('iso');runtime.current.focus();}}>聚焦部件</button><button disabled={!selected} onClick={()=>setIsolated(v=>!v)}>{isolated?'显示全部':'单独查看'}</button></div>}</>}
      {drawer==='tools'&&<div className="drawer-tools"><button disabled={disabled} onClick={snapshot}>下载图版 PNG <span>↗</span></button><button disabled={disabled} onClick={exportGlb}>下载模型 GLB <span>↗</span></button><button disabled={disabled} onClick={()=>importRef.current.click()}>导入 GLB <span>＋</span></button><button disabled={disabled} onClick={record}>录制 12 秒导览 <span>●</span></button>{video&&<button onClick={()=>setDrawer('video')}>查看已录视频 <span>▶</span></button>}<p>{stats?.parts} 个部件 · {stats?.triangles?.toLocaleString()} 个三角面</p></div>}
      {drawer==='tripo'&&<div className="tripo-panel"><div className="tripo-connection"><i className={cloud?.ready?'online':''}/>{cloud?.ready?'账户已连接':cloud?.configured?'密钥已配置':'尚未配置'}{cloud?.balance!=null&&<small>{cloud.balance.toLocaleString()} credits</small>}</div><img src="/references/3800t-official-render.jpg" alt="卫华官网3800t门机效果图"/><a href="https://www.cranewh.com/detail/5679.html" target="_blank" rel="noreferrer">参考：卫华官方效果图 ↗</a><dl><div><dt>模型</dt><dd>{cloud?.model||'v3.1'}</dd></div><div><dt>细节</dt><dd>高精度 · 10 万面 · PBR</dd></div></dl>{task&&<div className="generation-status"><span>{task.localUrl?'模型已就绪':task.status==='failed'?'生成失败':'生成中'}<b>{task.progress||0}%</b></span><progress max="100" value={task.progress||0}/></div>}{cloudError&&<p className="cloud-error">{cloudError}</p>}<button className="record-primary" disabled={!cloud?.configured||!!task&&['queued','processing'].includes(task.status)} onClick={task?.localUrl?()=>{setVariant('real');setRevision(v=>v+1);setDrawer(null);}:generate}>{task?.localUrl?'查看生成结果':task&&['queued','processing'].includes(task.status)?'正在生成…':'按参考图生成 GLB'}</button><small className="tripo-note">结果用于外观展示，不包含可验证的内部结构。</small></div>}
      {drawer==='video'&&video&&<div className="drawer-video"><video controls src={video.url}/><a className="record-primary" href={video.url} download="weihua-3800t.webm">下载视频 · {video.size} MB</a></div>}
    </aside>}
    <input ref={importRef} type="file" accept=".glb" aria-label="导入 GLB 文件" onChange={importFile} hidden/>
    <div className="model-disclaimer">{source==='Tripo 写实模型'?'外观展示 · 非工程模型':'结构示意 · 非工程图'}</div>
  </section>;
}
