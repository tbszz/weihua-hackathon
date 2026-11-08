import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalogies, parseInput, validate } from './studio.js';

test('parses the official 3800t preset and derives analogy values', () => {
  const spec = parseInput('3800t 双主梁门机，跨度 107m，整机高 166.5m，起升高度 130m。');
  assert.equal(spec.fields.ratedLoad_t.value, 3800);
  assert.equal(spec.fields.ratedLoad_t.status, 'official');
  assert.equal(spec.fields.overallHeight_m.value, 166.5);
  assert.match(buildAnalogies(spec)[0].title, /2,500/);
  assert.match(buildAnalogies(spec)[2].title, /55 层楼/);
});

test('flags an explicitly changed value for manual confirmation', () => {
  const spec = parseInput('3800t 双主梁门机，跨度 60m，整机高 168m，起升高度 130m。');
  assert.equal(spec.fields.span_m.status, 'pending');
  assert.equal(spec.fields.overallHeight_m.status, 'pending');
  assert.equal(validate(spec).valid, false);
});

test('does not invent values when a field is omitted', () => {
  const spec = parseInput('3800t 门机');
  assert.equal(spec.fields.span_m.value, 107);
  assert.equal(spec.fields.span_m.status, 'official');
});
