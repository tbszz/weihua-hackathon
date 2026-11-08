import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeQuote, reviewJudgement } from './quote-engine.js';

export class TaskStore {
  static async open(filename) {
    const store = new TaskStore(filename);
    if (filename) {
      try {
        const data = JSON.parse(await fs.readFile(filename, 'utf8'));
        store.tasks = new Map(data.tasks.map((task) => [task.task_id, task]));
        store.currentId = data.current_id;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    return store;
  }

  constructor(filename) {
    this.filename = filename;
    this.tasks = new Map();
    this.currentId = null;
    this.pendingSave = Promise.resolve();
  }

  get(id = this.currentId) {
    const task = this.tasks.get(id);
    if (!task) throw new Error('任务不存在，请从任务列表选择或载入协议');
    return task;
  }

  list() {
    return [...this.tasks.values()].reverse().map((task) => ({
      task_id: task.task_id, filename: task.filename, created_at: task.created_at,
      judgement_count: task.judgements.length, risk_count: task.risks.length,
      pending_knowledge: task.knowledge.filter((entry) => entry.status === '待组长审核').length,
    }));
  }

  knowledge() {
    return [...this.tasks.values()].reverse().flatMap((task) => task.knowledge.map((entry) => ({
      ...entry, task_id: task.task_id, filename: task.filename,
    })));
  }

  async save() {
    if (!this.filename) return;
    const snapshot = JSON.stringify({ current_id: this.currentId, tasks: [...this.tasks.values()] }, null, 2);
    this.pendingSave = this.pendingSave.catch(() => {}).then(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      await fs.writeFile(`${this.filename}.tmp`, snapshot, 'utf8');
      await fs.rename(`${this.filename}.tmp`, this.filename);
    });
    await this.pendingSave;
  }

  async analyze(input) {
    const task = analyzeQuote(input);
    this.tasks.set(task.task_id, task);
    this.currentId = task.task_id;
    await this.save();
    return task;
  }

  async review(taskId, input) {
    const result = reviewJudgement(this.get(taskId), input);
    // Counts are displayed in the task summary and in exported QuoteResult.
    for (const label of Object.keys(result.analysis.counts)) {
      result.analysis.counts[label] = result.analysis.judgements.filter((item) => item.label_final === label).length;
    }
    this.tasks.set(result.task_id, result.analysis);
    await this.save();
    return result;
  }

  async decide(taskId, { id, decision = 'approve', reviewer = '组长B', reason = '' }) {
    const task = this.get(taskId);
    const entry = task.knowledge.find((item) => item.id === id);
    if (!entry) throw new Error('找不到知识条目');
    if (!['approve', 'reject'].includes(decision)) throw new Error('不支持的审核动作');
    if (decision === 'reject' && !reason.trim()) throw new Error('请填写退回理由');
    if (entry.status !== '待组长审核') throw new Error('该条目已审核，请勿重复提交');
    entry.status = decision === 'approve' ? '已入库' : '已退回';
    entry.reviewer = reviewer;
    entry.review_reason = reason.trim();
    entry.reviewed_at = new Date().toISOString();
    await this.save();
    return { entry, analysis: task };
  }
}
