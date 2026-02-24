import { state } from './state.js';
import { rng } from './utils.js';
import { renderSeasonResult } from './ui.js';
import { getDomesticCupName, getTrophyName } from './data.js';
import { calcOvr } from './utils.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getLeagueDifficulty(leagueName) {
  const map = {
    'Premier League': 1.18,
    'La Liga': 1.14,
    'Serie A': 1.10,
    'Bundesliga': 1.08,
    'Ligue 1': 1.04,
    'Primeira Liga': 0.88,
    'Eredivisie': 0.90,
    'EFL Championship': 0.96,
    'Segunda División': 0.93,
    'Serie B': 0.92,
    '2. Bundesliga': 0.95,
    'Ligue 2': 0.90,
  };
  return map[leagueName] || 1.0;
}

function getDomesticDominanceBoost(leagueName, prestige) {
  if (prestige < 88) return 0;
  if (leagueName === 'Ligue 1') return 0.10;
  if (leagueName === 'Primeira Liga' || leagueName === 'Eredivisie') return 0.07;
  if (leagueName === 'Bundesliga') return 0.04;
  return 0;
}

export function goToSeason() {
  const se = buildSeasonEvent();
  renderSeasonResult(se, buildSeasonChips(se), buildBallonEvent(se));
}

export function buildBanSeasonEvent(seasonsRemainingBeforeAdvance) {
  const yearsLeft = Math.max(0, Number(seasonsRemainingBeforeAdvance) - 1);
  const yearLabel = yearsLeft === 1 ? '1 season remains' : `${yearsLeft} seasons remain`;
  return {
    title: 'DOPING BAN — SUSPENDED',
    text: `You are suspended and cannot play official matches this season. Your contract was terminated — you are currently a <strong>free agent due to ban</strong>. ${yearLabel} on your ban after this year. Stats: <strong>0 goals, 0 assists.</strong>`,
    seasonType: 'doping-ban',
    banLabel: 'Doping ban',
    ballonIneligibleReason: 'doping-ban',
    trophies: [],
    goals: 0,
    assists: 0,
    saves: 0,
    cleanSheets: 0,
  };
}

export function buildSeasonEvent() {
  const ovr = calcOvr();
  const tier = state.G.clubTier;
  const prestige = state.G.club.prestige;
  const leagueName = state.G.club?.league || 'League';
  const domesticCupName = getDomesticCupName(leagueName);

  const ovrCurve = clamp((ovr - 56) / 38, 0, 1);
  const prestigeCurve = clamp((prestige - 25) / 75, 0, 1);
  const playerImpact = clamp(0.55 + ovrCurve * 0.65, 0.55, 1.2);
  const clubStrength = (ovrCurve * 0.42 + prestigeCurve * 0.58) * playerImpact;

  const leagueDifficulty = getLeagueDifficulty(leagueName);
  const tierBonus = (tier - 1) * 0.012;
  const dominanceBoost = getDomesticDominanceBoost(leagueName, prestige);

  const leagueWonChance = clamp(
    0.02 + (clubStrength * 0.52) / leagueDifficulty + tierBonus + dominanceBoost,
    0.02,
    0.80,
  );

  const cupVariance = 0.90 + Math.random() * 0.25;
  const cupWonChance = clamp(
    0.04 + (clubStrength * 0.28 * cupVariance) / leagueDifficulty + dominanceBoost * 0.35,
    0.04,
    0.52,
  );

  const europeanStrength =
    clamp((ovr - 74) / 22, 0, 1) * 0.55 +
    clamp((prestige - 70) / 30, 0, 1) * 0.45;
  const clWonChance = tier >= 5
    ? clamp(0.008 + europeanStrength * 0.17 * playerImpact, 0.008, 0.30)
    : 0;

  const leagueWon = Math.random() < leagueWonChance;
  const cupWon = Math.random() < cupWonChance;
  const clWon = tier >= 5 && Math.random() < clWonChance;
  const potyWon   = ovr>=90 && Math.random()<0.07;
  const gbWon     = state.G.pos==='striker' && ovr>=89 && Math.random()<0.08;
  const csWon     = state.G.pos==='goalkeeper' && ovr>=88 && Math.random()<0.10;
  const bdWon     = ovr>=96 && Math.random()<0.035;

  const trophies = [];
  let text = 'The season is over. ';

  if (leagueWon && tier>=1) {
    const tk = `league:${leagueName}`;
    trophies.push(tk);
    text += `<strong>${leagueName} winners!</strong> `;
  }
  if (cupWon && tier>=2) { trophies.push(`cup:${domesticCupName}`); text += `<strong>${domesticCupName} lifted!</strong> `; }
  if (clWon) { trophies.push('champions'); text += `<strong>Champions League!</strong> `; }
  if (potyWon) { trophies.push('poty'); text += `<strong>Player of the Year!</strong> `; }
  if (gbWon) { trophies.push('golden_boot'); text += `<strong>Golden Boot!</strong> `; }
  if (csWon) { trophies.push('clean_sheet'); text += `<strong>Clean Sheet Master!</strong> `; }
  if (bdWon) { trophies.push('ballon'); text += `<strong>Ballon d\'Or!</strong> `; }

  let goals, assists, saves, cleanSheets;

  // Scale performance based on OVR and age
  const performanceMultiplier = Math.max(0.2, Math.min(1.15, (ovr - 52) / 34));
  const ageMultiplier = state.G.age <= 27 ? 1.0 
    : state.G.age <= 32 ? 1.0
    : state.G.age <= 35 ? 0.85
    : state.G.age <= 37 ? 0.65
    : state.G.age <= 39 ? 0.45
    : 0.25;
  
  const totalMultiplier = performanceMultiplier * ageMultiplier;

  if (state.G.pos === 'striker') {
    goals = Math.max(1, Math.round(rng(6,24) * totalMultiplier));
    assists = Math.max(0, Math.round(rng(2,10) * totalMultiplier));
  } else if (state.G.pos === 'midfielder') {
    goals = Math.max(0, Math.round(rng(3,13) * totalMultiplier));
    assists = Math.max(1, Math.round(rng(5,16) * totalMultiplier));
  } else if (state.G.pos === 'goalkeeper') {
    goals = 0;
    assists = 0;
    saves = Math.max(10, Math.round(rng(34, 96) * totalMultiplier));
    cleanSheets = Math.min(34, Math.max(0, Math.floor((leagueWon ? rng(10,15) : rng(5,11)) * totalMultiplier)));
  } else {
    goals = Math.max(0, Math.round(rng(0,4) * totalMultiplier));
    assists = Math.max(0, Math.round(rng(1,7) * totalMultiplier));
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

export function buildBallonEvent(seasonStats) {
  const rank = calcBallonRank(seasonStats);
  return { rank };
}

function getBallonTrophyScore(trophies) {
  return trophies.reduce((sum, trophy) => {
    if (trophy === 'champions') return sum + 34;
    if (trophy.startsWith('league:')) return sum + 20;
    if (trophy.startsWith('cup:')) return sum + 12;
    if (trophy === 'poty') return sum + 12;
    if (trophy === 'golden_boot') return sum + 10;
    if (trophy === 'clean_sheet') return sum + 10;
    if (trophy === 'ballon') return sum + 30;
    return sum + 4;
  }, 0);
}

function calcBallonRank(seasonStats) {
  const ovr = calcOvr();
  if (ovr < 82) return null;

  const goalsThisSeason = seasonStats?.goals || 0;
  const assistsThisSeason = seasonStats?.assists || 0;
  const trophiesThisSeason = seasonStats?.trophies || [];
  const trophyScore = getBallonTrophyScore(trophiesThisSeason);
  const leagueName = state.G.club?.league || '';
  const leagueBonus = leagueName === 'Premier League' ? 5
    : leagueName === 'La Liga' ? 4
    : leagueName === 'Serie A' ? 3
    : leagueName === 'Bundesliga' ? 2
    : leagueName === 'Ligue 1' ? 2
    : 0;

  const goalWeight = state.G.pos === 'striker' ? 1.05 : state.G.pos === 'midfielder' ? 0.75 : 0.2;
  const assistWeight = state.G.pos === 'midfielder' ? 0.5 : state.G.pos === 'striker' ? 0.25 : 0.05;

  const score = (ovr - 82) * 3.5
    + goalsThisSeason * goalWeight
    + assistsThisSeason * assistWeight
    + trophyScore
    + state.G.reputation * 0.1
    + leagueBonus;

  const rand = (Math.random() - 0.5) * 12;
  const adjusted = score + rand;

  const hasLeague = trophiesThisSeason.some(t => t.startsWith('league:'));
  const hasCup = trophiesThisSeason.some(t => t.startsWith('cup:'));
  const hasChampions = trophiesThisSeason.includes('champions');
  const hasTreble = hasLeague && hasCup && hasChampions;

  if (hasTreble && state.G.pos === 'striker' && goalsThisSeason >= 18 && adjusted >= 94) return rng(1, 6);
  if (adjusted >= 124 && goalsThisSeason >= 24) return 1;
  if (adjusted >= 106) return rng(2, 4);
  if (adjusted >= 88) return rng(5, 12);
  if (adjusted >= 70) return rng(13, 22);
  if (adjusted >= 54) return rng(23, 30);
  return null;
}

export function buildTrophyLabel(trophies) {
  return trophies.length > 0 ? trophies.map(t => getTrophyName(t)).join(', ') : '—';
}
