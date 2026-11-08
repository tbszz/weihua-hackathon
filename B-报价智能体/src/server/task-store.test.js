import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TaskStore } from './task-store.js';

test('task history persists masked protocols and preserves reviews across task switches', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'quote-history-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await TaskStore.open(path.join(directory, 'tasks.json'));
  const first = await store.analyze({ filename: 'first.txt', text: '联系人：张工，电话 13812345678\n3.4 减速机：SEW 或同等品牌，硬齿面。' });
  const second = await store.analyze({ filename: 'second.txt', text: '1.2 型号规格：QD 32/10t-28.5m A8' });
  const reviewed = await store.review(first.task_id, {
    judgement_id: first.judgements[0].id, label: '可偏离',
    reason: '客户允许同等品牌申报。', quote_idea: '保留品牌偏离清单。',
  });
  const approved = await store.decide(first.task_id, { id: reviewed.knowledge.id, decision: 'approve', reviewer: '组长B' });
  assert.equal(approved.entry.status, '已入库');
  assert.equal(store.get(second.task_id).knowledge.length, 0);
  assert.equal(store.get(first.task_id).counts['可偏离'], 1);
  const loaded = await TaskStore.open(path.join(directory, 'tasks.json'));
  assert.equal(loaded.list().length, 2);
  assert.equal(loaded.knowledge()[0].task_id, first.task_id);
  assert.equal(loaded.get(first.task_id).knowledge[0].status, '已入库');
  assert.doesNotMatch(JSON.stringify(loaded.get(first.task_id)), /13812345678/);
});

test('rejection requires a reason and invalid task ids do not fall back to another task', async () => {
  const store = await TaskStore.open();
  const task = await store.analyze({ filename: 'demo.txt', text: '3.4 减速机：SEW 或同等品牌。' });
  const result = await store.review(task.task_id, { judgement_id: task.judgements[0].id, label: '可偏离', reason: '同等品牌', quote_idea: '申报偏离' });
  await assert.rejects(store.decide(task.task_id, { id: result.knowledge.id, decision: 'reject' }), /退回理由/);
  assert.throws(() => store.get('missing'), /任务不存在/);
  const rejected = await store.decide(task.task_id, { id: result.knowledge.id, decision: 'reject', reason: '缺少客户书面确认。' });
  assert.equal(rejected.entry.status, '已退回');
});
