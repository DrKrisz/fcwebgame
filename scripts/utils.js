import { state } from './state.js';
import { TIERS } from './data.js';

export function rng(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

export function ordinal(n) {
  if (!n) return '—';
  const s = ['th','st','nd','rd'], v=n%100;
  return n+(s[(v-20)%10]||s[v]||s[0]);
}

export function calcOvrFromStats(s, pos) {
  const p = pos || (state.G && state.G.pos) || 'striker';
  const w = {
    striker:    [0.25,0.35,0.15,0.15,0.10],
    midfielder: [0.15,0.15,0.30,0.25,0.15],
    defender:   [0.20,0.05,0.20,0.15,0.40],
    goalkeeper: [0.10,0.05,0.20,0.15,0.50],
  }[p];
  const vals = [s.pace, s.shooting, s.passing, s.dribbling, s.physical];
  return Math.round(Math.min(99, Math.max(40, vals.reduce((acc,v,i)=>acc+v*w[i],0))));
}

export function calcOvr() {
  if (!state.G || !state.G.stats) return 0;
  return calcOvrFromStats(state.G.stats);
}

export function calcMarketValue() {
  const ovr = calcOvr(), age = state.G.age;
  const ageFactor = age <= 25
    ? Math.pow((age-15)/10, 1.2)
    : Math.max(0.05, 1-(age-25)*0.055);
  const ovrFactor = Math.pow(Math.max(0, ovr-50)/49, 2.1);
  return Math.max(0.3, Math.round(ovrFactor * ageFactor * 260 * 10)/10);
}

export function formatM(m) {
  if (m >= 100) return `€${Math.round(m)}M`;
  return `€${m.toFixed(1)}M`;
}

export function calcReleaseClause(ovr, prestige) {
  const age = (state.G && state.G.age) ? state.G.age : 16;
  const ageFactor = age <= 25
    ? Math.pow((age-15)/10, 1.2)
    : Math.max(0.05, 1-(age-25)*0.055);
  const ovrFactor = Math.pow(Math.max(0, ovr-50)/49, 2.1);
  const mv = Math.max(0.3, Math.round(ovrFactor * ageFactor * 260 * 10)/10);
  const multi = 1.8 + (prestige / 100);
  return Math.max(1, Math.round(mv * multi * 10)/10);
}

export function calcSalary(ovr) {
  const weekly = Math.round(Math.pow(Math.max(0,ovr-50)/49, 1.8) * 350000 / 1000) * 1000;
  return Math.max(500, weekly);
}

export function getContractYearRange(age) {
  if (age <= 18) return { minYears: 6, maxYears: 10 };
  if (age <= 21) return { minYears: 5, maxYears: 9 };
  if (age <= 24) return { minYears: 4, maxYears: 8 };
  if (age <= 27) return { minYears: 3, maxYears: 7 };
  if (age <= 30) return { minYears: 2, maxYears: 6 };
  if (age <= 33) return { minYears: 2, maxYears: 5 };
  if (age <= 36) return { minYears: 1, maxYears: 3 };
  if (age <= 39) return { minYears: 1, maxYears: 2 };
  return { minYears: 1, maxYears: 1 };
}

export function rollContractYears(age) {
  const { minYears, maxYears } = getContractYearRange(age);
  return rng(minYears, maxYears);
}

export function prestige2Stars(p) {
  if (p >= 95) return '★★★★★';
  if (p >= 85) return '★★★★☆';
  if (p >= 72) return '★★★☆☆';
  if (p >= 55) return '★★☆☆☆';
  return '★☆☆☆☆';
}

export function getTierOfClub(name) {
  for (let t=0; t<TIERS.length; t++) {
    if (TIERS[t].some(c=>c.name===name)) return t;
  }
  return 0;
}
