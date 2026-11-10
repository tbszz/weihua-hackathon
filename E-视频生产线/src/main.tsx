import {useEffect, useState} from 'react';
import {createDemoStoryboard, createInitialJob, findAsset, validateStoryboard, type RenderResult, type StoryboardScene} from './demo/pipeline';
import './styles.css';
import {EditorChat} from './web/EditorChat';
import {AigcStudio} from './web/AigcStudio';

type Stage = 'brief' | 'storyboard' | 'aigc' | 'render' | 'complete';

const stageLabels: {id: Stage; label: string; note: string}[] = [
  {id: 'brief', label: '任务简报', note: '主题与素材'},
  {id: 'storyboard', label: '故事板', note: '镜头与口径'},
  {id: 'aigc', label: 'AIGC 工坊', note: 'Skills 与生成'},
  {id: 'render', label: '渲染质检', note: '成片与门禁'},
  {id: 'complete', label: '交付', note: '可下载演示包'},
];

export default function App() {
  const [job, setJob] = useState(createInitialJob);
  const [stage, setStage] = useState<Stage>('brief');
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [render, setRender] = useState<RenderResult | null>(null);
  const [activeScene, setActiveScene] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [error, setError] = useState('');
  const [renderStage, setRenderStage] = useState('');
  const [renderJobId, setRenderJobId] = useState('');
  const [jianyingUrl, setJianyingUrl] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<string[]>(['可以直接告诉我怎么改节奏，例如“把第 3 段缩短到 6 秒”。']);
  const [editorSessionId, setEditorSessionId] = useState<string>();
  const [chatBusy, setChatBusy] = useState(false);
  useEffect(() => {fetch('/api/assets').then((response) => response.json()).then((assets) => {if (Array.isArray(assets)) setJob((current) => ({...current, assets}));}).catch(() => setError('请先运行 npm start 启动渲染服务'));}, []);

  function generateStoryboard() {
    try {
    const scenes = createDemoStoryboard(job.topic, job.assets, job.template);
    validateStoryboard(scenes);
    setStoryboard(scenes);
    setRender(null);
    setError('');
    setStage('storyboard');
    setActiveScene(0);
    } catch (failure) {setError((failure as Error).message);}
  }

  async function startRender() {
    try {
    validateStoryboard(storyboard);
    setError('');
    setStage('render');
    setIsRendering(true);
    setRender(null);
    setRenderProgress(0);
    const response = await fetch('/api/render', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({scenes: storyboard})});
    const created = await response.json();
    if (!response.ok) throw new Error(created.message);
    setRenderJobId(created.id);
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const poll = await fetch(`/api/render/${created.id}`);
      const state = await poll.json();
      if (!poll.ok) throw new Error(state.message);
      setRenderProgress(state.progress);
      setRenderStage(state.stage);
      if (state.status === 'failed') {if (state.result) setRender(state.result); throw new Error(state.error ?? '质检未通过，请检查报告');}
      if (state.status === 'complete') {setRender(state.result); break;}
    }
    setStage('complete');
    } catch (failure) {setError((failure as Error).message);}
    finally {
    setIsRendering(false);
    }
  }

  async function exportJianying() {
    if (!renderJobId) return;
    setError('正在整理剪映草稿包…');
    try {
      const response = await fetch('/api/export/jianying', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: renderJobId, scenes: storyboard})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setJianyingUrl(result.downloadUrl);
      setError('');
    } catch (failure) {setError((failure as Error).message);}
  }

  async function submitChatEdit() {
    const request = chatInput.trim();
    if (!request || chatBusy) return;
    setChatBusy(true);
    setError('');
    try {
      const response = await fetch('/api/editor/chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({sessionId: editorSessionId, message: request, scenes: storyboard.length ? storyboard : createDemoStoryboard(job.topic, job.assets, job.template)})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setEditorSessionId(result.sessionId);
      setChatLog((current) => [...current, `你：${request}`, `剪辑助手：${result.reply}`]);
      if (JSON.stringify(result.scenes) !== JSON.stringify(storyboard)) {
        setStoryboard(result.scenes);
        setStage('storyboard');
        setActiveScene((index) => Math.min(index, result.scenes.length - 1));
        setRender(null);
        setJianyingUrl('');
        setRenderJobId('');
      }
      setChatInput('');
    } catch (failure) {setError((failure as Error).message);}
    finally {setChatBusy(false);}
  }

  function downloadPackage() {
    const payload = JSON.stringify({job, storyboard, render, generatedAt: new Date().toISOString()}, null, 2);
    const url = URL.createObjectURL(new Blob([payload], {type: 'application/json'}));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'weihua-video-line-demo-package.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark"><span className="brand-square">W</span><span>WEIHUA / AI WORKBENCH</span></div>
      <div className="sidebar-title">视频生产线</div>
      <div className="sidebar-subtitle">INDUSTRIAL VIDEO LINE / P0 DEMO</div>
      <div className="nav-group">
        <div className="nav-label">当前任务</div>
        {stageLabels.map((item, index) => <button className={`nav-step ${stage === item.id ? 'active' : ''} ${stageLabels.findIndex((entry) => entry.id === stage) > index ? 'done' : ''}`} key={item.id} disabled={isRendering || (item.id !== 'brief' && item.id !== 'aigc' && !storyboard.length) || (item.id === 'complete' && !render)} onClick={() => setStage(item.id)}><span className="step-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.label}</strong><small>{item.note}</small></span><i>{stageLabels.findIndex((entry) => entry.id === stage) > index ? '✓' : '·'}</i></button>)}
      </div>
      <div className="nav-group lower">
        <div className="nav-label">能力地图</div>
        <div className="capability"><span className="cap-dot live" />素材探测 / 规则分类 <b>P0</b></div>
        <div className="capability"><span className="cap-dot live" />工业故事板模板 <b>P0</b></div>
        <div className="capability"><span className="cap-dot live" />Remotion 包装渲染 <b>P0</b></div>
        <div className="capability"><span className="cap-dot live" />AIGC Skills / Magpie <b>LOOMI</b></div>
        <div className="capability muted"><span className="cap-dot plan" />名场面穿越 Skill（独立） <b>SKILL</b></div>
      </div>
      <div className="sidebar-footer"><span className="status-pulse" />演示模式已就绪<div>本地素材 · 确定性流程 · 可复演</div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">WORKFLOW / {stage.toUpperCase()}</span><h1>{stage === 'brief' ? '新建一条工业宣传片' : stage === 'storyboard' ? '故事板：镜头先于剪辑确定' : stage === 'aigc' ? 'AIGC 工坊：把缺口交给生成 Agent' : stage === 'render' ? '渲染与质检：把口径锁进成片' : '交付：一条可核对的演示片'}</h1></div><div className="topbar-meta"><span className="red-tag">LOOMI / P0</span><span>2026.11.10</span><span className="avatar">卫</span></div></header>
      <div className="content-wrap">
        {error && <div className="notice" role="alert">{error}</div>}
        {chatBusy && <p role="status">剪辑助手正在处理…</p>}
        <div className="mode-note">自然对话式剪辑 · 本地规则编排 · 中文配音 · 实际 MP4 渲染。名场面穿越是独立 Skill，不会被当成故事板模板。</div>
        {stage === 'brief' && <label className="upload-button">＋ 上传图片或视频<input type="file" accept=".jpg,.jpeg,.png,.mp4,.mov,.webm" onChange={async (event) => {const file = event.target.files?.[0]; if (!file) return; const form = new FormData(); form.append('file', file); setError('正在上传和探测素材…'); try {const response = await fetch('/api/assets', {method: 'POST', body: form}); const asset = await response.json(); if (!response.ok) throw new Error(asset.message); setJob((current) => ({...current, assets: [...current.assets.filter((item) => item.id !== asset.id), asset]})); setError('');} catch (failure) {setError((failure as Error).message);}}} /></label>}
        {stage === 'storyboard' && storyboard[activeScene] && <div className="scene-editor"><label>镜头素材<select value={storyboard[activeScene].assetId} onChange={(event) => setStoryboard(storyboard.map((scene, index) => index === activeScene ? {...scene, assetId: event.target.value} : scene))}>{job.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label><label>配音 / 字幕<textarea value={storyboard[activeScene].narration} onChange={(event) => setStoryboard(storyboard.map((scene, index) => index === activeScene ? {...scene, narration: event.target.value} : scene))} /></label><label>时长（秒）<input type="number" min="2" max="30" value={storyboard[activeScene].seconds} onChange={(event) => setStoryboard(storyboard.map((scene, index) => index === activeScene ? {...scene, seconds: Number(event.target.value)} : scene))} /></label></div>}
        {stage === 'aigc' && <AigcStudio />}
        {isRendering && <p role="status">{renderStage} · {renderProgress}%</p>}
        {render?.outputUrl && !isRendering && <div className="actual-film"><video controls src={render.outputUrl} /><div><a href={render.outputUrl} download="卫华-演示成片.mp4">下载 MP4 成片 ↓</a><a href={render.reportUrl} target="_blank">查看真实质检报告 ↗</a></div></div>}
        {!isRendering && <EditorChat value={chatInput} onChange={setChatInput} messages={chatLog} busy={chatBusy} onSubmit={submitChatEdit} />}
        {stage === 'brief' && <Brief job={job} setJob={setJob} onGenerate={generateStoryboard} />}
        {stage === 'storyboard' && <Storyboard job={job} storyboard={storyboard} activeScene={activeScene} setActiveScene={setActiveScene} onRender={startRender} />}
        {(stage === 'render' || stage === 'complete') && <RenderView job={job} storyboard={storyboard} activeScene={activeScene} setActiveScene={setActiveScene} render={render} isRendering={isRendering} progress={renderProgress} onDownload={downloadPackage} onExportJianying={exportJianying} jianyingUrl={jianyingUrl} onBack={() => setStage('storyboard')} />}
      </div>
    </main>
  </div>;
}

function Brief({job, setJob, onGenerate}: {job: ReturnType<typeof createInitialJob>; setJob: React.Dispatch<React.SetStateAction<ReturnType<typeof createInitialJob>>>; onGenerate: () => void}) {
  return <div className="brief-layout"><section className="brief-main"><div className="section-kicker">01 / 任务简报</div><div className="brief-title">一句主题，<em>一条成片。</em></div><p className="lede">选择一个工业叙事模板，放入素材。系统会先锁定故事板和参数出处，再决定每个镜头如何落位。</p><label className="field-label">这条片子讲什么？<span>≤ 50 字</span></label><textarea value={job.topic} onChange={(event) => setJob({...job, topic: event.target.value})} className="topic-input" />
    <div className="template-row"><label className="field-label">选择叙事模板</label><div className="template-grid"><TemplateCard active={job.template === 'mega-equipment'} id="mega-equipment" title="超大设备科普" duration="60 s" description="航拍 / 结构 / 参数 / 提升" onClick={() => setJob({...job, template: 'mega-equipment'})} /><TemplateCard active={job.template === 'smart-factory'} id="smart-factory" title="智能工厂宣传" duration="45 s" description="数据 / 人机 / 协同 / 品牌" onClick={() => setJob({...job, template: 'smart-factory'})} /></div></div>
    <div className="brief-actions"><button className="primary-button" onClick={onGenerate}>生成故事板 <span>→</span></button><span className="action-note"><b>本地模板即时生成</b><br />素材分类 + 模板匹配 + 数字校验</span></div>
  </section><section className="brief-side"><div className="side-heading"><span>素材池 / DEMO ASSETS</span><b>{job.assets.length} 段</b></div><div className="asset-stack">{job.assets.map((asset) => <div className="asset-row" key={asset.id}><img src={asset.image} /><div><strong>{asset.name}</strong><small>{asset.label}</small></div><span>✓</span></div>)}</div><div className="asset-note"><span>ⓘ</span><p>内置卫华公开照片与本地结构示意，可上传图片或视频替换。镜头分类使用文件名规则，尚未接视觉模型。</p></div></section></div>;
}

function TemplateCard({active, title, duration, description, onClick}: {active: boolean; id: string; title: string; duration: string; description: string; onClick: () => void}) { return <button className={`template-card ${active ? 'selected' : ''}`} onClick={onClick}><span className="template-bar" /><span className="template-duration">{duration}</span><strong>{title}</strong><small>{description}</small><i>{active ? '✓' : '○'}</i></button>; }

function Storyboard({job, storyboard, activeScene, setActiveScene, onRender}: {job: ReturnType<typeof createInitialJob>; storyboard: StoryboardScene[]; activeScene: number; setActiveScene: (index: number) => void; onRender: () => void}) { const scene = storyboard[activeScene]; const asset = findAsset(job, scene.assetId); const templateName = job.template === 'mega-equipment' ? '超大设备科普' : '智能工厂宣传'; return <div className="story-layout"><section className="story-main"><div className="section-kicker">02 / 自动故事板 <span className="success-chip">✓ 口径已锁定</span></div><div className="story-header"><div><h2>{job.topic}</h2><p>模板：{templateName} · 16:9 · 1920 × 1080 · 30 fps</p></div><button className="primary-button small" onClick={onRender}>确认并渲染 <span>→</span></button></div><div className="story-table">{storyboard.map((item, index) => <button className={`story-row ${index === activeScene ? 'selected' : ''}`} key={item.id} onClick={() => setActiveScene(index)}><span className="scene-no">{item.id}</span><span className="scene-time">{item.time}</span><span className="scene-thumb"><img src={findAsset(job, item.assetId).image} /></span><span className="scene-copy"><strong>{item.title}</strong><small>{item.narration}</small></span><span className="scene-overlay">{item.claim ? <><b>{item.claim.value}</b><small>{item.claim.label}</small></> : <><b>{item.overlay}</b><small>包装字幕</small></>}</span><span className="scene-check">✓</span></button>)}</div></section><aside className="story-inspector"><div className="inspector-image"><img src={asset.image} /><span>{asset.label}</span><div className="scanline" /></div><div className="inspector-block"><span className="field-label">当前镜头 / {scene.id}</span><h3>{scene.title}</h3><p>{scene.narration}</p></div><div className="inspector-block"><span className="field-label">镜头理由</span><p className="reason"><b>匹配 {asset.role}</b><br />按素材标签匹配“{scene.transition}”；画面质量需预览确认。</p></div>{scene.claim && <div className="claim-card"><span>CLAIM / 数字出处</span><strong>{scene.claim.value}</strong><small>{scene.claim.label}</small><p><a href="https://www.cranewh.com/detail/5739.html" target="_blank" rel="noreferrer">卫华官网原文 ↗</a></p><i>↗ 可追溯</i></div>}<div className="inspector-foot"><span>素材来源</span><b>本地演示素材</b></div></aside></div>; }

function RenderView({job, storyboard, activeScene, setActiveScene, render, isRendering, progress, onDownload, onExportJianying, jianyingUrl, onBack}: {job: ReturnType<typeof createInitialJob>; storyboard: StoryboardScene[]; activeScene: number; setActiveScene: (index: number) => void; render: RenderResult | null; isRendering: boolean; progress: number; onDownload: () => void; onExportJianying: () => void; jianyingUrl: string; onBack: () => void}) { const scene = storyboard[activeScene] ?? storyboard[0]; const asset = scene ? findAsset(job, scene.assetId) : job.assets[0]; return <div className="render-layout"><section className="render-main"><div className="section-kicker">03 / 渲染与质检 {isRendering ? <span className="rendering-chip">● 正在渲染</span> : <span className="success-chip">{render ? (render.status === 'complete' ? '已导出' : '质检失败') : '尚未渲染'}</span>}</div><div className="video-stage"><img src={asset.image} /><div className="video-vignette" /><div className="hud-corner top-left" /><div className="hud-corner top-right" /><div className="hud-top"><span>WEIHUA / INDUSTRIAL VIDEO LINE</span><b>REC · 00:{String(scene?.seconds ?? 0).padStart(2, '0')}</b></div>{scene?.claim && <div className="video-claim"><small>{scene.claim.label}</small><strong>{scene.claim.value}</strong><span>{scene.claim.source}</span></div>}<div className="video-caption">{scene?.narration}</div><div className="video-bottom"><span>01</span><div className="video-progress"><i style={{width: `${((activeScene + 1) / storyboard.length) * 100}%`}} /></div><span>{String(storyboard.length).padStart(2, '0')}</span></div><div className="video-title">{scene?.title}</div>{isRendering && <div className="render-overlay"><div className="render-number">{progress}<small>%</small></div><span>Remotion 正在组合镜头 / 包装 / 字幕</span><div className="big-progress"><i style={{width: `${progress}%`}} /></div></div>}</div><div className="filmstrip">{storyboard.map((item, index) => <button key={item.id} className={index === activeScene ? 'active' : ''} onClick={() => setActiveScene(index)}><img src={findAsset(job, item.assetId).image} /><span>{item.id}</span></button>)}</div></section><aside className="qc-panel"><div className="qc-heading"><div><span className="field-label">QC GATE / 质检门禁</span><h2>{isRendering ? '正在检查…' : render?.status === 'complete' ? '成片已导出' : render ? '质检未通过' : '等待渲染'}</h2></div><span className="qc-score">{render?.status === 'complete' ? '已导出' : render ? 'FAIL' : '—'}</span></div>{render?.checks.map((check) => <div className="qc-row" key={check.label}><span className="check-icon">{check.status === 'pass' ? '✓' : '!'}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div><b>{check.status === 'pass' ? '通过' : check.status === 'warning' ? '待人工检查' : '未通过'}</b></div>)}{!render && !isRendering && <div className="empty-qc">点击“确认并渲染”后，系统会在这里检查参数、黑屏、冻结帧和字幕安全区。</div>}<div className="qc-footer"><div><span>输出规格</span><b>1920 × 1080 / 30 fps</b></div><div><span>IP 出镜</span><b className="muted-text">本 P0 暂不加载</b></div><button className="primary-button" disabled={!render || isRendering} onClick={onDownload}>下载演示包 <span>↓</span></button><button className="primary-button" disabled={!render || render.status !== 'complete' || isRendering} onClick={onExportJianying}>导出剪映草稿 <span>↗</span></button>{jianyingUrl && <a className="text-button" href={jianyingUrl} download>下载剪映草稿包</a>}<button className="text-button" disabled={isRendering} onClick={onBack}>返回修改故事板</button></div></aside></div>; }

