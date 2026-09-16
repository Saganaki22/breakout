import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decayCombo, keyboardTarget, readBestScore } from '../src/gameplay.ts';
test('combo decay is consistent at 30, 60 and 120 Hz', () => {
  for (const hz of [30, 60, 120]) {
    let result = { combo: 99, clock: 0.2 };
    for (let i = 0; i < hz; i++) result = decayCombo(result.combo, result.clock, 1 / hz, false);
    assert.equal(result.combo, 87);
  }
});
test('combo grace, floor and fever protection', () => {
  assert.equal(decayCombo(20, 1, .1, false).combo, 20);
  assert.equal(decayCombo(2, 0, 1, false).combo, 1);
  assert.ok(decayCombo(99, 0, 1, true).combo > decayCombo(99, 0, 1, false).combo);
});
test('keyboard can cross the arena and stops at walls', () => {
  assert.equal(keyboardTarget(800, -1, 1, 170, 1430), 170);
  assert.equal(keyboardTarget(800, 1, 1, 170, 1430), 1430);
  assert.equal(keyboardTarget(300, 0, 1, 170, 1430), 300);
});
test('invalid or blocked storage cannot break startup', () => {
  for (const value of [null, 'NaN', 'Infinity', '-10', '{}']) assert.equal(readBestScore({ getItem: () => value }), 0);
  assert.equal(readBestScore({ getItem: () => '12345.9' }), 12345);
  assert.equal(readBestScore({ getItem: () => { throw Error('denied'); } }), 0);
});
