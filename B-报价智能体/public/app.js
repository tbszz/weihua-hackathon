import { getNavigationTarget } from './nav-model.js';

const state = { analysis: null, activeTab: 'findings', filter: '全部', unconfirmed: false, drawerVersion: 0 };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const labelClass = { '非标': 'nonstandard', '模糊': 'ambiguous', '不满足': 'unsatisfied', '可偏离': 'deviation', '标配': 'standard' };
const labelIcon = { '非标': '●', '模糊': '◐', '不满足': '◆', '可偏离': '◇', '标配': '○' };

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '请求失败');
  return body;
}

async function analyze(filename, text) {
  try {
    state.analysis = await jsonRequest('/api/analyze', { method: 'POST', body: JSON.stringify({ filename, text }) });
    renderAll();
    await refreshNavigationCounts();
    closeDrawer();
    selectNavigation('review');
    selectTab('findings');
    showToast('协议已分析，规则与出处已就绪');
  } catch (error) {
    showToast(error.message);
  }
}

function renderAll() {
  if (!state.analysis) return;
  const analysis = state.analysis;
  $('#filename').textContent = analysis.filename;
  $('#task-id').textContent = analysis.task_id;
  $('#page-count').textContent = `· ${Math.max(1, Math.ceil(analysis.clauses.length / 18))} 页演示`;
  $('#doc-updated').textContent = `解析于 ${new Date(analysis.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  $('#stat-nonstandard').textContent = analysis.counts['非标'] ?? 0;
  $('#stat-ambiguous').textContent = analysis.counts['模糊'] ?? 0;
  $('#stat-unsatisfied').textContent = analysis.counts['不满足'] ?? 0;
  $('#stat-risk').textContent = analysis.risks.length;
  const reviewed = analysis.judgements.filter((item) => item.review_status !== 'pending').length;
  const total = analysis.judgements.length;
  $('#stat-progress').textContent = total ? `${reviewed} / ${total} 已确认` : '无判断';
  $('#progress-bar').style.width = `${total ? (reviewed / total) * 100 : 0}%`;
  $('#finding-count').textContent = total;
  $('#risk-count').textContent = analysis.risks.length;
  $('#kb-count').textContent = analysis.knowledge.length;
  renderDocument();
  renderFindings();
  renderRisks();
  renderKnowledge();
}

function primaryForClause(clauseId) {
  const order = { '不满足': 1, '非标': 2, '模糊': 3, '可偏离': 4, '标配': 5 };
  return state.analysis.judgements.filter((item) => item.clause_id === clauseId).sort((a, b) => order[a.label_final] - order[b.label_final])[0];
}

function renderDocument() {
  const content = $('#document-content');
  content.className = 'document-content';
  content.innerHTML = state.analysis.clauses.map((clause) => {
    const item = primaryForClause(clause.id);
    const mark = item ? `<span class="clause-mark mark-${labelClass[item.label_final]}" data-clause-id="${clause.id}" title="点击查看 ${escapeHtml(item.label_final)} 判断">${escapeHtml(clause.raw)}</span>` : escapeHtml(clause.raw);
    return `<div class="document-line" id="line-${clause.id}" data-clause-id="${clause.id}"><span class="line-no">${String(clause.line).padStart(2, '0')}</span><div class="line-text">${mark}</div></div>`;
  }).join('');
  $$('.clause-mark').forEach((node) => node.addEventListener('click', () => {
    const item = primaryForClause(node.dataset.clauseId);
    if (item) openJudgement(item.id);
  }));
}

function renderFindings() {
  if (!state.analysis) return;
  const list = $('#findings-list');
  const filter = state.filter;
  const items = state.analysis.judgements.filter((item) => (filter === '全部' || item.label_final === filter) && (!state.unconfirmed || item.review_status === 'pending'));
  if (!items.length) { list.innerHTML = '<div class="list-empty">当前筛选下没有条目。</div>'; return; }
  list.innerHTML = items.map((item) => `<article class="finding-item" data-judgement-id="${item.id}">
    <div class="finding-top"><span class="tag ${labelClass[item.label_final]}">${labelIcon[item.label_final]} ${escapeHtml(item.label_final)}</span><span class="finding-category">${escapeHtml(item.category)} · ${escapeHtml(item.clause_no)}</span></div>
    <h3>${escapeHtml(item.reason)}</h3><p>“${escapeHtml(item.quote)}”</p>
    <div class="finding-foot"><span>${escapeHtml(item.rule_ids.join(' / '))} · ${escapeHtml(item.claim.evidence[1]?.locator || '')}</span><span>${item.review_hints.length ? '<b class="hint">⚑ LLM 意见不同</b>' : ''}</span><button>查看依据 →</button></div>
  </article>`).join('');
  $$('.finding-item').forEach((node) => node.addEventListener('click', () => openJudgement(node.dataset.judgementId)));
}

function renderRisks() {
  const list = $('#risks-list');
  if (!state.analysis.risks.length) { list.innerHTML = '<div class="list-empty">没有命中商务风险规则。</div>'; return; }
  list.innerHTML = state.analysis.risks.map((risk) => `<article class="risk-item"><div class="risk-title"><span>${escapeHtml(risk.type)} · ${escapeHtml(risk.clause_no)}</span><span class="risk-level">${escapeHtml(risk.level)}风险</span></div><p>${escapeHtml(risk.explain)}</p><p><strong>建议应答：</strong>${escapeHtml(risk.suggested_reply)}</p></article>`).join('');
}

function renderKnowledge() {
  const list = $('#knowledge-list');
  if (!state.analysis.knowledge.length) { list.innerHTML = '<div class="list-empty">改判一条判断后，这里会自动出现知识条目草稿。</div>'; return; }
  list.innerHTML = state.analysis.knowledge.map((entry) => knowledgeCard(entry, state.analysis.task_id)).join('');
  bindKnowledgeActions(list, false);
}

function openJudgement(id) {
  const item = state.analysis.judgements.find((entry) => entry.id === id);
  if (!item) return;
  state.drawerVersion++;
  const taskId = state.analysis.task_id;
  const line = $(`#line-${item.clause_id}`);
  $$('.document-line.focused').forEach((node) => node.classList.remove('focused'));
  line?.classList.add('focused');
  line?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('#drawer-title').textContent = `${item.category} · ${item.clause_no}`;
  $('#drawer-content').innerHTML = `<div class="detail-section"><div class="detail-label">FINAL JUDGEMENT</div><div class="finding-top" style="margin-top:10px"><span class="tag ${labelClass[item.label_final]}">${labelIcon[item.label_final]} ${escapeHtml(item.label_final)}</span><span class="finding-category">规则判定 ${escapeHtml(item.label_rule)}</span></div><div class="detail-highlight">${escapeHtml(item.reason)}</div>${item.review_hints.length ? `<div class="drawer-note" style="margin-top:10px">⚑ LLM 只提供复核线索：${escapeHtml(item.review_hints.join('；'))} 最终标签由规则与人工复核决定。</div>` : ''}</div>
    <div class="detail-section"><div class="detail-label">原文与依据</div><div class="detail-highlight" style="border-color:#7ba9ca;background:#f4f9fc">“${escapeHtml(item.quote)}”</div><div class="evidence-list">${item.claim.evidence.map((source, index) => `<div class="evidence-item"><b>${index + 1}. ${escapeHtml(source.type)}</b>${escapeHtml(source.locator)}${source.title ? ` · ${escapeHtml(source.title)}` : ''}</div>`).join('')}</div></div>
    <div class="detail-section"><div class="detail-label">报价员改判 / 生成知识条目</div><form class="review-form" id="review-form"><label>改为<select id="review-label">${['标配', '非标', '模糊', '不满足', '可偏离'].map((label) => `<option ${label === item.label_final ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>改判理由*<textarea id="review-reason" placeholder="说明为什么改判，至少写一句可复核理由"></textarea></label><label>报价思路*<textarea id="review-idea" placeholder="例如：按标配报价，偏离表申报品牌替代"></textarea></label><button class="submit-review" type="submit">提交改判，生成知识条目</button></form></div>`;
  $('#detail-drawer').classList.add('open');
  $('#detail-drawer').setAttribute('aria-hidden', 'false');
  $('#review-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const result = await jsonRequest('/api/review', { method: 'POST', body: JSON.stringify({ task_id: taskId, judgement_id: item.id, label: $('#review-label').value, reason: $('#review-reason').value, quote_idea: $('#review-idea').value, reviewer: '报价员A' }) });
      state.analysis = result.analysis;
      renderAll();
      await refreshNavigationCounts();
      openJudgement(item.id);
      $('#drawer-content').insertAdjacentHTML('afterbegin', '<div class="approved-box">改判已写入审计日志，并生成知识条目草稿。当前等待组长审核。</div>');
      showToast('已生成知识条目草稿');
    } catch (error) { showToast(error.message); }
  });
}

function closeDrawer() {
  state.drawerVersion++;
  $('#detail-drawer').classList.remove('open');
  $('#detail-drawer').setAttribute('aria-hidden', 'true');
  selectNavigation('review');
}

function openDrawer(title, html) {
  state.drawerVersion++;
  $('#drawer-title').textContent = title;
  $('#drawer-content').innerHTML = html;
  $('#detail-drawer').classList.add('open');
  $('#detail-drawer').setAttribute('aria-hidden', 'false');
}

async function remoteDrawer(title, url, render) {
  openDrawer(title, '<div class="list-empty" role="status">正在读取…</div>');
  const version = state.drawerVersion;
  try {
    const result = await jsonRequest(url);
    if (version !== state.drawerVersion) return;
    render(result);
  } catch (error) {
    if (version === state.drawerVersion) $('#drawer-content').innerHTML = `<div class="drawer-note">读取失败：${escapeHtml(error.message)}。关闭后重试。</div>`;
  }
}

async function refreshNavigationCounts() {
  const { tasks } = await jsonRequest('/api/tasks');
  $('#task-count').textContent = tasks.length;
  $('#knowledge-count').textContent = tasks.reduce((sum, task) => sum + task.pending_knowledge, 0);
  return tasks;
}

function openTaskList() {
  return remoteDrawer('任务列表', '/api/tasks', ({ tasks }) => {
    const taskHtml = tasks.map((task) => `<article class="task-card"><div class="task-card-top"><span class="tag standard">${task.task_id === state.analysis?.task_id ? '当前任务' : '历史任务'}</span><span class="task-status">${task.pending_knowledge} 条待审核</span></div><h3>${escapeHtml(task.filename)}</h3><p>${escapeHtml(task.task_id)} · ${task.judgement_count} 条判断 · ${task.risk_count} 条风险</p><button class="submit-review" data-task-open="${escapeHtml(task.task_id)}">打开协议审阅</button></article>`).join('');
    $('#drawer-content').innerHTML = `<p class="drawer-copy">协议和改判记录保存在本机，刷新或重启服务后可继续审阅。</p>${taskHtml || '<div class="list-empty">当前还没有任务，请载入演示协议或上传文本。</div>'}<button class="mini-btn" id="new-demo-task">新建演示任务</button>`;
    $$('[data-task-open]').forEach((button) => button.addEventListener('click', () => loadTask(button.dataset.taskOpen)));
    $('#new-demo-task').addEventListener('click', () => { closeDrawer(); $('#load-demo').click(); });
  });
}

async function loadTask(id) {
  try {
    state.analysis = await jsonRequest(`/api/tasks/${encodeURIComponent(id)}`);
    renderAll();
    await refreshNavigationCounts();
    closeDrawer();
    selectTab('findings');
    $('.workspace-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { showToast(error.message); }
}

function knowledgeCard(entry, taskId, filename = '') {
  const pending = entry.status === '待组长审核';
  return `<article class="kb-item"><div class="kb-title"><span>${escapeHtml(entry.category)} · ${escapeHtml(entry.id)}</span><span class="kb-status">${escapeHtml(entry.status)}</span></div>${filename ? `<p>来源任务：${escapeHtml(filename)} · ${escapeHtml(taskId)}</p>` : ''}<p><strong>条款：</strong>${escapeHtml(entry.clause_example)}</p><p><strong>改判理由：</strong>${escapeHtml(entry.reasoning)}</p><p><strong>思路：</strong>${escapeHtml(entry.quote_idea)}</p>${entry.review_reason ? `<p>审核意见：${escapeHtml(entry.review_reason)}</p>` : ''}<div class="kb-actions">${pending ? `<button class="approve-btn" data-kb-id="${escapeHtml(entry.id)}" data-task-id="${escapeHtml(taskId)}">组长通过，入库</button><button class="open-btn reject-btn" data-kb-id="${escapeHtml(entry.id)}" data-task-id="${escapeHtml(taskId)}">退回</button>` : ''}<button class="open-btn audit-btn" data-review-id="${escapeHtml(entry.source.review_record)}" data-task-id="${escapeHtml(taskId)}">查看审计</button></div></article>`;
}

function bindKnowledgeActions(container, queue) {
  container.querySelectorAll('.approve-btn').forEach((button) => button.addEventListener('click', () => decideKnowledge(button, 'approve', '', queue)));
  container.querySelectorAll('.reject-btn').forEach((button) => button.addEventListener('click', () => {
    const card = button.closest('.kb-item');
    if (card.querySelector('.reject-form')) return;
    card.insertAdjacentHTML('beforeend', '<form class="review-form reject-form"><label>退回理由*<textarea required placeholder="说明需要补充的依据"></textarea></label><button class="mini-btn">确认退回</button></form>');
    card.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); decideKnowledge(button, 'reject', card.querySelector('textarea').value, queue); });
  }));
  container.querySelectorAll('.audit-btn').forEach((button) => button.addEventListener('click', () => openAudit(button.dataset.taskId, button.dataset.reviewId)));
}

function openKnowledgeQueue() {
  return remoteDrawer('知识审核', '/api/knowledge', ({ entries }) => {
    $('#drawer-content').innerHTML = `<p class="drawer-copy">汇总所有本地任务的改判条目。这里的组长角色为本地演示，尚未接入真实角色权限。</p>${entries.map((entry) => knowledgeCard(entry, entry.task_id, entry.filename)).join('') || '<div class="list-empty">暂无知识条目，请先在协议审阅中改判一条判断。</div>'}`;
    bindKnowledgeActions($('#drawer-content'), true);
  });
}

async function decideKnowledge(button, decision, reason, queue) {
  button.disabled = true;
  try {
    const result = await jsonRequest('/api/approve-knowledge', { method: 'POST', body: JSON.stringify({ task_id: button.dataset.taskId, id: button.dataset.kbId, decision, reason, reviewer: '组长B' }) });
    if (state.analysis?.task_id === result.analysis.task_id) { state.analysis = result.analysis; renderAll(); }
    await refreshNavigationCounts();
    if (queue) await openKnowledgeQueue();
    showToast(decision === 'approve' ? '知识条目已审核入库' : '知识条目已退回');
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
}

async function openAudit(taskId, reviewId) {
  return remoteDrawer('改判审计', `/api/tasks/${encodeURIComponent(taskId)}`, (task) => {
    const review = task.review_log.find((item) => item.audit_id === reviewId);
    if (!review) { $('#drawer-content').textContent = '未找到对应的审计记录'; return; }
    $('#drawer-content').innerHTML = `<div class="detail-section"><div class="detail-label">${escapeHtml(review.audit_id)}</div><p class="drawer-copy">任务：${escapeHtml(task.filename)}<br>操作人：${escapeHtml(review.reviewer)}<br>判断：${escapeHtml(review.from)} → ${escapeHtml(review.to)}<br>时间：${escapeHtml(review.created_at)}</p><div class="evidence-item"><b>改判理由</b>${escapeHtml(review.reason)}</div><div class="evidence-item"><b>报价思路</b>${escapeHtml(review.quote_idea)}</div><button class="mini-btn" id="back-knowledge">返回知识审核</button></div>`;
    $('#back-knowledge').addEventListener('click', openKnowledgeQueue);
  });
}

function openEvaluation() {
  return remoteDrawer('评测面板', '/api/evaluation', (report) => {
    $('#drawer-content').innerHTML = `<div class="detail-section"><div class="detail-label">规则回归 · ${escapeHtml(report.rules_version)}</div><div class="eval-grid"><div class="eval-card"><strong>${report.passed} / ${report.total}</strong><span>本次通过的用例</span></div><div class="eval-card"><strong>${report.failed}</strong><span>失败用例</span></div></div><p class="drawer-copy">运行时间：${escapeHtml(report.run_at)}</p><div class="drawer-note">${escapeHtml(report.scope_note)}</div><button class="mini-btn" id="rerun-evaluation">重新运行评测</button></div>${report.cases.map((item) => `<article class="eval-case"><strong>${item.passed ? '通过' : '失败'} · ${escapeHtml(item.name)}</strong><p>预期：${escapeHtml(item.expected)}<br>实际：${escapeHtml(item.actual)}</p></article>`).join('')}`;
    $('#rerun-evaluation').addEventListener('click', openEvaluation);
  });
}

async function download(kind) {
  try {
    if (!state.analysis) return showToast('请先载入或打开一份协议');
    const response = await fetch(`/api/export?kind=${kind}&task_id=${encodeURIComponent(state.analysis.task_id)}`);
    if (!response.ok) { const body = await response.json(); throw new Error(body.error); }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const filename = decodeURIComponent(disposition.match(/filename="?([^";]+)"?/)?.[1] || `${kind}.txt`);
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
    showToast(`已下载 ${filename}`);
  } catch (error) { showToast(error.message); }
}

function openFeishuPreview() {
  if (!state.analysis) return showToast('请先载入或上传协议');
  state.drawerVersion++;
  const result = { task_id: state.analysis.task_id, title: `报价审阅完成 · ${state.analysis.filename}`, summary: `非标 ${state.analysis.counts['非标']} / 模糊 ${state.analysis.counts['模糊']} / 不满足 ${state.analysis.counts['不满足']} / 风险 ${state.analysis.risks.length}`, next_step: '请报价组长审核知识条目，并对高风险条款确认应答。', link_payload: 'QuoteResult 可从底部按钮下载后接入飞书机器人。' };
  $('#drawer-title').textContent = '飞书消息预览';
  $('#drawer-content').innerHTML = `<div class="detail-section"><div class="detail-label">QUOTE RESULT → FEISHU</div><div class="approved-box" style="margin-top:10px"><strong>${escapeHtml(result.title)}</strong><br />${escapeHtml(result.summary)}<br /><br />${escapeHtml(result.next_step)}</div><div class="detail-section" style="padding-bottom:0"><div class="detail-label">可复制消息 JSON</div><textarea id="feishu-json" style="width:100%;height:180px;margin-top:10px;border:1px solid #d7e3df;border-radius:6px;padding:10px;font:11px 'DM Mono',monospace">${escapeHtml(JSON.stringify(result, null, 2))}</textarea><button class="submit-review" id="copy-feishu" style="margin-top:10px">复制消息内容</button></div></div>`;
  $('#detail-drawer').classList.add('open'); $('#detail-drawer').setAttribute('aria-hidden', 'false');
  $('#copy-feishu').addEventListener('click', async () => { await navigator.clipboard?.writeText(JSON.stringify(result, null, 2)); showToast('飞书消息 JSON 已复制'); });
}

function selectTab(key) {
  state.activeTab = key;
  $$('.tab').forEach((item) => item.classList.toggle('active', item.dataset.tab === key));
  $$('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${key}`));
}

function selectNavigation(key) {
  $$('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.nav === key);
    if (item.dataset.nav === key) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

$$('.tab').forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
$('#label-filter').addEventListener('change', (event) => { state.filter = event.target.value; renderFindings(); });
$('#unconfirmed-only').addEventListener('change', (event) => { state.unconfirmed = event.target.checked; renderFindings(); });
$('#close-drawer').addEventListener('click', closeDrawer); $('.drawer-backdrop').addEventListener('click', closeDrawer); $('#preview-feishu').addEventListener('click', openFeishuPreview);
$('#load-demo').addEventListener('click', async () => { try { const demo = await jsonRequest('/api/demo'); await analyze(demo.filename, demo.text); } catch (error) { showToast(error.message); } });
$('#file-input').addEventListener('change', async (event) => { const file = event.target.files[0]; if (!file) return; await analyze(file.name, await file.text()); });
$$('[data-export]').forEach((button) => button.addEventListener('click', () => download(button.dataset.export)));
$$('.nav-item').forEach((button) => button.addEventListener('click', () => {
  const target = getNavigationTarget(button.dataset.nav);
  selectNavigation(button.dataset.nav);
  if (target.kind === 'drawer') {
    if (target.view === 'tasks') openTaskList();
    if (target.view === 'knowledge') openKnowledgeQueue();
    if (target.view === 'evaluation') openEvaluation();
    return;
  }
  closeDrawer();
  selectTab(target.tab);
  $('.workspace-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });

async function restoreWorkspace() {
  try {
    const tasks = await refreshNavigationCounts();
    // Restore the most recent saved task after a page refresh.
    if (!state.analysis && tasks.length) {
      const task = await jsonRequest(`/api/tasks/${encodeURIComponent(tasks[0].task_id)}`);
      if (!state.analysis) { state.analysis = task; renderAll(); }
    }
  } catch (error) { showToast(`任务列表读取失败：${error.message}`); }
}
restoreWorkspace();
