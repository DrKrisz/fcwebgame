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
  const baseValue = Math.max(0.3, Math.round(ovrFactor * ageFactor * 260 * 10)/10);

  if ((state.G?.bannedSeasons || 0) > 0) return 0;

  const isPostBanFreeAgentLock = !!state.G?.banFreeAgencyLock && ((state.G?.contract?.years || 0) <= 0);
  if (isPostBanFreeAgentLock) return 0.1;

  const recoverySeasons = Math.max(0, Number(state.G?.postBanValueRecoverySeasons) || 0);
  if (recoverySeasons > 0) {
    const recoveryMultiplierBySeasonsLeft = {
      4: 0.18,
      3: 0.26,
      2: 0.36,
      1: 0.5,
    };
    const multiplier = recoveryMultiplierBySeasonsLeft[recoverySeasons] || 0.55;
    return Math.max(0.1, Math.round(baseValue * multiplier * 10) / 10);
  }

  return baseValue;
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
  const elitePremium = ovr >= 92 ? 0.65 : ovr >= 87 ? 0.4 : ovr >= 82 ? 0.2 : 0;
  const clubProtection = 2.05 + (prestige / 90) + elitePremium;
  const floor = mv * (1.5 + Math.max(0, ovr - 74) / 120);
  return Math.max(1, Math.round(Math.max(floor, mv * clubProtection) * 10)/10);
}

function getAgeSalaryFactor(age) {
  const points = [
    [16, 0.42],
    [18, 0.55],
    [21, 0.72],
    [23, 0.82],
    [25, 0.92],
    [28, 1.0],
    [31, 0.95],
    [34, 0.84],
    [37, 0.7],
    [40, 0.55],
  ];

  if (age <= points[0][0]) return points[0][1];
  if (age >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 1; i < points.length; i++) {
    const [x2, y2] = points[i];
    if (age <= x2) {
      const [x1, y1] = points[i - 1];
      const t = (age - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }

  return 1;
}

export function calcSalary(ovr, age = (state.G?.age || 16)) {
  const ovrRatio = Math.max(0, ovr - 50) / 49;
  const talentPay = Math.pow(ovrRatio, 1.78) * 300000;
  const eliteBonus = ovr >= 92 ? (ovr - 91) * 8000 : 0;
  const ageFactor = getAgeSalaryFactor(age);
  const weekly = Math.round(((talentPay + eliteBonus) * ageFactor) / 1000) * 1000;
  return Math.max(1000, weekly);
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
