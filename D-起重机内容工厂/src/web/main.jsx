import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';




import CraneWorkbench from './components/CraneWorkbench.jsx';
import './styles.css';

const sampleText = '3800t 双主梁门机，跨度 107m，整机高 166.5m，起升高度 130m。上下小车各 1900t，用于浙江温州浙海风母港。';

async function api(path, options) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error((await res.json()).error || '请求失败');
  return res.json();
}

function StatusPill({ children, tone = 'neutral' }) { return <span className={`status-pill ${tone}`}>{children}</span>; }

function App() {
  const [data, setData] = useState(null);
  const [text, setText] = useState(sampleText);
  const [tab, setTab] = useState('spec');
  const [showInfo,setShowInfo]=useState(false);
  const [expanded, setExpanded] = useState('A1');
  const [scene, setScene] = useState(null);
  const [claimsOverride, setClaimsOverride] = useState(null);
  const [selectedScene, setSelectedScene] = useState('scene-a');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [delivery, setDelivery] = useState(null);
  const [health, setHealth] = useState('检查中');

  useEffect(() => { api('/api/bootstrap').then(setData).then(() => setHealth('API 在线')).catch(() => setHealth('API 未连接')); }, []);
  const spec = data?.defaultSpec;
  const activeSpec = data?.spec || spec;
  const activeValidation = data?.validation;
  const officialCount = activeSpec ? Object.entries(activeSpec.fields).filter(([key,f]) => ['ratedLoad_t','span_m','overallHeight_m','liftHeight_m','site'].includes(key) && f.status === 'official').length : 0;
  const levels = ['整机', '结构', '机构', '零部件'];
  const chosenCandidate = scene?.candidates?.find((item) => item.id === selectedScene);
  const validation = delivery?.checks ? delivery : activeValidation;

  async function parse() {
    setBusy(true); setToast('正在抽取规格并回指官方参数…');
    try { const next = await api('/api/parse', { method: 'POST', body: JSON.stringify({ text }) }); setData((current) => ({ ...current, ...next })); setDelivery(null); setClaimsOverride(null); setToast('规格已更新，待确认项会在发布前拦截。'); } catch (error) { setToast(error.message); } finally { setBusy(false); }
  }
  async function compose() {
    setBusy(true); setToast('正在检查照片并加载场景候选…');
    try { setScene(await api('/api/scene-compose', { method: 'POST', body: JSON.stringify({ filename: 'factory-reference.jpg' }) })); setToast('已载入本地缓存候选，结果标记为演示示意。'); } catch (error) { setToast(error.message); } finally { setBusy(false); }
  }
  async function deliver() {
    setBusy(true); setToast('正在执行参数一致性校验…');
    try { const result = await api('/api/validate', { method: 'POST', body: JSON.stringify({ spec: activeSpec, claims: claimList }) }); setDelivery(result); setToast(result.valid ? '校验通过，素材已进入交付模拟。' : '校验未通过，请处理待确认参数或文案口径。'); } catch (error) { setToast(error.message); } finally { setBusy(false); }
  }
  const claimList = claimsOverride || scene?.claims || data?.claims || [];
  function confirmClaims() {
    setClaimsOverride(claimList.map((claim) => ({ ...claim, status: 'official' })));
    setToast('已记录人工确认，下一步可运行一致性校验。');
  }
  const canDeliver = Boolean(delivery?.valid || claimsOverride);

  if (!data) return <div className="loading-screen"><div className="loading-mark">WH</div><p>正在加载内容工厂…</p></div>;
  return <div className="app-shell focused-studio">
    <header className="studio-header">
      <div className="studio-brand"><b>WEIHUA</b><span>起重机内容工厂</span></div>
      <nav><button className={tab==='spec'?'active':''} onClick={()=>setTab('spec')}>3D 科普</button><button className={tab==='scene'?'active':''} onClick={()=>setTab('scene')}>现场效果</button><button className={tab==='publish'?'active':''} onClick={()=>setTab('publish')}>交付</button></nav>
      <button className="info-toggle" onClick={()=>setShowInfo(v=>!v)}>{showInfo?'关闭资料':'资料与参数'} ↗</button>
    </header>
    <div className="workspace">
      <main className="main-content">

        {tab === 'spec' && <section className="spec-view"><CraneWorkbench spec={activeSpec} />
          <div className="parameter-drawer" hidden={!showInfo}><div className="parameter-drawer-head"><h2>资料与参数</h2><button aria-label="关闭资料" onClick={()=>setShowInfo(false)}>×</button></div><div className="reference-gallery"><a href="/references/3800t-official-render.jpg" target="_blank"><img src="/references/3800t-official-render.jpg" alt="卫华3800t官方效果图"/><span>3800t 官方效果图 ↗</span></a><a href="/references/3800t-official-site.jpg" target="_blank"><img src="/references/3800t-official-site.jpg" alt="卫华3800t现场实拍"/><span>整体提升实拍 ↗</span></a><a href="/references/gantry-general-arrangement.pdf" target="_blank"><img src="/references/gantry-general-drawing.png" alt="通用门机布置图"/><span>通用门机图册（非3800t） ↗</span></a></div><div className="input-card panel"><div className="panel-head"><div><span className="section-index">01 / INPUT</span><h3>从官方原文开始</h3></div><StatusPill tone="good">预置型号已载入</StatusPill></div><textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="规格输入" /><div className="input-footer"><span>每个数字都将回指官方参数库，无法核对的字段会阻止交付。</span><button className="primary-btn" disabled={busy} onClick={parse}>{busy ? '处理中…' : '解析并核对 →'}</button></div></div>
          <div className="spec-grid"><div className="panel fields-panel"><div className="panel-head compact"><div><span className="section-index">02 / VERIFIED FIELDS</span><h3>结构化规格</h3></div><span className="mono-count">{officialCount} / 5</span></div><div className="fields-list">{Object.entries(activeSpec.fields).filter(([key]) => ['ratedLoad_t', 'span_m', 'overallHeight_m', 'liftHeight_m', 'site'].includes(key)).map(([key, field]) => <div className="field-row" key={key}><div><span>{field.label || (key === 'site' ? '应用场地' : key)}</span><small>{field.sourceLabel}</small></div><strong>{Array.isArray(field.value) ? field.value.join('–') : field.value}{field.unit && <i>{field.unit}</i>}</strong><StatusPill tone={field.status === 'official' ? 'good' : 'warn'}>{field.status === 'official' ? '官方一致' : '待确认'}</StatusPill></div>)}</div></div>
            <div className="panel source-panel"><div className="panel-head compact"><div><span className="section-index">SOURCE TRACE</span><h3>出处链</h3></div><span className="source-icon">↗</span></div><div className="source-stack"><a href="https://www.cranewh.com/detail/5679.html" target="_blank" rel="noreferrer"><b>5679</b><span>3800t / 跨度 / 双小车</span><em>卫华官网 ↗</em></a><a href="https://www.cranewh.com/detail/5739.html" target="_blank" rel="noreferrer"><b>5739</b><span>166.5m / 130m</span><em>卫华官网 ↗</em></a><a href="https://www.cranewh.com/detail/5585.html" target="_blank" rel="noreferrer"><b>5585</b><span>类比常数来源</span><em>卫华官网 ↗</em></a></div><div className="note-box">{activeSpec.structureNote}<br /><span>技术中心确认前只作宣传示意。</span></div></div></div>
          <div className="panel analogies-panel"><div className="panel-head"><div><span className="section-index">04 / SCALE ANALOGY</span><h3>把吨位翻译成人能感觉到的东西</h3></div><span className="formula-note">计算由代码生成</span></div><div className="analogy-grid">{data.analogies.map((item) => <button key={item.id} className={`analogy-card ${expanded === item.id ? 'expanded' : ''}`} onClick={() => setExpanded(expanded === item.id ? '' : item.id)}><span className="analogy-id">{item.id}</span><span className="analogy-eyebrow">{item.eyebrow}</span><strong>{item.title}</strong>{expanded === item.id && <><div className="analogy-formula">{item.formula}</div><small>{item.source}</small></>}</button>)}</div></div>
        </div></section>}

        {tab === 'scene' && <section className="scene-view"><div className="panel scene-hero"><div className="panel-head"><div><span className="section-index">02 / SITE COMPOSITE</span><h3>把一台新中式桥机放进厂房</h3><p className="panel-subtitle">3800t 港口门机不直接塞进厂房，现场环节切换到常见的新中式吊钩桥式起重机。</p></div><StatusPill tone="warn">缓存演示</StatusPill></div><div className="scene-controls"><label className="upload-zone"><span className="upload-icon">＋</span><b>拖入一张现场照片</b><small>当前使用公开厂房照片作为演示素材</small><input type="file" accept="image/*" onChange={() => setToast('已读取本地照片；本 demo 使用缓存候选演示合成结果。')} /></label><div className="scene-form"><label>型号<select><option>新中式吊钩桥式 · 示例配置</option></select></label><label>跨度<input defaultValue="22.5" /> <i>m</i></label><label>轨面高度<input defaultValue="12" /> <i>m</i></label><button className="primary-btn" disabled={busy} onClick={compose}>{busy ? '处理中…' : '生成 2 张候选 →'}</button></div></div>{scene && <div className="candidate-grid">{scene.candidates.map((candidate) => <button key={candidate.id} className={`candidate ${selectedScene === candidate.id ? 'selected' : ''}`} onClick={() => setSelectedScene(candidate.id)}><div className="candidate-image"><img src={candidate.image} alt="公开厂房演示图" /><div className="overlay-crane"><span /><span /><span /></div><em>{candidate.score} / 5</em></div><div className="candidate-copy"><strong>{candidate.label}</strong><small>{candidate.note}</small></div></button>)}</div>}{!scene && <div className="empty-scene"><span>SCENE PREVIEW</span><strong>照片检查通过后，候选效果图会出现在这里。</strong><small>本地演示素材：Wikimedia Commons · Overhead cranes at Rajaville May 2008</small></div>}</div><div className="claims-layout"><div className="panel claims-panel"><div className="panel-head compact"><div><span className="section-index">AUTO-COPY / CLAIMS</span><h3>现场沟通卖点</h3></div><span className="mono-count">4 条</span></div>{claimList.map((claim) => <div className="claim-row" key={claim.id}><span className="claim-check">✓</span><div><strong>{claim.text}</strong><small>{claim.source}</small></div><StatusPill tone={claim.status === 'official' ? 'good' : 'warn'}>{claim.status === 'official' ? '有出处' : '待确认'}</StatusPill></div>)}</div><div className="panel next-panel"><span className="section-index">NEXT PROVIDER</span><strong>接入图像编辑模型</strong><p>保留 `scene-compose` 接口，把缓存 Provider 换成真实任务；前端不需要改流程。</p><code>provider: cached_demo → image_edit</code></div></div></section>}

        {tab === 'publish' && <section className="publish-view"><div className="panel review-banner"><div className="review-score"><span>PUBLICATION GATE</span><strong>{canDeliver ? 'PASS' : 'HOLD'}</strong></div><div><h3>{canDeliver ? '这批素材可以交给下一条生产线。' : '还有字段需要人工确认。'}</h3><p>{canDeliver ? '规格、类比和出处链已经完成校验。下面的交付动作会创建一个本地 MediaAsset 模拟记录。' : 'P0 规则会阻止未确认数字进入交付。演示默认有一条新中式口径需要宣传部门确认。'}</p></div><div className="review-actions">{!canDeliver && <button className="secondary-btn" onClick={confirmClaims} disabled={busy}>人工确认口径</button>}<button className="primary-btn" onClick={deliver} disabled={busy}>{busy ? '校验中…' : '运行一致性校验 →'}</button></div></div><div className="review-grid"><div className="panel check-panel"><div className="panel-head compact"><div><span className="section-index">CHECKLIST</span><h3>交付前检查</h3></div></div>{(validation?.checks || [{ label: '规格字段可回指官方参数', valid: false, detail: '点击运行校验' }, { label: '类比计算由代码生成', valid: true, detail: '5 组公式可展开复算' }, { label: '卖点出处覆盖', valid: false, detail: '点击运行校验' }]).map((check) => <div className="check-row" key={check.label}><span className={check.valid ? 'check-ok' : 'check-warn'}>{check.valid ? '✓' : '!'}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div></div>)}</div><div className="panel delivery-panel"><div className="panel-head compact"><div><span className="section-index">DELIVERY OBJECT</span><h3>MediaAsset</h3></div><StatusPill tone={delivery?.assetId ? 'good' : 'neutral'}>{delivery?.assetId ? '已创建' : '待创建'}</StatusPill></div><div className="asset-preview"><div className="asset-icon">▧</div><div><strong>{delivery?.assetId || 'studio-p0-preview'}</strong><small>interactive_page · scene_composite · claims</small></div></div>{delivery?.assetId && <div className="success-note">素材已进入本地交付模拟，可供作品 E 读取。</div>}</div></div><div className="panel roadmap-panel"><span className="section-index">P0 STATUS / NEXT</span><div className="roadmap-grid"><div><b className="done-dot">01</b><strong>已完成</strong><span>参数、拆解、类比、缓存效果图、卖点</span></div><div><b className="pending-dot">02</b><strong>下一步</strong><span>真实图像模型与公众号草稿</span></div><div><b className="paused-dot">03</b><strong>待确认</strong><span>3800t 结构、30%口径、VI 与发布凭证</span></div></div></div></section>}
      </main>
    </div>
    {toast && <div className="toast" role="status"><span />{toast}<button onClick={() => setToast('')}>×</button></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
