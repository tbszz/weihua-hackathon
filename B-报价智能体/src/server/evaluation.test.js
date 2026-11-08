import test from 'node:test';
import assert from 'node:assert/strict';
import { runEvaluation } from './evaluation.js';

test('evaluation runs fixed regression cases and reports their actual expected and observed results', () => {
  const report = runEvaluation();
  assert.ok(report.total >= 8);
  assert.equal(report.passed + report.failed, report.total);
  assert.equal(report.failed, 0);
  assert.ok(report.cases.every((item) => typeof item.passed === 'boolean' && item.expected && item.actual));
  assert.match(report.scope_note, /回归/);
});
