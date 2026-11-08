import test from 'node:test';
import assert from 'node:assert/strict';
import { getNavigationTarget } from '../../public/nav-model.js';
import { JSDOM } from 'jsdom';
import fs from 'node:fs/promises';
import { TaskStore } from './task-store.js';
import { runEvaluation } from './evaluation.js';

test('maps every left navigation item to a usable destination', () => {
  assert.deepEqual(getNavigationTarget('review'), { kind: 'workspace', tab: 'findings' });
  assert.deepEqual(getNavigationTarget('tasks'), { kind: 'drawer', view: 'tasks' });
  assert.deepEqual(getNavigationTarget('knowledge'), { kind: 'drawer', view: 'knowledge' });
  assert.deepEqual(getNavigationTarget('evaluation'), { kind: 'drawer', view: 'evaluation' });
});

async function mount(t) {
  const html = await fs.readFile(new URL('../../public/index.html', import.meta.url), 'utf8');
  const script = await fs.readFile(new URL('../../public/app.js', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  const store = await TaskStore.open();
  const demo = { filename: 'demo.txt', text: await fs.readFile(new URL('../../data/demo-protocol.txt', import.meta.url), 'utf8') };
  window.getNavigationTarget = getNavigationTarget;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.fetch = async (input, options = {}) => {
    const url = new URL(input, 'http://localhost');
    const body = JSON.parse(options.body || '{}');
    let data;
    if (url.pathname === '/api/demo') data = demo;
    else if (url.pathname === '/api/tasks') data = { tasks: store.list(), current_task_id: store.currentId };
    else if (url.pathname.startsWith('/api/tasks/')) data = store.get(decodeURIComponent(url.pathname.split('/').at(-1)));
    else if (url.pathname === '/api/analyze') data = await store.analyze(body);
    else if (url.pathname === '/api/knowledge') data = { entries: store.knowledge() };
    else if (url.pathname === '/api/review') data = await store.review(body.task_id, body);
    else if (url.pathname === '/api/approve-knowledge') data = await store.decide(body.task_id, body);
    else if (url.pathname === '/api/evaluation') data = runEvaluation();
    else throw new Error(`Unexpected request: ${url.pathname}`);
    return { ok: true, json: async () => structuredClone(data) };
  };
  window.eval(script.replace(/^import .*nav-model\.js';\r?\n/, ''));
  const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve)); };
  const click = async (selector) => { const node = window.document.querySelector(selector); assert.ok(node, `Expected ${selector}`); node.click(); await settle(); };
  await settle();
  return { document: window.document, store, click, settle, window };
}

test('sidebar opens real task history, reopens an older task, and returns to review', async (t) => {
  const { document, store, click } = await mount(t);
  await click('[data-nav="tasks"]');
  assert.match(document.querySelector('#drawer-content').textContent, /还没有任务/);
  await click('#close-drawer');
  await click('#load-demo');
  const firstId = store.currentId;
  await click('#load-demo');
  await click('[data-nav="tasks"]');
  assert.equal(document.querySelectorAll('[data-task-open]').length, 2);
  await click(`[data-task-open="${firstId}"]`);
  assert.equal(document.querySelector('#task-id').textContent, firstId);
  assert.equal(document.querySelector('#detail-drawer').getAttribute('aria-hidden'), 'true');
  await click('[data-nav="review"]');
  assert.equal(document.querySelector('#tab-findings').classList.contains('active'), true);
});

test('knowledge sidebar approves a draft from its own task, even after opening another protocol', async (t) => {
  const { document, store, click, settle, window } = await mount(t);
  await click('#load-demo');
  const firstId = store.currentId;
  const target = store.get(firstId).judgements.find((item) => item.category === '减速机');
  await click(`[data-judgement-id="${target.id}"]`);
  document.querySelector('#review-label').value = '可偏离';
  document.querySelector('#review-reason').value = '同等品牌需书面申报。';
  document.querySelector('#review-idea').value = '按蒲瑞报价，并保留偏离表。';
  document.querySelector('#review-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await settle();
  await click('#close-drawer');
  await click('#load-demo');
  const secondId = store.currentId;
  await click('[data-nav="knowledge"]');
  assert.match(document.querySelector('#drawer-content').textContent, /同等品牌需书面申报/);
  await click('#drawer-content .approve-btn');
  assert.equal(store.get(firstId).knowledge[0].status, '已入库');
  assert.equal(store.get(secondId).knowledge.length, 0);
  assert.match(document.querySelector('#drawer-content').textContent, /已入库/);
  assert.equal(document.querySelector('#knowledge-count').textContent, '0');
});

test('evaluation sidebar runs the actual regression set and exposes expected and observed outputs', async (t) => {
  const { document, click } = await mount(t);
  await click('[data-nav="evaluation"]');
  assert.match(document.querySelector('#drawer-content').textContent, /11\s*\/\s*11/);
  assert.equal(document.querySelectorAll('.eval-case').length, 11);
  assert.match(document.querySelector('#drawer-content').textContent, /不代表真实协议/);
});
