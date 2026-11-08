import {useEffect, useRef, useState} from 'react';

export function EditorChat({value, onChange, messages, busy, onSubmit}: {
  value: string; onChange: (value: string) => void; messages: string[]; busy: boolean; onSubmit: () => void;
}) {
  const [runtime, setRuntime] = useState('正在连接');
  const [hasSkill, setHasSkill] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch('/api/skills').then((response) => response.json()).then((data) => {
      setRuntime(data.runtime === 'claude-agent-sdk' ? 'Agent 已连接' : '快捷指令 · 可配置 Agent 模型');
      setHasSkill(Boolean(data.skills?.some((skill: {name: string}) => skill.name === '名场面穿越')));
    }).catch(() => setRuntime('等待剪辑服务'));
  }, []);
  useEffect(() => {end.current?.scrollIntoView({block: 'nearest'});}, [messages]);
  return <section className="chat-edit" aria-label="对话剪辑">
    <div className="chat-heading"><strong>和剪辑助手聊聊</strong><span>{runtime}</span></div>
    <div className="chat-log" aria-live="polite">{messages.map((message, index) => <p key={index}>{message}</p>)}<div ref={end} /></div>
    <div className="chat-examples">
      {['节奏太慢，快一点', '把第 3 段缩短到 6 秒', '删掉最后一段'].map((example) => <button key={example} disabled={busy} onClick={() => onChange(example)}>{example}</button>)}
      {hasSkill && <button disabled={busy} onClick={() => onChange('调用名场面穿越 Skill，先读取现有脚本和项目进度，不修改已有脚本和关键帧')}>＋ 名场面穿越 Skill</button>}
    </div>
    <form onSubmit={(event) => {event.preventDefault(); if (!busy) onSubmit();}}>
      <textarea aria-label="剪辑要求" value={value} disabled={busy} onChange={(event) => onChange(event.target.value)} placeholder="告诉我想怎么剪、哪一段太慢，或要调用哪个 Skill…" />
      <button className="primary-button small" type="submit" disabled={busy || !value.trim()}>{busy ? '处理中…' : '发送 ↑'}</button>
    </form>
  </section>;
}
