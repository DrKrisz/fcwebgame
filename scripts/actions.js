import { state } from './state.js';
import { addLog, clearStatFeedback, downloadCareerLogTxt, renderEvent, renderUI, renderRetirementChoice, setTrend, showScreen } from './ui.js';
import { goToSeason } from './season.js';
import { nextEvent } from './events.js';
import { calcMarketValue, calcOvr, calcSalary, formatM, getTierOfClub, rng } from './utils.js';
import { rerollAcademies, startGame, randomizeProfile, selectAcademy } from './game.js';
import { retire, downloadCareerData } from './retire.js';
import { renderSeasonResult } from './ui.js';
import { renderPreseasonCupHub, renderPreseasonCupQuestion, renderPreseasonCupRoundResult } from './ui.js';
import { acceptMarketInterest, applyToMarketClub, changeCurrentClubManagerConnection, changeManagerConnection, clearMarketplaceFocus, consumeMarketFeedback, resolveMarketplaceFeedbackAtSeasonEnd, rippleKnownManagerConnections, setExtensionOfferMode, setMarketApplicationMode, showFreeAgencyTransfer, showMarketplaceBoard, submitExtensionOffer, viewMarketplaceIncoming, viewMarketplaceTarget } from './transfers.js';
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
    case 'reroll-academies':
      rerollAcademies();
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
    case 'request-market-loan':
      requestMarketLoanOut();
      break;
    case 'open-booster':
      openBoosterMenu('quick');
      break;
    case 'back-transfer-week':
      nextEvent();
      break;
    case 'skip-free-agency':
      skipFreeAgencyWindow();
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
    case 'set-extension-mode':
      setExtensionOfferMode(data.mode);
      break;
    case 'send-extension-offer':
      sendExtensionOffer();
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
      openBoosterMenu('event');
      break;
    case 'open-booster-menu':
      openBoosterMenu(choice.payload?.source || 'event');
      break;
    case 'take-booster-tier':
      takeBoosterTier(choice.payload || {});
      break;
    case 'cancel-booster':
      cancelBooster(choice.payload?.source || 'quick');
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
    case 'accept-help-loan':
      acceptHelpLoanOffer(choice.payload || {});
      break;
    case 'accept-loan-sign-offer':
      acceptLoanSignOffer();
      break;
    case 'decline-loan-sign-offer':
      declineLoanSignOffer();
      break;
    case 'loan-sign-details':
      showLoanSignOfferDetails();
      break;
    case 'loan-sign-back':
      nextEvent();
      break;
    default:
      break;
  }
}

function acceptMarketplaceInterest(index) {
  if (isLoanActive()) {
    showMarketplaceBoard(`Marketplace is frozen while you are on loan at ${state.G.loan?.toClub?.name || 'another club'}.`);
    return;
  }

  const offer = acceptMarketInterest(index);
  if (!offer) return;
  performTransfer(offer.club, offer.contractYrs, offer.releaseClause, offer.salary);
}

function acceptMarketFeedbackOffer() {
  if (isLoanActive()) {
    nextEvent();
    return;
  }

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
  const teams = buildUniquePreseasonTeams(opponentPool);
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

function ensureLoanState() {
  if (!state.G.loan || typeof state.G.loan !== 'object') {
    state.G.loan = {
      active: false,
      fromClub: null,
      toClub: null,
      seasonsLeft: 0,
      growthMultiplier: 1.25,
      youthLoanCheckDone: false,
      focus: 'development',
      completionBonus: 0,
    };
  }
  if (!Number.isFinite(state.G.loan.growthMultiplier)) state.G.loan.growthMultiplier = 1.25;
  return state.G.loan;
}

function isLoanActive() {
  const loan = ensureLoanState();
  return !!loan?.active && Number(loan.seasonsLeft) > 0 && !!loan.toClub && !!loan.fromClub;
}

function getLoanGrowthMultiplier() {
  return isLoanActive() ? Math.max(1, Number(state.G.loan.growthMultiplier) || 1.25) : 1;
}

function getSigningGrowthMultiplier() {
  const seasons = Math.max(0, Number(state.G.postLoanSigningBoostSeasons) || 0);
  if (seasons <= 0) return 1;
  return Math.max(1, Number(state.G.postLoanSigningBoostMultiplier) || 1.08);
}

function formatWeeklyWage(weeklySalary) {
  const weekly = Math.max(0, Number(weeklySalary) || 0);
  if (weekly >= 1000000) return `€${(weekly / 1000000).toFixed(2)}M/wk`;
  if (weekly >= 1000) return `€${Math.round(weekly / 1000)}K/wk`;
  return `€${Math.round(weekly)}/wk`;
}

function buildLoanSignOfferReason(offer) {
  const seasons = Math.max(1, Number(offer?.developmentBoostSeasons) || 5);
  const boostPct = Math.round((Math.max(1, Number(offer?.developmentBoostMultiplier) || 1.08) - 1) * 100);
  if ((state.G.age || 16) >= 30) {
    return `Short-term leadership role with premium wage upside. You also unlock a +${boostPct}% training boost for ${seasons} seasons if you sign.`;
  }
  return `They project more responsibility and minutes right away. You also unlock a +${boostPct}% development boost for ${seasons} seasons if you sign.`;
}

function getClubTierIndexByName(clubName) {
  return TIERS.findIndex(tier => tier.some(club => club.name === clubName));
}

function buildYouthLoanTargetClub(parentClubName) {
  const parentTierIndex = getClubTierIndexByName(parentClubName);
  if (parentTierIndex < 0) return null;

  const parentClub = TIERS[parentTierIndex].find(club => club.name === parentClubName);
  const maxTierIndex = TIERS.length - 1;
  const candidateTierIndexes = [...new Set([
    Math.min(maxTierIndex, parentTierIndex - 1),
    Math.min(maxTierIndex, parentTierIndex - 2),
    Math.min(maxTierIndex, parentTierIndex - 3),
  ])].filter(index => index >= 0 && index !== parentTierIndex);

  let pool = candidateTierIndexes
    .flatMap(index => (TIERS[index] || []).map(club => ({ club, tierIndex: index })))
    .filter(entry => entry.club?.name && entry.club.name !== parentClubName)
    .filter(entry => (entry.club.prestige || 50) <= ((parentClub?.prestige || 90) - 6));

  if (!pool.length) {
    pool = TIERS
      .slice(0, parentTierIndex)
      .flatMap((tier, index) => tier.map(club => ({ club, tierIndex: index })))
      .filter(entry => entry.club?.name && entry.club.name !== parentClubName);
  }

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildGeneralLoanTargetClub(parentClubName) {
  const parentTierIndex = getClubTierIndexByName(parentClubName);
  if (parentTierIndex < 0) return null;

  const candidateTierIndexes = [...new Set([
    Math.max(0, parentTierIndex - 1),
    Math.max(0, parentTierIndex - 2),
    Math.max(0, parentTierIndex - 3),
  ])].filter(index => index >= 0 && index < TIERS.length);

  let pool = candidateTierIndexes
    .flatMap(index => (TIERS[index] || []).map(club => ({ club, tierIndex: index })))
    .filter(entry => entry.club?.name && entry.club.name !== parentClubName);

  if (!pool.length) {
    pool = TIERS
      .flatMap((tier, index) => tier.map(club => ({ club, tierIndex: index })))
      .filter(entry => entry.club?.name && entry.club.name !== parentClubName);
  }

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function beginLoanMove(target, options = {}) {
  if (!target?.club) return false;
  const loanYears = clamp(Number(options.loanYears) || rng(1, 2), 1, 2);
  const focus = options.focus === 'money' ? 'money' : 'development';
  const growthMultiplier = focus === 'development' ? 1.25 : 1;
  const completionBonus = Math.max(0, Number(options.completionBonus) || 0);
  const source = options.source || 'loan';

  const parentClub = { ...state.G.club };
  const loan = ensureLoanState();
  state.G.loan = {
    ...loan,
    active: true,
    fromClub: parentClub,
    toClub: { ...target.club },
    seasonsLeft: loanYears,
    growthMultiplier,
    youthLoanCheckDone: true,
    focus,
    completionBonus,
    source,
  };

  state.G.club = { ...target.club };
  state.G.clubTier = target.tierIndex + 1;
  state.pendingTransfer = null;
  state.pendingContract = null;
  return true;
}

function requestMarketLoanOut() {
  const currentSeason = Math.max(1, Number(state.G.season) || 1);
  const nextAllowedSeason = Math.max(1, Number(state.G.loanRequestCooldownSeason) || 1);
  if (currentSeason < nextAllowedSeason) {
    const seasonsLeft = nextAllowedSeason - currentSeason;
    showMarketplaceBoard(`Loan request cooldown active. Try again in ${seasonsLeft} season${seasonsLeft !== 1 ? 's' : ''}.`);
    return;
  }

  if ((state.G.contract?.years || 0) <= 0) {
    showMarketplaceBoard('You need an active parent-club contract before requesting a loan.');
    return;
  }
  if (isLoanActive()) {
    showMarketplaceBoard('Loan request denied: you are already on loan.');
    return;
  }

  const target = buildGeneralLoanTargetClub(state.G.club.name);
  if (!target) {
    showMarketplaceBoard('No suitable loan destinations were available this window.');
    return;
  }

  state.G.loanRequestCooldownSeason = currentSeason + 1;

  const ovr = calcOvr();
  const strongClub = (state.G.club?.prestige || 60) >= 82;
  const weakAtClub = ovr <= ((state.G.club?.prestige || 60) - 18);
  let acceptanceChance = 0.34;
  if (strongClub && weakAtClub) acceptanceChance += 0.28;
  acceptanceChance += Math.max(0, (state.G.reputation || 0) - 55) * 0.003;
  acceptanceChance -= Math.max(0, ovr - 82) * 0.01;
  acceptanceChance = clamp(acceptanceChance, 0.10, 0.82);

  if (Math.random() >= acceptanceChance) {
    showMarketplaceBoard(`${state.G.club.name} rejected your loan request this time.`);
    return;
  }

  const olderMoneyLoan = state.G.age >= 30 && ovr >= 78;
  const loanYears = rng(1, 2);
  const completionBonus = olderMoneyLoan
    ? Math.round((state.G.contract?.salary || 0) * 52 * loanYears * 0.45)
    : 0;

  beginLoanMove(target, {
    loanYears,
    focus: olderMoneyLoan ? 'money' : 'development',
    completionBonus,
    source: 'market-request',
  });

  const extra = olderMoneyLoan
    ? `Performance bonus on return: ${formatM(completionBonus)}.`
    : 'Development boost active (+25% stat growth).';
  addLog(`📨 Loan approved: ${state.G.loan.fromClub.name} sent you to ${target.club.name} for ${loanYears} season${loanYears > 1 ? 's' : ''}. ${extra}`, true);
  renderUI();
  showMarketplaceBoard(`Loan approved: ${target.club.name} (${loanYears}y).`);
}

function acceptHelpLoanOffer(payload) {
  if (isLoanActive()) {
    addLog('You are already on loan and cannot accept another loan move.', true);
    completeAction();
    return;
  }

  const targetName = payload.clubName;
  const tierIndex = Number.isFinite(payload.tierIndex) ? payload.tierIndex : getClubTierIndexByName(targetName);
  if (!targetName || tierIndex < 0) {
    addLog('Loan offer collapsed due to missing destination details.', true);
    completeAction();
    return;
  }

  const club = TIERS[tierIndex]?.find(c => c.name === targetName);
  if (!club) {
    addLog('Loan offer collapsed because the target club was unavailable.', true);
    completeAction();
    return;
  }

  const focus = payload.focus === 'money' ? 'money' : 'development';
  const loanYears = clamp(Number(payload.loanYears) || rng(1, 2), 1, 2);
  const completionBonus = focus === 'money'
    ? Math.max(0, Number(payload.completionBonus) || Math.round((state.G.contract?.salary || 0) * 52 * loanYears * 0.4))
    : 0;

  beginLoanMove({ club, tierIndex }, {
    loanYears,
    focus,
    completionBonus,
    source: 'help-event',
  });

  const follow = focus === 'money'
    ? `Contracted completion bonus: ${formatM(completionBonus)}.`
    : 'Development boost active (+25% stat growth).';
  addLog(`🤝 You accepted the help mission loan: ${state.G.loan.fromClub.name} → ${club.name} (${loanYears}y). ${follow}`, true);
  renderUI();
  completeAction();
}

function acceptLoanSignOffer() {
  const offer = state.loanSignOffer;
  if (!offer?.club) {
    completeAction();
    return;
  }

  const previousClub = state.G.club?.name;
  state.G.club = offer.club;
  state.G.clubTier = offer.clubTier;
  state.G.contract = {
    years: offer.contractYrs,
    releaseClause: offer.releaseClause,
    salary: offer.salary,
  };
  state.pendingTransfer = null;
  state.pendingContract = null;
  state.G.postLoanSigningBoostSeasons = Math.max(0, Number(offer.developmentBoostSeasons) || 5);
  state.G.postLoanSigningBoostMultiplier = Math.max(1, Number(offer.developmentBoostMultiplier) || 1.08);
  state.loanSignOffer = null;
  addLog(`✍️ You signed permanently for ${offer.club.name} after a successful loan (${previousClub} → ${offer.club.name}). Development plan active for ${state.G.postLoanSigningBoostSeasons} seasons.`, true);
  renderUI();
  completeAction();
}

function declineLoanSignOffer() {
  const offer = state.loanSignOffer;
  if (offer?.club?.name) {
    addLog(`You rejected ${offer.club.name}'s permanent offer and stayed with ${state.G.club.name}.`, true);
  }
  state.loanSignOffer = null;
  completeAction();
}

function showLoanSignOfferDetails() {
  const offer = state.loanSignOffer;
  if (!offer?.club) {
    nextEvent();
    return;
  }

  const yearlySalaryM = (offer.salary * 52) / 1000000;
  const reason = offer.reason || buildLoanSignOfferReason(offer);
  renderEvent({
    colorClass: 'ec-season',
    icon: '📋',
    tag: 'CONTRACT DETAILS',
    text: `Permanent offer from <strong>${offer.club.name}</strong><br><br>
      • Contract: <strong>${offer.contractYrs} years</strong><br>
      • Wage: <strong>${formatWeeklyWage(offer.salary)}</strong> (<strong>${formatM(yearlySalaryM)}</strong>/year)<br>
      • Release clause: <strong>${formatM(offer.releaseClause)}</strong><br>
      • Why move: ${reason}`,
    choices: [
      { icon:'🖊️', label:`Sign for ${offer.club.name}`, hint:'Permanent transfer', actionType:'accept-loan-sign-offer' },
      { icon:'🏠', label:'Decline and stay', hint:'Return to parent club', actionType:'decline-loan-sign-offer' },
      { icon:'↩️', label:'Back to offer summary', hint:'Review decision screen', actionType:'loan-sign-back' },
    ],
  });
}

function maybeTriggerYouthLoan() {
  if (!state.G) return;

  ensureLoanState();

  if (state.G.loan.youthLoanCheckDone) return;
  state.G.loan.youthLoanCheckDone = true;

  if (state.G.season !== 1 || state.G.age > 17) return;
  const parentClub = state.G.club;
  if (!parentClub || (parentClub.prestige || 0) < 86) return;
  if ((state.G.contract?.years || 0) < 5) return;

  const ovr = calcOvr();
  let chance = 0.30;
  if (ovr < 68) chance += 0.18;
  else if (ovr < 72) chance += 0.10;
  const weakAtEliteClub = (parentClub.prestige || 0) >= 88 && ovr <= ((parentClub.prestige || 88) - 20);
  if (weakAtEliteClub) chance = Math.max(chance, 0.9);
  chance = clamp(chance, 0.12, weakAtEliteClub ? 0.92 : 0.58);

  if (Math.random() >= chance) return;

  const target = buildYouthLoanTargetClub(parentClub.name);
  if (!target) return;

  const loanYears = rng(1, 2);
  beginLoanMove(target, {
    loanYears,
    focus: 'development',
    completionBonus: 0,
    source: 'forced-youth',
  });

  state.pendingLoanReaction = {
    active: true,
    fromClubName: state.G.loan?.fromClub?.name || parentClub.name,
    toClubName: target.club.name,
    loanYears,
    growthMultiplier: Math.max(1, Number(state.G.loan?.growthMultiplier) || 1.25),
  };

  addLog(`📄 Loan move: ${state.G.loan.fromClub.name} sent you to ${target.club.name} for ${loanYears} season${loanYears > 1 ? 's' : ''}. Development boost active (+25% stat growth).`, true);
}

function applyLoanSeasonProgress() {
  if (!isLoanActive()) return;

  const previousLoanClub = state.G.loan?.toClub ? { ...state.G.loan.toClub } : null;
  const previousLoanFocus = state.G.loan?.focus || 'development';
  const completionBonus = Math.max(0, Number(state.G.loan?.completionBonus) || 0);

  state.G.loan.seasonsLeft = Math.max(0, Number(state.G.loan.seasonsLeft) - 1);
  if (state.G.loan.seasonsLeft > 0) {
    addLog(`Loan update: staying at ${state.G.loan.toClub.name} for ${state.G.loan.seasonsLeft} more season${state.G.loan.seasonsLeft > 1 ? 's' : ''}.`, true);
    return;
  }

  const parentClub = state.G.loan.fromClub ? { ...state.G.loan.fromClub } : null;
  if (parentClub) {
    state.G.club = parentClub;
    const parentTierIndex = getClubTierIndexByName(parentClub.name);
    if (parentTierIndex >= 0) state.G.clubTier = parentTierIndex + 1;
    addLog(`✅ Loan ended. You returned to ${parentClub.name}.`, true);
  }

  if (completionBonus > 0) {
    state.G.totalEarnings = (state.G.totalEarnings || 0) + completionBonus;
    addLog(`💰 Loan completion bonus paid: ${formatM(completionBonus)}.`, true);
  }

  if (previousLoanClub && state.G.contract?.years > 0) {
    const profile = calcOvr() + (state.G.reputation || 0) * 0.24 + rng(-6, 8);
    const baseChance = previousLoanFocus === 'development' ? 0.22 : 0.16;
    const signChance = clamp(baseChance + (profile - 72) * 0.01, 0.08, 0.58);
    if (Math.random() < signChance) {
      const salary = Math.round((calcSalary(calcOvr(), state.G.age) * (1 + (previousLoanClub.prestige || 60) / 230)) / 1000) * 1000;
      state.loanSignOffer = {
        club: { ...previousLoanClub },
        clubTier: getClubTierIndexByName(previousLoanClub.name) + 1,
        contractYrs: rng(2, 4),
        salary: Math.max(1000, salary),
        releaseClause: Math.round(Math.max(1, calcMarketValue() * (1.7 + (previousLoanClub.prestige || 60) / 150)) * 10) / 10,
        developmentBoostSeasons: 5,
        developmentBoostMultiplier: 1.08,
      };
      state.loanSignOffer.reason = buildLoanSignOfferReason(state.loanSignOffer);
      addLog(`${previousLoanClub.name} is ready to offer you a permanent move after your loan spell.`, true);
    }
  }

  state.G.loan.active = false;
  state.G.loan.toClub = null;
  state.G.loan.seasonsLeft = 0;
  state.G.loan.focus = 'development';
  state.G.loan.completionBonus = 0;
}

function buildPreseasonOpponentPool() {
  const currentTierIndex = Math.max(0, (state.G.clubTier || 1) - 1);
  const candidateTiers = [...new Set([
    Math.max(0, currentTierIndex - 1),
    currentTierIndex,
    Math.min(TIERS.length - 1, currentTierIndex + 1),
  ])];

  const candidates = candidateTiers
    .flatMap(index => TIERS[index] || [])
    .filter(club => club.name !== state.G.club.name);

  const seen = new Set([state.G.club.name]);
  const uniqueCandidates = candidates.filter(club => {
    if (!club?.name || seen.has(club.name)) return false;
    seen.add(club.name);
    return true;
  });

  const shuffled = [...uniqueCandidates].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 3).map(club => club.name);

  if (picked.length === 3) return picked;

  const fallbackPool = TIERS.flat()
    .filter(club => club?.name && !seen.has(club.name))
    .filter(club => {
      seen.add(club.name);
      return true;
    })
    .sort(() => Math.random() - 0.5)
    .slice(0, 3 - picked.length)
    .map(club => club.name);

  return [...picked, ...fallbackPool];
}

function buildUniquePreseasonTeams(opponentPool) {
  const yourClub = state.G.club.name;
  const teams = [yourClub];
  const used = new Set([yourClub]);

  (opponentPool || []).forEach(name => {
    if (!name || used.has(name) || teams.length >= 4) return;
    teams.push(name);
    used.add(name);
  });

  if (teams.length < 4) {
    const refill = TIERS.flat()
      .map(club => club?.name)
      .filter(name => !!name && !used.has(name))
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
      .sort(() => Math.random() - 0.5);

    for (const name of refill) {
      if (teams.length >= 4) break;
      teams.push(name);
      used.add(name);
    }
  }

  return teams;
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

  factor *= getLoanGrowthMultiplier();
  factor *= getSigningGrowthMultiplier();

  return Math.max(0.2, rawDelta * factor);
}

function rushBack(baseDelta) {
  const deltas = {...baseDelta, fitness:(baseDelta.fitness||0)-8};
  applyStatDeltas(deltas);
  renderUI();
  addLog('You rushed back. The physio warned you. Extra strain on the injury.');

  const age = Number(state.G.age) || 16;
  const careerEndingRisk = age >= 37 ? 0.16 : age >= 32 ? 0.1 : 0.05;
  if (Math.random() < careerEndingRisk) {
    addLog('🚑 Career-ending injury. Doctors confirm you cannot continue playing professionally.', true);
    retire();
    return;
  }

  completeAction();
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
  openBoosterMenu('event');
}

function applyDopingBan(banSeasons, reputationHit) {
  const seasons = Math.max(1, Number(banSeasons) || 2);
  const bannedClubName = state.G.club?.name;
  if (!Array.isArray(state.G.bannedFromClubs)) state.G.bannedFromClubs = [];
  if (bannedClubName && !state.G.bannedFromClubs.includes(bannedClubName)) {
    state.G.bannedFromClubs.push(bannedClubName);
  }

  state.G.bannedSeasons = Math.max(0, seasons - 1);
  state.G.banFreeAgencyLock = true;
  state.G.dopingBans++;
  state.G.reputation = Math.max(0, state.G.reputation - reputationHit);
  state.G.contract.years = 0;
  state.G.contract.salary = 0;
  state.G.contract.releaseClause = 0;
  state.pendingTransfer = null;
  state.pendingContract = null;
  changeCurrentClubManagerConnection(-30);
  rippleKnownManagerConnections(-10);
  renderUI();
  addLog(`Tested positive. ${seasons}-season ban. Contract terminated.`, true);
  renderSeasonResult({
    title: `DOPING BAN — ${seasons} SEASON${seasons > 1 ? 'S' : ''}`,
    text: `The test came back positive. A ${seasons}-season suspension is issued (this current season counts as year 1). Your club terminates your contract immediately — you are now a free agent due to ban.`,
    seasonType: 'doping-ban',
    banLabel: 'Doping ban',
    ballonIneligibleReason: 'doping-ban',
    trophies: [], goals: 0, assists: 0, saves: 0, cleanSheets: 0,
  }, [{label:'Reputation',delta:-reputationHit,type:'dn'}], { rank: null, reason: 'doping-ban' }, true);
}

function getBoosterUseKey() {
  return `${state.G.season}:${state.seasonAction || 1}`;
}

function openBoosterMenu(source = 'quick') {
  if (state.G.bannedSeasons > 0) {
    addLog('You are suspended and cannot use boosters during a ban.', true);
    return;
  }

  const useKey = getBoosterUseKey();
  if (state.G.lastBoosterUseKey === useKey) {
    addLog('Booster already used for this action. Wait for the next action.', true);
    return;
  }

  renderEvent({
    colorClass: 'ec-doping',
    icon: '💉',
    tag: 'BOOSTER LAB',
    text: 'Choose substance strength. Harder substances give better short-term gains, but detection risk and ban length are much higher.',
    choices: [
      {
        icon: '🧪',
        label: 'Light booster',
        hint: 'Low gain · 12% test risk · 1-season ban',
        actionType: 'take-booster-tier',
        payload: {
          source,
          label: 'light booster',
          catchChance: 0.12,
          banSeasons: 1,
          repHit: 18,
          deltas: { pace: 1, physical: 1, fitness: -5 },
          managerHit: -5,
          rippleHit: -2,
        },
      },
      {
        icon: '⚗️',
        label: 'Strong booster',
        hint: 'Medium gain · 30% test risk · 2-season ban',
        actionType: 'take-booster-tier',
        payload: {
          source,
          label: 'strong booster',
          catchChance: 0.30,
          banSeasons: 2,
          repHit: 32,
          deltas: { pace: 2, physical: 2, shooting: 1, fitness: -10 },
          managerHit: -9,
          rippleHit: -3,
        },
      },
      {
        icon: '☠️',
        label: 'Extreme substance',
        hint: 'High gain · 55% test risk · 3-season ban',
        actionType: 'take-booster-tier',
        payload: {
          source,
          label: 'extreme substance',
          catchChance: 0.55,
          banSeasons: 3,
          repHit: 48,
          deltas: { pace: 3, physical: 3, shooting: 2, dribbling: 1, fitness: -16 },
          managerHit: -14,
          rippleHit: -6,
        },
      },
      {
        icon: '🚫',
        label: 'Back out',
        hint: 'No effects',
        actionType: 'cancel-booster',
        payload: { source },
      },
    ],
  });
}

function cancelBooster(source = 'quick') {
  addLog('You walked away from the booster offer.', true);
  if (source === 'event') {
    completeAction();
    return;
  }
  nextEvent();
}

function takeBoosterTier(payload) {
  const useKey = getBoosterUseKey();
  if (state.G.lastBoosterUseKey === useKey) {
    addLog('Booster already used for this action.', true);
    return;
  }

  const {
    source = 'quick',
    label = 'booster',
    catchChance = 0.34,
    banSeasons = 2,
    repHit = 30,
    deltas = { pace: 2, physical: 2 },
    managerHit = -6,
    rippleHit = -2,
  } = payload || {};

  state.G.lastBoosterUseKey = useKey;
  const caught = Math.random() < catchChance;
  if (caught) {
    applyDopingBan(banSeasons, repHit);
    return;
  }

  applyStatDeltas(deltas);
  changeCurrentClubManagerConnection(managerHit);
  rippleKnownManagerConnections(rippleHit);
  renderUI();
  addLog(`You used ${label}. Big short-term boost, but your circle is suspicious.`, true);

  if (source === 'event') {
    completeAction();
  } else {
    nextEvent();
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

function sendExtensionOffer() {
  const previousPending = state.pendingContract;
  submitExtensionOffer();
  const nextPending = state.pendingContract;

  if (nextPending && nextPending !== previousPending) {
    addLog(`📝 You initiated extension talks and ${state.G.club.name} accepted your terms (${nextPending.years} year${nextPending.years !== 1 ? 's' : ''}).`, true);
  }
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
  if (isLoanActive()) {
    addLog(`Transfer blocked: you are currently on loan at ${state.G.loan?.toClub?.name || 'another club'}.`, true);
    renderUI();
    nextEvent();
    return;
  }

  const oldClub = state.G.club.name;
  const immediateBanReturnSigning = !!state.G.banFreeAgencyLock && (state.G.contract?.years || 0) <= 0;

  if (immediateBanReturnSigning) {
    state.G.club = club;
    state.G.clubTier = getTierOfClub(club.name);
    state.G.contract = { years: yrs, releaseClause: rc, salary: salary || calcSalary(calcOvr()) };
    state.pendingTransfer = null;
    state.pendingContract = null;
    state.G.banFreeAgencyLock = false;

    changeManagerConnection(oldClub, -12);
    changeManagerConnection(club.name, 16);
    state.G.reputation = Math.min(100, state.G.reputation + club.prestige / 55);

    renderUI();
    addLog(`✍️ Ban lifted: you signed for ${club.name} and start immediately this season.`, true);
    nextEvent();
    return;
  }

  state.pendingTransfer = {
    club,
    clubTier: getTierOfClub(club.name),
    contract: { years: yrs, releaseClause: rc, salary: salary || calcSalary(calcOvr()) }
  };

  state.pendingContract = null;
  state.G.banFreeAgencyLock = false;

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
  if ((state.seasonAction || 1) === 1) {
    maybeTriggerYouthLoan();
  }

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
  const wasDopingBanSeason = se?.seasonType === 'doping-ban' || se?.ballonIneligibleReason === 'doping-ban';
  const completedBanThisSeason = wasDopingBanSeason && !!state.G.banFreeAgencyLock && Number(state.G.bannedSeasons || 0) <= 0;
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
    state.G.ballonHistory.push({
      season: state.G.season,
      age: state.G.age,
      rank: null,
      club: state.G.club.name,
      ineligibleReason: wasDopingBanSeason ? 'doping-ban' : null,
    });
  }

  if (completedBanThisSeason) {
    const existingRecovery = Number(state.G.postBanValueRecoverySeasons) || 0;
    state.G.postBanValueRecoverySeasons = Math.max(existingRecovery, 4);
  }

  if (state.G.age >= 30) applyAgeDecline();
  if (state.G.age < 23)  autoGrow();
  state.G.fitness = Math.min(100, state.G.fitness + 12);
  state.G.contract.years = Math.max(0, (state.G.contract.years || 0) - 1);

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
    trophies: se.trophies || [],
    seasonType: se?.seasonType || 'normal',
    banLabel: se?.banLabel || null,
    ballonIneligibleReason: se?.ballonIneligibleReason || null,
  });

  state.G.age++; state.G.season++; state.G.seasonsPlayed++;

  if (Number(state.G.postBanValueRecoverySeasons) > 0 && !state.G.banFreeAgencyLock) {
    state.G.postBanValueRecoverySeasons = Math.max(0, state.G.postBanValueRecoverySeasons - 1);
  }

  if (Number(state.G.postLoanSigningBoostSeasons) > 0) {
    state.G.postLoanSigningBoostSeasons = Math.max(0, state.G.postLoanSigningBoostSeasons - 1);
  }

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

  applyLoanSeasonProgress();

  state.seasonAction = 1;
  renderUI();

  const contractYearsLeft = Math.max(0, Number(state.G.contract?.years) || 0);

  const ovr = calcOvr();

  if (state.G.age >= 36 && contractYearsLeft <= 0) {
    // Retirement is always optional for free agents
    const canKeepPlaying = true;

    const retireMsg = state.G.age >= 40
      ? `At ${state.G.age}, you\'ve had an incredible run. Retire now or keep pushing.`
      : state.G.age >= 38
      ? `${state.G.age} years old. Still got something left in the tank, or is it time?`
      : `You\'re ${state.G.age} now. Many legends retire around this age. What\'s your choice?`;

    const keepPlayingMsg = canKeepPlaying
      ? `Clubs will still take you at OVR ${ovr}. You could keep chasing titles and glory.`
      : `Your OVR is ${ovr} — it\'ll be hard to find clubs willing to sign you.`;

    renderRetirementChoice(retireMsg, keepPlayingMsg, canKeepPlaying);
  } else {
    nextEvent();
  }
}

function continueCareer() {
  nextEvent();
}

function skipFreeAgencyWindow() {
  addLog('You stayed active as a free agent and kept your career going.', true);
  completeAction();
}

function autoGrow() {
  const loanMultiplier = getLoanGrowthMultiplier();
  const signingMultiplier = getSigningGrowthMultiplier();
  Object.keys(state.G.stats).forEach(k=>{
    const current = state.G.stats[k];
    const growthCapBase = current >= 90 ? 0.15 : current >= 85 ? 0.35 : current >= 80 ? 0.6 : 1.0;
    const growthCap = growthCapBase * loanMultiplier * signingMultiplier;
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
