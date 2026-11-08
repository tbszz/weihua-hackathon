import test from 'node:test';
import '../../scripts/node-file-reader.js';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCraneAssembly, applyExplosion, disposeObject, inspectAssembly } from '../web/three/assembly.js';
import { encodeGlb, decodeGlb } from '../web/three/glb.js';

test('assembly contains real hoist hardware and a nonempty rooted tree', () => {
  const model = createCraneAssembly();
  const report = inspectAssembly(model);
  assert.ok(report.meshes > 180, 'detailed geometry is present');
  assert.ok(report.parts > 45);
  for (const id of ['upper-motor', 'upper-drum', 'upper-hook', 'upper-pulleys', 'left-wheels']) {
    assert.ok(model.parts.has(id), id + ' exists in model and tree');
    assert.ok(!new THREE.Box3().setFromObject(model.parts.get(id)).isEmpty());
  }
  assert.equal(model.tree[0].id, 'crane');
  disposeObject(model.root);
});

test('changing span preserves height and changes the model footprint', () => {
  const wide = createCraneAssembly({ span: 107, height: 166.5 });
  const narrow = createCraneAssembly({ span: 60, height: 166.5 });
  const a = new THREE.Box3().setFromObject(wide.root).getSize(new THREE.Vector3());
  const b = new THREE.Box3().setFromObject(narrow.root).getSize(new THREE.Vector3());
  assert.ok(a.x > b.x * 1.3);
  assert.ok(Math.abs(a.y - b.y) < 0.01);
  disposeObject(wide.root); disposeObject(narrow.root);
});

test('four explosion stages move hierarchy without corrupting original positions', () => {
  const model = createCraneAssembly();
  const motor = model.parts.get('upper-motor');
  const start = motor.position.clone();
  applyExplosion(model, 2); assert.deepEqual(motor.position.toArray(), start.toArray());
  applyExplosion(model, 3); assert.ok(motor.position.distanceTo(start) > 0.1);
  applyExplosion(model, 0); assert.deepEqual(motor.position.toArray(), start.toArray());
  assert.ok(!new THREE.Box3().setFromObject(model.root).isEmpty());
  disposeObject(model.root);
});

test('binary GLB roundtrip preserves hierarchy, meshes and explosion metadata', async () => {
  const model = createCraneAssembly();
  const buffer = await encodeGlb(model.root);
  assert.equal(new DataView(buffer).getUint32(0, true), 0x46546c67);
  const loaded = await decodeGlb(buffer);
  assert.equal(loaded.parts.size, model.parts.size);
  assert.equal(loaded.parts.get('upper-drum').userData.part.label, '卷筒组');
  assert.equal(inspectAssembly(loaded).meshes, inspectAssembly(model).meshes);
  applyExplosion(loaded, 3);
  disposeObject(model.root); disposeObject(loaded.root);
});

test('GLB rejects invalid input with an actionable error', async () => {
  await assert.rejects(() => decodeGlb(new ArrayBuffer(4)), /GLB/);
});
