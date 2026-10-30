import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../scripts/state.js';
import {
  calcOvrFromStats, calcOvr, calcMarketValue, calcSalary,
  calcReleaseClause, getContractYearRange,
} from '../scripts/utils.js';

const originalGame = state.G;
afterEach(() => { state.G = originalGame; });

const stats = (value) => ({
  pace: value, shooting: value, passing: value, dribbling: value, physical: value,
});

test('overall rating reflects the selected playing position', () => {
  const player = { pace: 80, shooting: 90, passing: 60, dribbling: 70, physical: 50 };
  assert.equal(calcOvrFromStats(player, 'striker'), 76);
  assert.equal(calcOvrFromStats(player, 'midfielder'), 69);
  assert.equal(calcOvrFromStats(player, 'defender'), 63);
  assert.equal(calcOvrFromStats(player, 'goalkeeper'), 60);
});

test('overall stays within the playable 40–99 range for every position', () => {
  for (const position of ['striker', 'midfielder', 'defender', 'goalkeeper']) {
    assert.equal(calcOvrFromStats(stats(0), position), 40);
    assert.equal(calcOvrFromStats(stats(150), position), 99);
    assert.equal(calcOvrFromStats(stats(75), position), 75);
  }
});

test('overall uses the current player position and handles an unstarted game', () => {
  state.G = {};
  assert.equal(calcOvr(), 0);
  state.G = { pos: 'defender', stats: {
    pace: 80, shooting: 90, passing: 60, dribbling: 70, physical: 50,
  } };
  assert.equal(calcOvr(), 63);
});

test('a ban makes market value zero even when the player has elite stats', () => {
  state.G = { age: 25, pos: 'striker', stats: stats(99), bannedSeasons: 1 };
  assert.equal(calcMarketValue(), 0);
});

test('post-ban free agency lock applies only while the player has no contract', () => {
  state.G = { age: 25, pos: 'striker', stats: stats(99),
    banFreeAgencyLock: true, contract: { years: 0 } };
  assert.equal(calcMarketValue(), 0.1);
  state.G.contract.years = 1;
  assert.equal(calcMarketValue(), 260);
});

test('market value recovers each season after a ban and returns to normal', () => {
  state.G = { age: 25, pos: 'striker', stats: stats(99) };
  const values = [4, 3, 2, 1, 0].map((seasons) => {
    state.G.postBanValueRecoverySeasons = seasons;
    return calcMarketValue();
  });
  assert.ok(values.every((value, index) => index === 0 || value > values[index - 1]));
  assert.equal(values.at(-1), 260);
});

test('low-rated players keep the minimum market value', () => {
  state.G = { age: 16, pos: 'striker', stats: stats(40) };
  assert.equal(calcMarketValue(), 0.3);
});

test('salary has a weekly floor and rewards stronger players', () => {
  assert.equal(calcSalary(40, 16), 1000);
  assert.ok(calcSalary(90, 25) > calcSalary(70, 25));
  assert.ok(calcSalary(90, 28) > calcSalary(90, 16));
  assert.equal(calcSalary(90, 25) % 1000, 0);
});

test('contract duration changes at youth, senior and retirement boundaries', () => {
  for (const [age, expected] of [
    [18, [6, 10]], [19, [5, 9]], [30, [2, 6]],
    [31, [2, 5]], [39, [1, 2]], [40, [1, 1]],
  ]) {
    const { minYears, maxYears } = getContractYearRange(age);
    assert.deepEqual([minYears, maxYears], expected, `age ${age}`);
  }
});

test('release clauses protect valuable players and increase with club prestige', () => {
  state.G = { age: 25, pos: 'striker', stats: stats(90) };
  assert.ok(calcReleaseClause(90, 50) > calcMarketValue());
  assert.ok(calcReleaseClause(90, 95) > calcReleaseClause(90, 50));
  assert.ok(calcReleaseClause(40, 0) >= 1);
});
