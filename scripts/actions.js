import { state } from './state.js';
import { addLog, renderUI, renderRetirementChoice, setTrend, showScreen } from './ui.js';
import { goToSeason } from './season.js';
import { nextEvent } from './events.js';
import { calcMarketValue, calcOvr, calcSalary, formatM, getTierOfClub, rng } from './utils.js';
import { startGame, randomizeProfile, selectAcademy } from './game.js';
import { retire, downloadCareerData } from './retire.js';
import { renderSeasonResult } from './ui.js';
import { showFreeAgencyTransfer } from './transfers.js';

export function handleAction(action, data) {
  switch (action) {
    case 'randomize':
      randomizeProfile();
      break;
    case 'start':
      startGame();
      break;
    case 'download':
      downloadCareerData();
      break;
    case 'reload':
      location.reload();
      break;
    case 'home':
      goHome();
      break;
    case 'fast-retire':
      retire();
      break;
    case 'select-academy':
      selectAcademy(data.academyId);
      break;
    case 'choice':
      handleChoice(Number(data.index));
      break;
    case 'accept-transfer':
      acceptTransfer(Number(data.index));
      break;
    case 'accept-rc':
      acceptRC();
      break;
    case 'decline-rc':
      declineRC();
      break;
    case 'accept-renewal':
      acceptRenewal();
      break;
    case 'decline-renewal':
      declineRenewal();
      break;
    case 'stay-club':
      completeAction();
      break;
    case 'retire-early':
      retire();
      break;
    case 'advance-season':
      advanceSeason();
      break;
    case 'retire':
      retire();
      break;
    case 'continue-career':
      continueCareer();
      break;
    case 'play-season':
      completeAction();
      break;
    default:
      break;
  }
}

export function handleChoice(i){
  const choice = state.currentChoices[i];
  if (!choice) return;
  switch (choice.actionType) {
    case 'training':
      doTraining(choice.payload);
      break;
    case 'apply-season':
      applyAndSeason(choice.payload.deltas, choice.payload.msg);
      break;
    case 'rush-back':
      rushBack(choice.payload.baseDelta);
      break;
    case 'refuse-doping':
      refuseDoping();
      break;
    case 'accept-doping':
      acceptDoping();
      break;
    case 'confront-rival':
      confrontRival();
      break;
    case 'mentor-train':
      mentorTrain();
      break;
    case 'press-conf':
      pressConf();
      break;
    case 'go-season':
      completeAction();
      break;
    case 'penalty-shot':
      takePenalty(choice.payload || {});
      break;
    case 'national-performance':
      nationalPerformance(choice.payload || {});
      break;
    default:
      break;
  }
}

function doTraining(deltas) {
  applyStatDeltas(deltas);
  renderUI();
  completeAction();
}

function applyAndSeason(deltas, msg) {
  applyStatDeltas(deltas);
  renderUI();
  if (msg) addLog(msg);
  completeAction();
}

function applyStatDeltas(deltas) {
  Object.entries(deltas).forEach(([k,v]) => {
    if (k==='reputation') state.G.reputation=Math.max(0,Math.min(100,state.G.reputation+v));
    else if (k==='fitness') state.G.fitness=Math.max(10,Math.min(100,state.G.fitness+v));
    else if (state.G.stats[k]!==undefined) {
      const applied = scaleStatDelta(k, v);
      state.G.stats[k]=Math.max(20,Math.min(99,state.G.stats[k]+applied));
      setTrend(k, Math.round(applied * 10) / 10);
    }
  });
}

function scaleStatDelta(statKey, rawDelta) {
  if (rawDelta <= 0) return rawDelta;

  const current = state.G.stats[statKey] || 60;
  let factor = 1;
  if (current >= 94) factor = 0.15;
  else if (current >= 90) factor = 0.25;
  else if (current >= 85) factor = 0.45;
  else if (current >= 80) factor = 0.65;

  if (state.G.age >= 31) factor *= 0.65;
  else if (state.G.age >= 27) factor *= 0.85;

  return Math.max(0.2, rawDelta * factor);
}

function rushBack(baseDelta) {
  const deltas = {...baseDelta, fitness:(baseDelta.fitness||0)-8};
  applyAndSeason(deltas,'You rushed back. The physio warned you. Extra strain on the injury.');
}

function refuseDoping() {
  state.G.reputation=Math.min(100,state.G.reputation+5);
  renderUI();
  addLog('You refused performance enhancers. Integrity intact.',true);
  completeAction();
}

function acceptDoping() {
  const caught = Math.random()<0.42;
  if (caught) {
    state.G.bannedSeasons=2; state.G.dopingBans++;
    state.G.reputation=Math.max(0,state.G.reputation-30);
    renderUI();
    addLog('Tested positive. 2-season ban. Your reputation is destroyed.',true);
    renderSeasonResult({
      title:'DOPING BAN — 2 SEASONS',
      text:'The test came back positive. The football world is stunned. A 2-year suspension. Your club terminates your contract.',
      trophies:[], goals:0, assists:0
    },[{label:'Reputation',delta:-30,type:'dn'}],null,true);
  } else {
    state.G.stats.pace=Math.min(99,state.G.stats.pace+2);
    state.G.stats.physical=Math.min(99,state.G.stats.physical+2);
    renderUI();
    addLog('Took the enhancers. Untested this time. You know the risk.',true);
    completeAction();
  }
}

function confrontRival() {
  if (Math.random()<0.5) applyAndSeason({reputation:5,physical:1},'You stood your ground. Ferreira backed down. Respect earned.');
  else applyAndSeason({reputation:-8},'Confrontation witnessed by coaches. Both of you hauled in. Messy.');
}

function mentorTrain() {
  const keys=['pace','shooting','passing','dribbling','physical'];
  const [s1,s2]=[...keys].sort(()=>Math.random()-.5).slice(0,2);
  state.G.stats[s1]=Math.min(99,state.G.stats[s1]+2);
  state.G.stats[s2]=Math.min(99,state.G.stats[s2]+2);
  setTrend(s1,2); setTrend(s2,2);
  renderUI();
  addLog(`Castillo unlocked something. ${s1} +2, ${s2} +2.`,true);
  completeAction();
}

function pressConf() {
  if (Math.random()<0.55) applyAndSeason({reputation:8},'Bold press conference. You deliver a stellar run. Press eats humble pie.');
  else applyAndSeason({reputation:-5},'Press conference backfires. A journalist clips it and it goes viral.');
}

function acceptTransfer(idx) {
  const o = state.transferOffers[idx];
  if (!o) return;
  performTransfer(o.club, o.contractYrs, o.releaseClause, o.salary);
}

function acceptRC() {
  const o = state.rcOffer;
  if (!o) return;
  performTransfer(o.club, o.contractYrs, o.releaseClause, o.salary);
}

function acceptRenewal() {
  const offer = state.renewalOffer;
  if (!offer) return;

  state.G.contract = {
    years: offer.contractYrs,
    releaseClause: offer.releaseClause,
    salary: offer.salary,
  };

  addLog(`📝 Renewed with ${state.G.club.name}: ${offer.contractYrs} year${offer.contractYrs>1?'s':''}, RC ${formatM(offer.releaseClause)}`, true);
  state.renewalOffer = null;
  state.renewalContext = null;
  renderUI();
  completeAction();
}

function declineRenewal() {
  const context = state.renewalContext;
  state.renewalOffer = null;
  state.renewalContext = null;

  if (context === 'free-agent') {
    addLog(`You rejected ${state.G.club.name}'s renewal and entered the market as a free agent.`);
    showFreeAgencyTransfer();
    return;
  }

  addLog(`You postponed renewal talks with ${state.G.club.name}.`);
  completeAction();
}

function declineRC() {
  addLog(`You refused ${state.rcOffer.club.name}\'s advances. Bold move.`);
  completeAction();
}

function performTransfer(club, yrs, rc, salary) {
  const oldClub = state.G.club.name;
  state.G.club = club;
  state.G.clubTier = getTierOfClub(club.name);
  state.G.contract = { years: yrs, releaseClause: rc, salary: salary || calcSalary(calcOvr()) };
  state.G.reputation = Math.min(100, state.G.reputation + club.prestige/25);
  renderUI();
  addLog(`✈️ Transferred to ${club.name} — ${yrs}yr deal, RC: ${formatM(rc)}`, true);
  completeAction();
}

function nationalPerformance(payload) {
  state.G.nationalCaps = (state.G.nationalCaps || 0) + 1;
  applyStatDeltas(payload.deltas || {});

  if (payload.result === 'bold' && state.G.pos !== 'goalkeeper' && Math.random() < 0.45) {
    state.G.nationalGoals = (state.G.nationalGoals || 0) + 1;
    addLog('You scored for your national team and became a fan favorite.', true);
  } else {
    addLog('International appearance completed. Your national team status grows.', true);
  }

  renderUI();
  completeAction();
}

function takePenalty(payload) {
  const ovr = calcOvr();
  const shooting = state.G.stats.shooting || 55;
  const composureProxy = state.G.reputation || 0;
  const fitness = state.G.fitness || 60;

  let chance = 0.44 + (shooting - 60) * 0.004 + (ovr - 70) * 0.003 + composureProxy * 0.0012 + (fitness - 60) * 0.0008;
  if (payload.target === 'center') chance -= 0.03;
  chance = Math.max(0.12, Math.min(0.78, chance));

  const scored = Math.random() < chance;
  if (scored) {
    if (payload.context === 'national') {
      state.G.nationalCaps = (state.G.nationalCaps || 0) + 1;
      state.G.nationalGoals = (state.G.nationalGoals || 0) + 1;
      state.G.reputation = Math.min(100, state.G.reputation + 5);
      addLog(`ICE COLD. You scored for ${payload.teamName || 'your country'} in the decisive moment.`, true);
    } else {
      state.G.reputation = Math.min(100, state.G.reputation + 4);
      state.G.stats.shooting = Math.min(99, state.G.stats.shooting + 0.6);
      setTrend('shooting', 0.6);
      addLog(`You buried the penalty for ${payload.teamName || state.G.club.name}. Absolute clutch.`, true);
    }
  } else {
    state.G.reputation = Math.max(0, state.G.reputation - 6);
    state.G.fitness = Math.max(10, state.G.fitness - 3);
    addLog('You missed the decisive penalty. The stadium goes silent.', true);
  }

  renderUI();
  completeAction();
}

function completeAction() {
  state.seasonAction = (state.seasonAction || 1) + 1;
  renderUI();

  if (state.seasonAction > (state.seasonActionsTotal || 10)) {
    goToSeason();
    return;
  }

  nextEvent();
}

export function advanceSeason() {
  const { se, bd } = state.pendingSeason || { se:{trophies:[],goals:0,assists:0}, bd:null };
  const weeklySalary = state.G.contract?.salary || 0;
  state.G.totalEarnings = (state.G.totalEarnings || 0) + (weeklySalary * 52);

  state.G.trophies.push(...(se.trophies||[]));
  state.G.totalGoals   += se.goals||0;
  state.G.totalAssists += se.assists||0;

  const repGain = (se.trophies||[]).length * 4 + ((se.trophies||[]).includes('ballon') ? 10 : 0);
  state.G.reputation = Math.min(100, state.G.reputation + repGain);

  if (bd && bd.rank) {
    state.G.ballonHistory.push({ season:state.G.season, age:state.G.age, rank:bd.rank, club:state.G.club.name });
  } else if (bd) {
    state.G.ballonHistory.push({ season:state.G.season, age:state.G.age, rank:null, club:state.G.club.name });
  }

  if (state.G.age >= 30) applyAgeDecline();
  if (state.G.age < 23)  autoGrow();
  state.G.fitness = Math.min(100, state.G.fitness + 12);
  state.G.contract.years--;

  state.G.seasonHistory.push({
    season: state.G.season,
    age: state.G.age,
    ovr: calcOvr(),
    goals: se.goals || 0,
    assists: se.assists || 0,
    saves: se.saves || 0,
    cleanSheets: se.cleanSheets || 0,
    club: state.G.club.name,
    trophies: se.trophies || []
  });

  state.G.age++; state.G.season++; state.G.seasonsPlayed++;
  state.seasonAction = 1;
  renderUI();

  // Force retirement at age 42
  if (state.G.age >= 42) {
    addLog(`At age ${state.G.age}, your body can no longer compete at this level. Time to retire.`, true);
    retire();
    return;
  }

  // Force retirement if OVR drops below 50
  const ovr = calcOvr();
  if (ovr < 50 && state.G.age >= 35) {
    addLog(`OVR ${ovr} at age ${state.G.age}. No club wants to sign you. Career over.`, true);
    retire();
    return;
  }

  if (state.G.age >= 36 && state.G.contract.years <= 0) {
    // Only show retirement choice when free agent after 36
    const canKeepPlaying = ovr >= 55;

    const retireMsg = state.G.age >= 40
      ? `At ${state.G.age}, you\'ve had an incredible run. The body is telling you it\'s time.`
      : state.G.age >= 38
      ? `${state.G.age} years old. Still got something left in the tank, or is it time?`
      : `You\'re ${state.G.age} now. Many legends retire around this age. What\'s your choice?`;

    const keepPlayingMsg = canKeepPlaying
      ? `Clubs will still take you at OVR ${ovr}. You could keep chasing titles and glory.`
      : `Your OVR is ${ovr} — it\'ll be hard to find clubs willing to sign you.`;

    renderRetirementChoice(retireMsg, keepPlayingMsg, canKeepPlaying);
  } else if (state.G.age >= 38 && Math.random() < 0.35) {
    // Random retirement prompt for very old players even with contract
    const keepPlayingMsg = `You\'re ${state.G.age} with OVR ${ovr}. Few play this long. Continue or retire?`;
    renderRetirementChoice(
      `Your body is breaking down. Every match is a struggle. Is it worth it?`,
      keepPlayingMsg,
      true
    );
  } else {
    nextEvent();
  }
}

function continueCareer() {
  nextEvent();
}

function autoGrow() {
  Object.keys(state.G.stats).forEach(k=>{
    const current = state.G.stats[k];
    const growthCap = current >= 90 ? 0.15 : current >= 85 ? 0.35 : current >= 80 ? 0.6 : 1.0;
    state.G.stats[k]=Math.min(99, current + Math.random() * growthCap);
  });
}

function applyAgeDecline() {
  let factor = 0.4;
  let decline = Math.random()*1.8+0.3;

  if (state.G.age >= 40) {
    // Severe decline at 40+
    factor = 1.0;
    decline = Math.random()*4.0+2.5;
  } else if (state.G.age >= 37) {
    // Heavy decline at 37-39
    factor = 0.98;
    decline = Math.random()*3.2+1.5;
  } else if (state.G.age >= 34) {
    // Notable decline at 34-36
    factor = 0.90;
    decline = Math.random()*2.2+0.8;
  } else if (state.G.age >= 31) {
    // Moderate decline at 31-33
    factor = 0.70;
    decline = Math.random()*1.5+0.5;
  } else if (state.G.age >= 30) {
    // Slight decline at 30
    factor = 0.50;
  }

  Object.keys(state.G.stats).forEach(k=>{
    if (Math.random()<factor) {
      state.G.stats[k]=Math.max(30,state.G.stats[k]-decline);
    }
  });
  
  // Extra pace decline for aging players (pace drops fastest)
  if (state.G.age >= 32 && state.G.stats.pace && Math.random() < 0.6) {
    const extraPaceDecline = state.G.age >= 37 ? Math.random()*2.0+1.0 : Math.random()*1.2+0.5;
    state.G.stats.pace = Math.max(30, state.G.stats.pace - extraPaceDecline);
  }
}

function goHome() {
  if (confirm('Return to home screen? Current progress will be lost.')) {
    location.reload();
  }
}
