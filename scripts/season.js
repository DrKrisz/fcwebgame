import { state } from './state.js';
import { rng } from './utils.js';
import { renderSeasonResult } from './ui.js';
import { TROPHY_NAMES } from './data.js';
import { calcOvr } from './utils.js';

export function goToSeason() {
  const se = buildSeasonEvent();
  renderSeasonResult(se, buildSeasonChips(se), buildBallonEvent(se.goals, se.trophies.length));
}

export function buildSeasonEvent() {
  const ovr = calcOvr();
  const tier = state.G.clubTier;
  const prestige = state.G.club.prestige;
  
  // Dramatically reduce trophy chances for low OVR players
  let ovrImpact = 1.0;
  if (ovr < 60) ovrImpact = 0.1;
  else if (ovr < 65) ovrImpact = 0.3;
  else if (ovr < 70) ovrImpact = 0.6;
  else if (ovr < 75) ovrImpact = 0.8;
  
  const baseWinChance = Math.max(0.01, Math.pow((ovr-68)/90, 1.9)) + (prestige/500);
  const winChance = baseWinChance * ovrImpact;

  const leagueWon = Math.random() < winChance;
  const cupWon    = Math.random() < Math.max(0.04, winChance * 0.45 + 0.01);
  const clWon     = tier>=5 && Math.random() < Math.max(0.01, (ovr-75)/200 * (prestige/110)) * ovrImpact;
  const potyWon   = ovr>=87 && Math.random()<0.12;
  const gbWon     = state.G.pos==='striker' && ovr>=85 && Math.random()<0.12;
  const csWon     = state.G.pos==='goalkeeper' && ovr>=84 && Math.random()<0.14;
  const bdWon     = ovr>=95 && Math.random()<0.08;

  const trophies = [];
  let text = 'The season is over. ';

  if (leagueWon && tier>=1) {
    const tk = tier>=5?'league_top':tier>=3?'league_mid':'league_low';
    trophies.push(tk);
    text += `<strong>Title winners!</strong> `;
  }
  if (cupWon && tier>=2) { trophies.push('cup'); text += `<strong>Cup lifted!</strong> `; }
  if (clWon) { trophies.push('champions'); text += `<strong>Champions League!</strong> `; }
  if (potyWon) { trophies.push('poty'); text += `<strong>Player of the Year!</strong> `; }
  if (gbWon) { trophies.push('golden_boot'); text += `<strong>Golden Boot!</strong> `; }
  if (csWon) { trophies.push('clean_sheet'); text += `<strong>Clean Sheet Master!</strong> `; }
  if (bdWon) { trophies.push('ballon'); text += `<strong>Ballon d\'Or!</strong> `; }

  let goals, assists, saves, cleanSheets;

  // Scale performance based on OVR and age
  const performanceMultiplier = Math.max(0.2, Math.min(1.5, (ovr - 50) / 30));
  const ageMultiplier = state.G.age <= 27 ? 1.0 
    : state.G.age <= 32 ? 1.0
    : state.G.age <= 35 ? 0.85
    : state.G.age <= 37 ? 0.65
    : state.G.age <= 39 ? 0.45
    : 0.25;
  
  const totalMultiplier = performanceMultiplier * ageMultiplier;

  if (state.G.pos === 'striker') {
    goals = Math.max(1, Math.round(rng(8,30) * totalMultiplier));
    assists = Math.max(0, Math.round(rng(2,12) * totalMultiplier));
  } else if (state.G.pos === 'midfielder') {
    goals = Math.max(0, Math.round(rng(4,16) * totalMultiplier));
    assists = Math.max(1, Math.round(rng(6,20) * totalMultiplier));
  } else if (state.G.pos === 'goalkeeper') {
    goals = 0;
    assists = 0;
    saves = Math.max(10, Math.round(rng(40, 120) * totalMultiplier));
    cleanSheets = Math.min(38, Math.max(0, Math.floor((leagueWon ? rng(12,18) : rng(6,14)) * totalMultiplier)));
  } else {
    goals = Math.max(0, Math.round(rng(0,5) * totalMultiplier));
    assists = Math.max(0, Math.round(rng(1,8) * totalMultiplier));
  }

  if (!trophies.length) text += 'No silverware this time — keep pushing.';

  if (state.G.pos === 'goalkeeper') {
    text += ` Stats: <strong>${saves} saves, ${cleanSheets} clean sheets.</strong>`;
  } else {
    text += ` Stats: <strong>${goals} goals, ${assists} assists.</strong>`;
  }

  return { trophies, goals, assists, text, saves, cleanSheets };
}

export function buildSeasonChips(se) {
  const chips = [];

  if (state.G.pos === 'goalkeeper') {
    if (se.saves) chips.push({label:`${se.saves} Saves`,type:'up'});
    if (se.cleanSheets) chips.push({label:`${se.cleanSheets} CS`,type:'up'});
  } else {
    if (se.goals)   chips.push({label:`${se.goals}G`,type:'up'});
    if (se.assists) chips.push({label:`${se.assists}A`,type:'neutral'});
  }

  if (se.trophies.length) chips.push({label:`${se.trophies.length} Trophy${se.trophies.length>1?'ies':''}`,type:'up'});
  const repGain = se.trophies.length*7 + (se.trophies.includes('ballon')?20:0) + (se.trophies.includes('clean_sheet')?15:0);
  if (repGain) chips.push({label:`Rep +${repGain}`,type:'up'});
  return chips;
}

export function buildBallonEvent(goals, trophyCount) {
  const rank = calcBallonRank(goals, trophyCount);
  return { rank };
}

function calcBallonRank(goalsThisSeason, trophiesThisSeason) {
  const ovr = calcOvr();
  if (ovr < 76) return null;
  const score = (ovr - 76) * 5.5
    + goalsThisSeason * 0.6
    + trophiesThisSeason * 8
    + state.G.reputation * 0.15;
  const rand = (Math.random() - 0.5) * 8;
  const adjusted = score + rand;
  if (adjusted >= 95) return 1;
  if (adjusted >= 75) return rng(2, 4);
  if (adjusted >= 55) return rng(5, 12);
  if (adjusted >= 35) return rng(13, 22);
  if (adjusted >= 18) return rng(23, 30);
  return null;
}

export function buildTrophyLabel(trophies) {
  return trophies.length > 0 ? trophies.map(t => TROPHY_NAMES[t] || t).join(', ') : '—';
}
