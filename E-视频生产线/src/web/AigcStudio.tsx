import {useEffect, useState} from 'react';

type Skill = {id: string; name: string; description: string; status: string; tools: string[]};
type Shot = {id: string; seconds: number; role: string; prompt: string; aiLabel: string};
type Plan = {skillId: string; topic: string; durationSeconds: number; aspectRatio: string; shots: Shot[]; guardrails: string[]};
type Task = {task: {id: string; status: string; provider: string; videoUrl?: string; error?: string}; request: {prompt: string}; createdAt: string};

export function AigcStudio() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [provider, setProvider] = useState<'mock' | 'magpie' | 'checking'>('checking');
  const [topic, setTopic] = useState('卫华智能工厂里的重载门机协作');
  const [duration, setDuration] = useState(15);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/aigc/skills').then((response) => response.json()),
      fetch('/api/aigc/health').then((response) => response.json()),
    ]).then(([catalog, health]) => {
      setSkills(Array.isArray(catalog.skills) ? catalog.skills : []);
      setProvider(health.provider === 'magpie' ? 'magpie' : 'mock');
    }).catch(() => {setProvider('mock'); setMessage('服务尚未连接，当前显示本地演示模式');});
  }, []);

  async function buildPlan() {
    setBusy(true); setMessage(''); setTask(null);
    try {
      const response = await fetch('/api/aigc/plan', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({topic, durationSeconds: duration, aspectRatio: '16:9', claims: []})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setPlan(result.plan);
    } catch (error) {setMessage((error as Error).message);}
    finally {setBusy(false);}
  }

  async function generate(shot: Shot) {
    setBusy(true); setMessage(`正在提交 ${shot.id} · 不会自动重复扣费`);
    try {
      const response = await fetch('/api/aigc/videos', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({prompt: shot.prompt, seconds: shot.seconds, size: '1280x720', watermark: true})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setTask(result);
      if (result.task.status === 'queued' || result.task.status === 'running') void poll(result.task.id);
      else setMessage(result.task.provider === 'mock' ? '本地 mock 已完成，可切换到 Magpie 后重试真实生成' : '任务已完成');
    } catch (error) {setMessage((error as Error).message);}
    finally {setBusy(false);}
  }

  async function poll(id: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch(`/api/aigc/videos/${encodeURIComponent(id)}`);
      const result = await response.json();
      if (!response.ok) {setMessage(result.message ?? '任务查询失败'); return;}
      setTask(result);
      if (result.task.status === 'completed' || result.task.status === 'failed') {setMessage(result.task.status === 'completed' ? 'Magpie 视频生成完成' : result.task.error ?? '生成失败'); return;}
    }
    setMessage('任务仍在生成中，可稍后再次打开本页继续查询');
  }

  return <section className="aigc-studio" aria-label="AIGC 工坊">
    <div className="section-kicker">AIGC LAB / LOOMI SKILLS <span className={`provider-chip ${provider}`}>{provider === 'magpie' ? 'MAGPIE 反代在线' : provider === 'mock' ? 'LOCAL MOCK' : 'CHECKING'}</span></div>
    <div className="aigc-header"><div><h2>把缺镜头交给生成 Agent</h2><p>先生成可审核的分镜计划，再按镜头提交 Magpie 任务。所有生成画面带 AI 标识，完成后才能进入剪辑故事板。</p></div><div className="aigc-meter"><strong>{skills.length || 3}</strong><span>skills ready</span></div></div>
    <div className="aigc-grid">
      <div className="aigc-form card-surface"><label className="field-label">你要补什么画面？</label><textarea value={topic} onChange={(event) => setTopic(event.target.value)} /><div className="aigc-form-row"><label><span className="field-label">总时长</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={8}>8 秒</option><option value={15}>15 秒</option><option value={20}>20 秒</option><option value={30}>30 秒</option></select></label><button className="primary-button small" disabled={busy || topic.trim().length < 2} onClick={buildPlan}>{busy ? '处理中…' : '生成计划 →'}</button></div><div className="skill-list">{skills.map((skill) => <div className="skill-row" key={skill.id}><span className="skill-dot" /><div><strong>{skill.name}</strong><small>{skill.description}</small></div><b>{skill.status === 'ready' ? 'READY' : 'PLAN'}</b></div>)}</div></div>
      <div className="aigc-plan card-surface">{plan ? <><div className="plan-heading"><div><span className="field-label">PLAN / {plan.aspectRatio}</span><h3>{plan.topic}</h3></div><span>{plan.durationSeconds}s</span></div><div className="shot-list">{plan.shots.map((shot) => <div className="shot-card" key={shot.id}><div><span>{shot.id} · {shot.seconds}s</span><strong>{shot.role === 'establishing' ? '建立场景' : shot.role === 'detail' ? '结构细节' : shot.role === 'motion' ? '运动跟拍' : '品牌收束'}</strong><p>{shot.prompt}</p></div><button className="text-button" disabled={busy} onClick={() => generate(shot)}>生成此镜</button></div>)}</div><div className="guardrails"><span>门禁</span>{plan.guardrails.map((item) => <small key={item}>✓ {item}</small>)}</div></> : <div className="aigc-empty"><span>✦</span><strong>先描述一个缺口镜头</strong><p>计划会自动拆成 2–4 个镜头，并把事实 Claims 与生成提示词分开。</p></div>}</div>
    </div>
    {task && <div className="aigc-task card-surface"><div><span className="field-label">TASK / {task.task.provider.toUpperCase()}</span><strong>{task.task.id}</strong><small>{task.task.status === 'completed' ? '已完成' : task.task.status === 'failed' ? task.task.error : '排队或生成中'}</small></div>{task.task.videoUrl && <a href={task.task.videoUrl} target="_blank" rel="noreferrer">打开生成结果 ↗</a>}</div>}
    {message && <p className="aigc-message" role="status">{message}</p>}
  </section>;
}

