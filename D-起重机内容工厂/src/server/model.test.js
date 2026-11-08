import test from 'node:test';
import assert from 'node:assert/strict';
import { CRANE_PARTS, buildPartTree, explodePosition, getPartById } from '../web/crane-model.js';

test('crane model has a rooted hierarchy with unique part ids', () => {
  const ids = CRANE_PARTS.map((part) => part.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(buildPartTree()[0].id, 'gantry');
  assert.ok(getPartById('upper-drum').parent === 'upper-trolley');
});

test('explosion changes only after the part layer is reached', () => {
  const hook = getPartById('upper-hook');
  assert.deepEqual(explodePosition(hook, 2), hook.position);
  assert.notDeepEqual(explodePosition(hook, 3), hook.position);
});
