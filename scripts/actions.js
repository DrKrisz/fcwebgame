import { state } from './state.js';
import { addLog, clearStatFeedback, downloadCareerLogTxt, renderUI, renderRetirementChoice, setTrend, showScreen } from './ui.js';
import { goToSeason } from './season.js';
import { nextEvent } from './events.js';
import { calcMarketValue, calcOvr, calcSalary, formatM, getTierOfClub, rng } from './utils.js';
import { startGame, randomizeProfile, selectAcademy } from './game.js';
import { retire, downloadCareerData } from './retire.js';
import { renderSeasonResult } from './ui.js';
import { renderPreseasonCupHub, renderPreseasonCupQuestion, renderPreseasonCupRoundResult } from './ui.js';
import { acceptMarketInterest, applyToMarketClub, changeCurrentClubManagerConnection, changeManagerConnection, clearMarketplaceFocus, consumeMarketFeedback, resolveMarketplaceFeedbackAtSeasonEnd, rippleKnownManagerConnections, setMarketApplicationMode, showFreeAgencyTransfer, showMarketplaceBoard, viewMarketplaceIncoming, viewMarketplaceTarget } from './transfers.js';
import { TIERS } from './data.js';

const PRESEASON_CUP_NAMES = [
  'Summer Unity Cup',
  'Champions Warmup Trophy',
  'Elite Kickoff Shield',
  'Preseason Stars Cup',
  'Sunrise Invitational',
];

const PRESEASON_QUESTIONS = [
  {
    prompt: 'You are in the box, three defenders close in, and your teammate is free behind you. What do you do?',
    options: [
      { label: 'Attack the defenders', hint: 'High risk', impact: -1, deltas: { dribbling: 0.6 }, outcome: 'You forced the play and nearly lost it in traffic.' },
      { label: 'Pass back to teammate', hint: 'Smart play', impact: 2, deltas: { passing: 0.8, reputation: 1 }, outcome: 'Quick pass, clean chance created, coach approves.' },
    ],
  },
  {
    prompt: 'Your fullback overlaps and asks for a through ball in transition. Your next move?',
    options: [
      { label: 'Through ball now', hint: 'Timing test', impact: 2, deltas: { passing: 0.7 }, outcome: 'Perfect timing opens the flank.' },
      { label: 'Keep carrying the ball', hint: 'Safer touch', impact: -1, deltas: { dribbling: 0.4 }, outcome: 'The move slows down and defenders reset.' },
    ],
  },
  {
    prompt: 'You lose possession and the opponent starts a counter. How do you react?',
    options: [
      { label: 'Sprint back and press', hint: 'Big effort', impact: 1, deltas: { physical: 0.6, fitness: -4 }, outcome: 'You recover ground and disrupt the counter.' },
      { label: 'Hold your shape', hint: 'Low energy', impact: -1, deltas: { fitness: 1 }, outcome: 'You save energy, but your line gets stretched.' },
    ],
  },
  {
    prompt: 'You receive the ball at the edge of the box with a narrow shooting lane.',
    options: [
      { label: 'Take the first-time shot', hint: 'Direct', impact: 1, deltas: { shooting: 0.7 }, outcome: 'Powerful attempt forces a difficult save.' },
      { label: 'Settle and recycle', hint: 'Control', impact: 0, deltas: { passing: 0.4 }, outcome: 'Possession is retained, tempo stays calm.' },
    ],
  },
  {
    prompt: 'Late game, your team is under pressure on set pieces.',
    options: [
      { label: 'Take marking responsibility', hint: 'Leadership', impact: 2, deltas: { physical: 0.7, reputation: 1 }, outcome: 'You organize the line and clear danger.' },
      { label: 'Stay higher for counters', hint: 'Gamble', impact: -2, deltas: { pace: 0.5 }, outcome: 'You wait for a break, but your box is overloaded.' },
    ],
  },
  {
    prompt: 'A teammate is frustrated and arguing with the referee. What do you do?',
    options: [
      { label: 'Calm him down', hint: 'Team first', impact: 1, deltas: { reputation: 1 }, outcome: 'You calm the situation and keep focus.' },
      { label: 'Ignore and move on', hint: 'Neutral', impact: -1, deltas: {}, outcome: 'Tension remains and rhythm drops.' },
    ],
  },
  {
    prompt: 'You are subbed in and your first touch is under heavy pressure.',
    options: [
      { label: 'Shield and draw a foul', hint: 'Composed', impact: 1, deltas: { physical: 0.5 }, outcome: 'You slow the game and settle immediately.' },
      { label: 'Spin and drive forward', hint: 'Explosive', impact: 0, deltas: { pace: 0.6 }, outcome: 'You beat one man but lose balance on the second.' },
    ],
  },
];

export function handleAction(action, data) {
  clearStatFeedback();

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
    case 'download-log':
      downloadCareerLogTxt();
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
      stayAtClub();
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
    case 'open-marketplace':
      showMarketplaceBoard();
      break;
    case 'back-transfer-week':
      nextEvent();
      break;
    case 'apply-market-club':
      applyToMarketClub(Number(data.index));
      break;
    case 'accept-market-interest':
      acceptMarketplaceInterest(Number(data.index));
      break;
    case 'view-market-interest':
      viewMarketplaceIncoming(Number(data.index));
      break;
    case 'view-market-target':
      viewMarketplaceTarget(Number(data.index));
      break;
    case 'set-market-mode':
      setMarketApplicationMode(data.mode);
      break;
    case 'market-clear-focus':
      clearMarketplaceFocus();
      break;
    case 'accept-market-feedback':
      acceptMarketFeedbackOffer();
      break;
    case 'dismiss-market-feedback':
      dismissMarketFeedback();
      break;
    case 'preseason-cup-start':
      startPreseasonCupMatch();
      break;
    case 'preseason-answer':
      answerPreseasonQuestion(Number(data.option));
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
    case 'preseason-yes':
      acceptPreseasonInvite();
      break;
    case 'preseason-no':
      declinePreseasonInvite();
      break;
    case 'preseason-lie':
      fakeSickPreseasonInvite();
      break;
    case 'open-marketplace':
      showMarketplaceBoard();
      break;
    default:
      break;
  }
}

function acceptMarketplaceInterest(index) {
  const offer = acceptMarketInterest(index);
  if (!offer) return;
  performTransfer(offer.club, offer.contractYrs, offer.releaseClause, offer.salary);
}

function acceptMarketFeedbackOffer() {
  const offer = consumeMarketFeedback(true);
  if (!offer) {
    nextEvent();
    return;
  }
  performTransfer(offer.club, offer.contractYrs, offer.releaseClause, offer.salary);
}

function dismissMarketFeedback() {
  const pending = state.marketFeedbackQueue?.[0];
  consumeMarketFeedback(false);
  if (pending?.offer?.club?.name) {
    changeManagerConnection(pending.offer.club.name, -8);
    changeCurrentClubManagerConnection(4);
    addLog(`You rejected ${pending.offer.club.name}'s offer. Their manager felt snubbed, your current manager approved your loyalty.`, true);
  }
  nextEvent();
}

function stayAtClub() {
  changeCurrentClubManagerConnection(6);
  addLog(`You chose loyalty and stayed at ${state.G.club.name}. Manager relationship improved.`, true);
  completeAction();
}

function acceptPreseasonInvite() {
  state.G.reputation = Math.min(100, state.G.reputation + 5);
  changeCurrentClubManagerConnection(7);
  state.preseasonCup = createPreseasonCupState();
  addLog('You joined the preseason cup. Manager trust increased (+5 reputation).', true);
  renderUI();
  renderPreseasonCupHub();
}

function declinePreseasonInvite() {
  state.G.reputation = Math.max(0, state.G.reputation - 50);
  changeCurrentClubManagerConnection(-14);
  addLog('You refused preseason duties. Manager disappointed (-50 reputation).', true);
  renderUI();
  completeAction();
}

function fakeSickPreseasonInvite() {
  const caught = Math.random() < 0.5;
  if (caught) {
    const fine = Math.round((state.G.contract?.salary || 0) * 2);
    state.G.reputation = Math.max(0, state.G.reputation - 100);
    changeCurrentClubManagerConnection(-20);
    rippleKnownManagerConnections(-4);
    state.G.totalEarnings = Math.max(0, (state.G.totalEarnings || 0) - fine);
    addLog(`Manager caught your lie. -100 reputation and a ${formatM(fine)} fine.`, true);
  } else {
    changeCurrentClubManagerConnection(-5);
    addLog('You claimed sickness and avoided preseason. The manager did not catch it.', true);
  }

  renderUI();
  completeAction();
}

function createPreseasonCupState() {
  const cupName = PRESEASON_CUP_NAMES[Math.floor(Math.random() * PRESEASON_CUP_NAMES.length)];
  const opponentPool = buildPreseasonOpponentPool();
  const teams = [state.G.club.name, ...opponentPool];
  const teamStrengths = buildPreseasonTeamStrengths(teams);
  const otherSemi = simulateAiMatch(teams[2], teams[3], teamStrengths);

  return {
    name: cupName,
    teams,
    teamStrengths,
    semiOpponent: teams[1],
    finalOpponent: null,
    otherSemi,
    stage: 'semi',
    currentMatch: null,
    results: [otherSemi],
    champion: null,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildPreseasonOpponentPool() {
  const currentTierIndex = Math.max(0, (state.G.clubTier || 1) - 1);
  const candidateTiers = [
    Math.max(0, currentTierIndex - 1),
    currentTierIndex,
    Math.min(TIERS.length - 1, currentTierIndex + 1),
  ];

  const candidates = candidateTiers
    .flatMap(index => TIERS[index] || [])
    .filter(club => club.name !== state.G.club.name);

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 3).map(club => club.name);

  if (picked.length === 3) return picked;

  const fallbackPool = TIERS.flat()
    .filter(club => club.name !== state.G.club.name && !picked.includes(club.name))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3 - picked.length)
    .map(club => club.name);

  return [...picked, ...fallbackPool];
}

function buildPreseasonTeamStrengths(teams) {
  const byName = TIERS.flat().reduce((acc, club) => {
    acc[club.name] = club.prestige;
    return acc;
  }, {});

  const ovr = calcOvr();
  const playerClubStrength = clamp(
    52 + (state.G.club?.prestige || 60) * 0.42 + ovr * 0.33 + (state.G.reputation || 0) * 0.08,
    50,
    96,
  );

  const strengths = { [state.G.club.name]: playerClubStrength };

  teams
    .filter(name => name !== state.G.club.name)
    .forEach(name => {
      const prestige = byName[name] || 60;
      strengths[name] = clamp(50 + prestige * 0.45 + rng(-4, 4), 48, 94);
    });

  return strengths;
}

function rollGoalsFromStrength(strengthValue) {
  const expected = clamp(0.65 + (strengthValue - 55) / 32, 0.35, 2.85);
  let goals = 0;
  if (Math.random() < clamp(expected / 2.8, 0.10, 0.80)) goals++;
  if (Math.random() < clamp((expected - 0.45) / 3.0, 0.06, 0.62)) goals++;
  if (Math.random() < clamp((expected - 1.1) / 3.8, 0.02, 0.46)) goals++;
  if (Math.random() < clamp((expected - 1.8) / 5.0, 0, 0.24)) goals++;
  return goals;
}

function simulateAiMatch(home, away, teamStrengths) {
  const homeStrength = teamStrengths?.[home] ?? 64;
  const awayStrength = teamStrengths?.[away] ?? 64;
  let homeGoals = rollGoalsFromStrength(homeStrength + 1.2);
  let awayGoals = rollGoalsFromStrength(awayStrength);
  if (homeGoals === awayGoals) {
    const edge = clamp((homeStrength - awayStrength) / 24, -0.25, 0.25);
    if (Math.random() < 0.5 + edge) homeGoals++;
    else awayGoals++;
  }
  return {
    round: 'Semi-final 2',
    home,
    away,
    homeGoals,
    awayGoals,
    winner: homeGoals > awayGoals ? home : away,
  };
}

function startPreseasonCupMatch() {
  const cup = state.preseasonCup;
  if (!cup || cup.currentMatch) return;

  const round = cup.stage === 'semi' ? 'Semi-final 1' : 'Final';
  const opponent = cup.stage === 'semi' ? cup.semiOpponent : cup.finalOpponent;
  const onBench = shouldStartOnBench();

  cup.currentMatch = {
    round,
    opponent,
    startMode: onBench ? `Bench start — subbed in around ${rng(68, 76)}'` : 'Starting XI',
    questionIndex: 0,
    performance: 0,
    notes: [],
    questions: [...PRESEASON_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5),
  };

  renderPreseasonCupQuestion();
}

function shouldStartOnBench() {
  const ovr = calcOvr();
  const lowStatus = state.G.age <= 18 || ovr < 68 || state.G.reputation < 28;
  return lowStatus ? Math.random() < 0.8 : Math.random() < 0.22;
}

function answerPreseasonQuestion(optionIndex) {
  const cup = state.preseasonCup;
  const match = cup?.currentMatch;
  if (!cup || !match) return;

  const question = match.questions[match.questionIndex];
  if (!question) return;
  const selected = question.options[optionIndex];
  if (!selected) return;

  match.performance += selected.impact;
  if (selected.deltas && Object.keys(selected.deltas).length) {
    applyStatDeltas(selected.deltas);
  }
  if (selected.outcome) {
    match.notes.push(selected.outcome);
  }

  match.questionIndex++;
  renderUI();

  if (match.questionIndex >= match.questions.length) {
    finalizePreseasonMatch();
    return;
  }

  renderPreseasonCupQuestion();
}

function finalizePreseasonMatch() {
  const cup = state.preseasonCup;
  const match = cup?.currentMatch;
  if (!cup || !match) return;

  const teamStrengths = cup.teamStrengths || {};
  const homeStrength = teamStrengths[state.G.club.name] || 64;
  const awayStrength = teamStrengths[match.opponent] || 64;
  const benchPenalty = match.startMode.startsWith('Bench') ? 2.0 : 0;
  const performanceImpact = clamp(match.performance, -4, 4);

  let homeGoals = rollGoalsFromStrength(homeStrength - benchPenalty + performanceImpact * 1.6);
  let awayGoals = rollGoalsFromStrength(awayStrength - performanceImpact * 0.7);

  if (homeGoals === awayGoals) {
    const strengthEdge = clamp((homeStrength - awayStrength) / 26, -0.24, 0.24);
    const clutchEdge = clamp(performanceImpact * 0.05, -0.20, 0.20);
    if (Math.random() < 0.5 + strengthEdge + clutchEdge) homeGoals++;
    else awayGoals++;
    match.notes.push('Late winner in a dramatic finish.');
  }

  const result = {
    round: match.round,
    home: state.G.club.name,
    away: match.opponent,
    homeGoals,
    awayGoals,
    winner: homeGoals > awayGoals ? state.G.club.name : match.opponent,
    startMode: match.startMode,
    notes: match.notes,
  };

  cup.results.push(result);
  cup.currentMatch = null;

  if (cup.stage === 'semi') {
    if (result.winner !== state.G.club.name) {
      cup.stage = 'done';
      cup.champion = cup.otherSemi.winner;
      state.G.reputation = Math.max(0, state.G.reputation - 4);
      addLog(`Preseason exit in the semi-final (${homeGoals}-${awayGoals}).`, true);
      renderUI();
      renderPreseasonCupRoundResult(result, false, false);
      return;
    }

    cup.finalOpponent = cup.otherSemi.winner;
    cup.stage = 'final';
    state.G.reputation = Math.min(100, state.G.reputation + 2);
    addLog(`You reached the preseason final after a ${homeGoals}-${awayGoals} win.`, true);
    renderUI();
    renderPreseasonCupRoundResult(result, true, false);
    return;
  }

  cup.stage = 'done';
  if (result.winner === state.G.club.name) {
    cup.champion = state.G.club.name;
    const trophyKey = `preseason:${cup.name}:S${state.G.season}`;
    state.G.trophies.push(trophyKey);
    state.G.reputation = Math.min(100, state.G.reputation + 8);
    addLog(`🏆 You won the ${cup.name}.`, true);
    renderUI();
    renderPreseasonCupRoundResult(result, true, true);
    return;
  }

  cup.champion = cup.finalOpponent;
  state.G.reputation = Math.max(0, state.G.reputation - 2);
  addLog(`You lost the preseason final (${homeGoals}-${awayGoals}).`, true);
  renderUI();
  renderPreseasonCupRoundResult(result, false, true);
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
  changeCurrentClubManagerConnection(4);
  rippleKnownManagerConnections(2);
  renderUI();
  addLog('You refused performance enhancers. Integrity intact.',true);
  completeAction();
}

function acceptDoping() {
  const caught = Math.random()<0.42;
  if (caught) {
    state.G.bannedSeasons=2; state.G.dopingBans++;
    state.G.reputation=Math.max(0,state.G.reputation-30);
    changeCurrentClubManagerConnection(-30);
    rippleKnownManagerConnections(-10);
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
    setTrend('pace', 2);
    setTrend('physical', 2);
    changeCurrentClubManagerConnection(-6);
    rippleKnownManagerConnections(-2);
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
  if (Math.random()<0.55) {
    changeCurrentClubManagerConnection(5);
    rippleKnownManagerConnections(1);
    applyAndSeason({reputation:8},'Bold press conference. You deliver a stellar run. Press eats humble pie.');
  }
  else {
    changeCurrentClubManagerConnection(-7);
    rippleKnownManagerConnections(-2);
    applyAndSeason({reputation:-5},'Press conference backfires. A journalist clips it and it goes viral.');
  }
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

  state.pendingContract = {
    years: offer.contractYrs,
    releaseClause: offer.releaseClause,
    salary: offer.salary,
  };

  addLog(`📝 Pre-contract signed with ${state.G.club.name}: ${offer.contractYrs} year${offer.contractYrs>1?'s':''} starting next season, RC ${formatM(offer.releaseClause)}`, true);
  changeCurrentClubManagerConnection(10);
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
    changeCurrentClubManagerConnection(-8);
    addLog(`You rejected ${state.G.club.name}'s renewal and entered the market as a free agent.`);
    showFreeAgencyTransfer();
    return;
  }

  changeCurrentClubManagerConnection(-5);
  addLog(`You postponed renewal talks with ${state.G.club.name}.`);
  completeAction();
}

function declineRC() {
  if (state.rcOffer?.club?.name) {
    changeManagerConnection(state.rcOffer.club.name, -10);
  }
  changeCurrentClubManagerConnection(5);
  addLog(`You refused ${state.rcOffer.club.name}\'s advances. Bold move.`);
  completeAction();
}

function performTransfer(club, yrs, rc, salary) {
  const oldClub = state.G.club.name;
  state.pendingTransfer = {
    club,
    clubTier: getTierOfClub(club.name),
    contract: { years: yrs, releaseClause: rc, salary: salary || calcSalary(calcOvr()) }
  };

  state.pendingContract = null;

  changeManagerConnection(oldClub, -10);
  changeManagerConnection(club.name, 14);

  state.G.reputation = Math.min(100, state.G.reputation + club.prestige/40);
  renderUI();
  addLog(`✈️ Pre-contract agreed: ${oldClub} → ${club.name} (${yrs}yr) effective next season.`, true);
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

  const statKeys = ['pace', 'shooting', 'passing', 'dribbling', 'physical'];
  const statSnapshot = statKeys.reduce((acc, key) => {
    const val = Number(state.G.stats?.[key]);
    acc[key] = Number.isFinite(val) ? Math.round(val) : null;
    return acc;
  }, {});
  const validStatValues = statKeys
    .map(key => statSnapshot[key])
    .filter(val => Number.isFinite(val));
  const avgStat = validStatValues.length
    ? Math.round(validStatValues.reduce((sum, val) => sum + val, 0) / validStatValues.length)
    : null;

  state.G.seasonHistory.push({
    season: state.G.season,
    age: state.G.age,
    ovr: calcOvr(),
    marketValue: calcMarketValue(),
    goals: se.goals || 0,
    assists: se.assists || 0,
    saves: se.saves || 0,
    cleanSheets: se.cleanSheets || 0,
    ...statSnapshot,
    avgStat,
    club: state.G.club.name,
    trophies: se.trophies || []
  });

  state.G.age++; state.G.season++; state.G.seasonsPlayed++;

  resolveMarketplaceFeedbackAtSeasonEnd();
  state.marketBoard = null;
  if (!state.marketUi) {
    state.marketUi = { incomingIndex: null, targetIndex: null, applyMode: 'balanced' };
  } else {
    state.marketUi.incomingIndex = null;
    state.marketUi.targetIndex = null;
  }

  if (state.pendingTransfer) {
    state.G.club = state.pendingTransfer.club;
    state.G.clubTier = state.pendingTransfer.clubTier;
    state.G.contract = state.pendingTransfer.contract;
    state.pendingTransfer = null;
    state.pendingContract = null;
  } else if (state.pendingContract) {
    state.G.contract = state.pendingContract;
    state.pendingContract = null;
  }

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
