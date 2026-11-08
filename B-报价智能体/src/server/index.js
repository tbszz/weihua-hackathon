import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createQuoteResult,
} from './quote-engine.js';
import { TaskStore } from './task-store.js';
import { runEvaluation } from './evaluation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const publicDir = path.join(root, 'public');
const demoPath = path.join(root, 'data/demo-protocol.txt');
const tasks = await TaskStore.open(process.env.QUOTE_TASKS_FILE || path.join(root, 'data/runtime/tasks.json'));

const samplePayload = {
  filename: '演示协议-华北钢厂桥机.txt',
  text: await fs.readFile(demoPath, 'utf8'),
};

function sendJson(res, status, body) {
  const content = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(content);
}

function sendText(res, status, content, contentType = 'text/plain; charset=utf-8', filename) {
  const headers = { 'Content-Type': contentType };
  if (filename) headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(filename)}"`;
  res.writeHead(status, headers);
  res.end(content);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function riskCsv(analysis) {
  const header = ['序号', '条款号', '原文摘录', '类型', '等级', '风险说明', '建议应答'];
  const rows = analysis.risks.map((item, index) => [index + 1, item.clause_no, item.quote, item.type, item.level, item.explain, item.suggested_reply]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

function paramsCsv(analysis) {
  const header = ['条款号', '协议内容', '标签', '类别', '结论'];
  const rows = analysis.judgements.map((item) => [item.clause_no, item.quote, item.label_final, item.category, item.reason]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

function sopMarkdown(analysis) {
  const entries = analysis.knowledge.filter((entry) => entry.status === '已入库' || entry.status === '待组长审核');
  return `# 卫华 AI 工作台 · 报价知识 SOP\n\n- 协议：${analysis.filename}\n- 规则版本：${analysis.rules_version}\n- 审核状态：AI 草稿，经报价员确认后生效\n\n## 检查清单\n\n${entries.length ? entries.map((entry, index) => `${index + 1}. **${entry.category}**：${entry.clause_example} → ${entry.judgement}。${entry.quote_idea}`).join('\n') : '暂无人工改判条目。'}\n`;
}

async function serveStatic(res, pathname) {
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  const target = path.resolve(publicDir, file);
  if (!target.startsWith(publicDir)) return sendText(res, 403, 'Forbidden');
  try {
    const body = await fs.readFile(target);
    const ext = path.extname(target);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return sendJson(res, 200, { ok: true, service: 'quote-agent', rules_version: 'QT-RULES v0.3-demo' });
    if (req.method === 'GET' && url.pathname === '/api/demo') return sendJson(res, 200, samplePayload);
    if (req.method === 'GET' && url.pathname === '/api/tasks') return sendJson(res, 200, { tasks: tasks.list(), current_task_id: tasks.currentId });
    if (req.method === 'GET' && url.pathname.startsWith('/api/tasks/')) {
      return sendJson(res, 200, tasks.get(decodeURIComponent(url.pathname.slice('/api/tasks/'.length))));
    }
    if (req.method === 'GET' && url.pathname === '/api/knowledge') return sendJson(res, 200, { entries: tasks.knowledge() });
    if (req.method === 'GET' && url.pathname === '/api/evaluation') return sendJson(res, 200, runEvaluation());
    if (req.method === 'POST' && url.pathname === '/api/analyze') {
      const body = await readBody(req);
      if (!body.text?.trim()) return sendJson(res, 400, { error: '协议内容不能为空' });
      const analysis = await tasks.analyze({ filename: body.filename || '上传协议.txt', text: body.text });
      return sendJson(res, 200, analysis);
    }
    if (req.method === 'POST' && url.pathname === '/api/review') {
      const body = await readBody(req);
      const result = await tasks.review(body.task_id, body);
      return sendJson(res, 200, result);
    }
    if (req.method === 'POST' && url.pathname === '/api/approve-knowledge') {
      const body = await readBody(req);
      const result = await tasks.decide(body.task_id, body);
      return sendJson(res, 200, result);
    }
    if (req.method === 'GET' && url.pathname === '/api/export') {
      const currentAnalysis = tasks.get(url.searchParams.get('task_id') || undefined);
      const kind = url.searchParams.get('kind') || 'quote-result';
      if (kind === 'quote-result') return sendJson(res, 200, createQuoteResult(currentAnalysis));
      if (kind === 'risk-csv') return sendText(res, 200, riskCsv(currentAnalysis), 'text/csv; charset=utf-8', '协议风险提示及技术偏离表.csv');
      if (kind === 'params-csv') return sendText(res, 200, paramsCsv(currentAnalysis), 'text/csv; charset=utf-8', '需求参数表.csv');
      if (kind === 'sop-md') return sendText(res, 200, sopMarkdown(currentAnalysis), 'text/markdown; charset=utf-8', '报价知识SOP.md');
      return sendJson(res, 400, { error: '不支持的导出类型' });
    }
    if (req.method === 'GET') return serveStatic(res, url.pathname);
    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 400, { error: error.message || '请求处理失败' });
  }
});

const requestedPort = Number(process.env.PORT || 4173);
let listeningPort = requestedPort;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && listeningPort < requestedPort + 10) {
    console.warn(`Port ${listeningPort} is busy; trying ${listeningPort + 1}`);
    server.listen(++listeningPort, '127.0.0.1');
    return;
  }
  throw error;
});
server.on('listening', () => console.log(`Quote Agent P0 running at http://127.0.0.1:${server.address().port}`));
server.listen(listeningPort, '127.0.0.1');

export { server };
