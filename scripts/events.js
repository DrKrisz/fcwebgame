import { state } from './state.js';
import { calcMarketValue, calcOvr, formatM, rng } from './utils.js';
import { renderEvent, renderSeasonResult } from './ui.js';
import { buildRenewalOffer, buildTransferOffers, canClubFinanceMove, renderTransferChoices, showContractTalk, showFreeAgencyTransfer, showNextMarketplaceFeedback, showReleaseClauseEvent } from './transfers.js';
import { buildBanSeasonEvent } from './season.js';
import { GK_STAT_META, STAT_META, TIERS, getDomesticCupName, getNationalTeamProfile } from './data.js';

const ACTION_LABELS = {
  1: 'Preseason Cup',
  2: 'League Matchday',
  3: 'League Matchday',
  4: 'Domestic Cup',
  5: 'League Matchday',
  6: 'Continental Night',
  7: 'National Team Window',
  8: 'Clutch Moment',
  9: 'Transfer & Contract Week',
  10:'Season Run-In',
  11:'League Matchday',
  12:'Adidas Cup',
  13:'Nike Cup'
};

function isLoanActive() {
  const loan = state.G?.loan;
  return !!loan?.active && Number(loan.seasonsLeft) > 0;
}

function formatWeeklyWage(weeklySalary) {
  const weekly = Math.max(0, Number(weeklySalary) || 0);
  if (weekly >= 1000000) return `€${(weekly / 1000000).toFixed(2)}M/wk`;
  if (weekly >= 1000) return `€${Math.round(weekly / 1000)}K/wk`;
  return `€${Math.round(weekly)}/wk`;
}

export function nextEvent() {
  if (showNextMarketplaceFeedback()) return;

  const pendingLoanReactionEvent = consumeLoanReactionEvent();
  if (pendingLoanReactionEvent) {
    renderEvent(withScaledStatHintPreview(pendingLoanReactionEvent));
    return;
  }

  if (state.loanSignOffer?.club?.name) {
    renderEvent(withScaledStatHintPreview(buildLoanSignOfferEvent()));
    return;
  }

  if (state.G.bannedSeasons > 0) {
    const seasonsRemainingBeforeAdvance = state.G.bannedSeasons;
    state.G.bannedSeasons--;
    state.G.fitness = Math.min(100, state.G.fitness + 10);
    const se = buildBanSeasonEvent(seasonsRemainingBeforeAdvance);
    renderSeasonResult(se, [], { rank: null, reason: 'doping-ban' }, true);
    return;
  }

  if ((state.G.contract?.years || 0) <= 0 && state.G.banFreeAgencyLock) {
    showFreeAgencyTransfer();
    return;
  }

  const slot = state.seasonAction || 1;

  if (slot === 9) {
    if (isLoanActive()) {
      renderEvent(buildLoanTransferLockedEvent());
      return;
    }

    if (state.G.contract.years === 1 && state.renewalCheckSeason !== state.G.season) {
      state.renewalCheckSeason = state.G.season;
      const renewalOffer = buildRenewalOffer(false);
      if (renewalOffer) {
        showContractTalk(renewalOffer, false);
        return;
      }
    }

    if (state.G.contract.years <= 0) {
      if (!state.G.banFreeAgencyLock && state.freeAgentRenewalCheckSeason !== state.G.season) {
        state.freeAgentRenewalCheckSeason = state.G.season;
        const freeAgentRenewal = buildRenewalOffer(true);
        if (freeAgentRenewal) {
          showContractTalk(freeAgentRenewal, true);
          return;
        }
      }

      showFreeAgencyTransfer();
      return;
    }

    const triggerRC = checkReleaseClauseTrigger();
    if (triggerRC) {
      showReleaseClauseEvent(triggerRC);
      return;
    }

    if (state.G.age >= 18 && Math.random() < 0.45) {
      const offers = buildTransferOffers();
      if (offers.length) {
        renderTransferChoices(buildTransferEvent(offers));
        return;
      }
    }
  }

  const ev = buildActionEvent(slot);
  renderEvent(withScaledStatHintPreview(ev));
}

export function getActionLabel(slot) {
  return ACTION_LABELS[slot] || 'Career Action';
}

function withScaledStatHintPreview(eventDef) {
  if (!eventDef || !Array.isArray(eventDef.choices)) return eventDef;

  const choices = eventDef.choices.map((choice) => {
    const preview = buildScaledStatPreview(choice);
    if (!preview) return choice;

    const baseHint = choice.hint ? `${choice.hint}` : '';
    const suffix = `Actual: ${preview}`;
    return {
      ...choice,
      hint: baseHint ? `${baseHint} · ${suffix}` : suffix,
    };
  });

  return {
    ...eventDef,
    choices,
  };
}

function buildScaledStatPreview(choice) {
  if (!choice || !choice.payload) return '';

  const actionType = choice.actionType;
  if (!['training', 'apply-season', 'national-performance'].includes(actionType)) return '';

  const source = choice.payload.deltas && typeof choice.payload.deltas === 'object'
    ? choice.payload.deltas
    : choice.payload;

  if (!source || typeof source !== 'object') return '';

  const statKeys = ['pace', 'shooting', 'passing', 'dribbling', 'physical'];
  const parts = [];

  statKeys.forEach((key) => {
    const rawDelta = Number(source[key]);
    if (!Number.isFinite(rawDelta) || rawDelta <= 0) return;
    const applied = scaleStatDeltaForPreview(key, rawDelta);
    parts.push(`${getStatLabel(key)} +${formatHintDelta(applied)}`);
  });

  return parts.join(', ');
}

function scaleStatDeltaForPreview(statKey, rawDelta) {
  if (rawDelta <= 0) return rawDelta;

  const current = Number(state.G?.stats?.[statKey]) || 60;
  let factor = 1;
  if (current >= 94) factor = 0.15;
  else if (current >= 90) factor = 0.25;
  else if (current >= 85) factor = 0.45;
  else if (current >= 80) factor = 0.65;

  const age = Number(state.G?.age) || 16;
  if (age >= 31) factor *= 0.65;
  else if (age >= 27) factor *= 0.85;

  factor *= getLoanGrowthMultiplierForPreview();
  factor *= getSigningGrowthMultiplierForPreview();

  return Math.max(0.2, rawDelta * factor);
}

function getLoanGrowthMultiplierForPreview() {
  const loan = state.G?.loan;
  const loanActive = !!loan?.active && Number(loan.seasonsLeft) > 0 && !!loan.toClub && !!loan.fromClub;
  if (!loanActive) return 1;
  return Math.max(1, Number(loan.growthMultiplier) || 1.25);
}

function getSigningGrowthMultiplierForPreview() {
  const seasons = Math.max(0, Number(state.G?.postLoanSigningBoostSeasons) || 0);
  if (seasons <= 0) return 1;
  return Math.max(1, Number(state.G?.postLoanSigningBoostMultiplier) || 1.08);
}

function formatHintDelta(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function checkReleaseClauseTrigger() {
  const ovr = calcOvr();
  const mv  = calcMarketValue();
  const rc  = state.G.contract.releaseClause;

  if (state.G.clubTier >= 7) return null;
  if (state.G.age < 18) return null;
  const undervalued = rc < mv * 1.5;
  const chance = undervalued ? 0.35 : 0.14;
  if (Math.random() > chance) return null;

  const higherTiers = TIERS.slice(state.G.clubTier, Math.min(state.G.clubTier + 2, TIERS.length));
  if (!higherTiers.length) return null;
  const pool = higherTiers
    .flat()
    .filter(c => c.prestige > state.G.club.prestige + 5)
    .filter(c => canClubFinanceMove(c, rc, ovr) || Math.random() < 0.08);
  if (!pool.length) return null;

  const total = pool.reduce((s,c)=>s+c.prestige,0);
  let r = Math.random()*total;
  for (const c of pool) { r-=c.prestige; if(r<=0) return c; }
  return pool[pool.length-1];
}

function consumeLoanReactionEvent() {
  const pending = state.pendingLoanReaction;
  if (!pending?.active) return null;

  state.pendingLoanReaction = null;

  const fromClubName = pending.fromClubName || state.G.loan?.fromClub?.name || 'your parent club';
  const toClubName = pending.toClubName || state.G.loan?.toClub?.name || state.G.club?.name || 'the loan club';
  const loanYears = Math.max(1, Number(pending.loanYears) || Number(state.G.loan?.seasonsLeft) || 1);
  const boostPct = Math.round((Math.max(1, Number(pending.growthMultiplier) || 1.25) - 1) * 100);

  return {
    colorClass:'ec-fame', icon:'📄', tag:'LOAN MOVE CONFIRMED',
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. You are being loaned from <strong>${fromClubName}</strong> to <strong>${toClubName}</strong> for <strong>${loanYears} season${loanYears > 1 ? 's' : ''}</strong>. Development boost is active (<strong>+${boostPct}% stat growth</strong>). How do you respond?`,
    choices:[
      {icon:'📲',label:'Post it on your story', hint:'Reputation +3', actionType:'apply-season', payload:{deltas:{reputation:3}, msg:`You shared the loan move publicly and built positive buzz around your next chapter at ${toClubName}.`}},
      {icon:'💪',label:'Train harder to prove yourself', hint:'Physical +1, Passing +1, Fitness -6', actionType:'apply-season', payload:{deltas:{physical:1,passing:1,fitness:-6}, msg:`You doubled down in training at ${toClubName} to prove you belong.`}},
    ]
  };
}

function buildActionEvent(slot) {
  if (slot === 1) return buildTrainingEvent();
  if (slot === 4) return buildDomesticCupEvent();
  if (slot === 6) return buildContinentalEvent();
  if (slot === 7) return buildNationalTeamWindowEvent();
  if (slot === 8) return buildClutchMomentEvent();
  if (slot === 9) return buildTransferWeekFallbackEvent();

  return buildLeagueMatchdayEvent();
}

function buildTransferEvent(offers) {
  return { type:'transfer', offers };
}

function buildTrainingEvent() {
  return {
    colorClass:'ec-training', icon:'🏋️', tag:'TRAINING CAMP',
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Pre-season has started and the manager is counting on you for a small cup tournament. <strong>${state.G.name}</strong>, are you in?`,
    choices:[
      {icon:'✅',label:'Yes, I am in', hint:'Reputation +5', actionType:'preseason-yes'},
      {icon:'❌',label:'No, I am out', hint:'Reputation -50', actionType:'preseason-no'},
      {icon:'🤒',label:'Lie: say you are sick', hint:'50/50 catch risk', actionType:'preseason-lie'},
    ]
  };
}

function buildHardTrainingDeltas() {
  const statKeys = ['pace', 'shooting', 'passing', 'dribbling', 'physical'];
  const picks = [...statKeys].sort(() => Math.random() - 0.5).slice(0, 2);
  const deltas = { fitness: -9 };
  picks.forEach(k => deltas[k] = 1);
  return deltas;
}

function buildBalancedTrainingDeltas() {
  const mapByPos = {
    striker: { shooting: 1, pace: 1 },
    midfielder: { passing: 1, dribbling: 1 },
    defender: { physical: 1, passing: 1 },
    goalkeeper: { dribbling: 1, physical: 1 },
  };
  return mapByPos[state.G.pos] || { passing: 1 };
}

function buildRecoveryDeltas() {
  return { fitness: 8 };
}

function buildLeagueMatchdayEvent() {
  const pool = [buildRivalryEvent(), buildMediaEvent()];
  if (state.G.reputation > 35) pool.push(buildFameEvent());
  if (state.G.age >= 17 && Math.random() < 0.22) pool.push(buildDopingEvent());
  if (!isLoanActive() && (state.G.contract?.years || 0) > 0 && state.G.season >= 2 && Math.random() < 0.14) {
    pool.push(buildLoanHelpEvent());
  }

  let injuryChance = 0.18;
  if (state.G.age > 29) injuryChance = 0.28;
  if (state.G.age > 34) injuryChance = 0.38;
  if (state.G.age > 37) injuryChance = 0.50;
  if (Math.random() < injuryChance) pool.push(buildInjuryEvent());

  if (state.G.age < 23 && Math.random() < 0.14) pool.push(buildMentorEvent());
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildDomesticCupEvent() {
  const cupName = getDomesticCupName(state.G.club?.league);
  return {
    colorClass:'ec-season', icon:'🏆', tag:`${cupName.toUpperCase()} NIGHT`,
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Knockout pressure in the <strong>${cupName}</strong>. A decisive moment arrives late in the game.`,
    choices:[
      {icon:'🧠',label:'Play it safe', hint:'Passing +1, Rep +1', actionType:'apply-season', payload:{deltas:{passing:1,reputation:1}, msg:`Composed display in the ${cupName}.`}},
      {icon:'⚡',label:'Attack relentlessly', hint:'Shooting +1, Fitness -7', actionType:'apply-season', payload:{deltas:{shooting:1,fitness:-7}, msg:'You went all out in cup football.'}},
      {icon:'🎯',label:'Take the decisive penalty', hint:'Clutch moment', actionType:'penalty-shot', payload:{context:'club', teamName:state.G.club.name}},
    ]
  };
}

function buildContinentalEvent() {
  if (state.G.clubTier < 5) {
    return {
      colorClass:'ec-season', icon:'📅', tag:'MID-SEASON BLOCK',
      text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. No continental fixtures this year. Focus on league consistency.`,
      choices:[
        {icon:'📈',label:'Extra tactical session', hint:'Passing +1', actionType:'training', payload:{passing:1}},
        {icon:'💪',label:'Gym and stamina work', hint:'Physical +1, Fitness -5', actionType:'apply-season', payload:{deltas:{physical:1,fitness:-5}, msg:'Extra workload to build consistency.'}},
      ]
    };
  }

  return {
    colorClass:'ec-gold', icon:'🌍', tag:'EUROPEAN NIGHT',
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Big lights, big pressure in continental football.`,
    choices:[
      {icon:'🛡️',label:'Disciplined performance', hint:'Rep +2, Physical +1', actionType:'apply-season', payload:{deltas:{reputation:2,physical:1}, msg:'Mature display on the European stage.'}},
      {icon:'🚀',label:'Go for moments', hint:'Shooting +1, Dribbling +1, Fitness -8', actionType:'apply-season', payload:{deltas:{shooting:1,dribbling:1,fitness:-8}, msg:'High-risk football under continental pressure.'}},
    ]
  };
}

function buildNationalTeamWindowEvent() {
  const profile = getNationalTeamProfile(state.G.nat);
  const ovr = calcOvr();
  const effective = ovr + state.G.reputation / 30 + state.G.clubTier * 0.5;
  const callUpChance = Math.max(0.03, Math.min(0.78, 0.08 + (effective - profile.minOvr) * 0.07));
  const calledUp = effective >= profile.minOvr - 2 && Math.random() < callUpChance;

  if (!calledUp) {
    return {
      colorClass:'ec-media', icon:'📩', tag:'NATIONAL TEAM WINDOW',
      text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. <strong>${profile.name}</strong> announced the squad. You were not selected (target level around OVR ${profile.minOvr}+).`,
      choices:[
        {icon:'🏋️',label:'Use the break to train', hint:'Small stat boost', actionType:'training', payload:buildBalancedTrainingDeltas()},
        {icon:'🧘',label:'Recover and reset', hint:'Fitness +10', actionType:'apply-season', payload:{deltas:{fitness:10}, msg:'You recharged during the international break.'}},
      ]
    };
  }

  return {
    colorClass:'ec-gold', icon:'🇺🇳', tag:`${profile.name.toUpperCase()} CALL-UP`,
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. You got the call for <strong>${profile.name}</strong>. One decisive international match could change your status forever.`,
    choices:[
      {icon:'🛡️',label:'Solid international display', hint:'Rep +2, Cap +1', actionType:'national-performance', payload:{deltas:{reputation:2,passing:1}, result:'steady'}},
      {icon:'⚡',label:'Go for glory', hint:'Rep +4, Fitness -9, Cap +1', actionType:'national-performance', payload:{deltas:{reputation:4,fitness:-9,shooting:1}, result:'bold'}},
      {icon:'🎯',label:'Take the nation\'s penalty', hint:'Win or heartbreak', actionType:'penalty-shot', payload:{context:'national', teamName:profile.name}},
    ]
  };
}

function buildClutchMomentEvent() {
  const contexts = [
    { title:'TITLE DECIDER', text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Last minute. A penalty to decide the league race.` },
    { title:'DERBY DRAMA', text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Hostile atmosphere. Penalty in stoppage time.` },
    { title:'CUP SEMI SHOOTOUT', text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. One kick sends your side to the final.` },
  ];
  const ctx = contexts[Math.floor(Math.random() * contexts.length)];

  return {
    colorClass:'ec-red', icon:'💥', tag:ctx.title,
    text:ctx.text,
    choices:[
      {icon:'↙️', label:'Shoot Left', hint:'Precision attempt', actionType:'penalty-shot', payload:{context:'club', teamName:state.G.club.name, target:'left'}},
      {icon:'⏺️', label:'Shoot Center', hint:'Nerve test', actionType:'penalty-shot', payload:{context:'club', teamName:state.G.club.name, target:'center'}},
      {icon:'↘️', label:'Shoot Right', hint:'Power attempt', actionType:'penalty-shot', payload:{context:'club', teamName:state.G.club.name, target:'right'}},
    ]
  };
}

function buildTransferWeekFallbackEvent() {
  if (isLoanActive()) {
    const parentClubName = state.G.loan?.fromClub?.name || 'your parent club';
    const seasonsLeft = Math.max(1, Number(state.G.loan?.seasonsLeft) || 1);
    return {
      colorClass:'ec-fame', icon:'📄', tag:'LOAN STATUS',
      text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. You are on loan from <strong>${parentClubName}</strong>. Transfer talks are locked while the loan is active (${seasonsLeft} season${seasonsLeft > 1 ? 's' : ''} remaining).`,
      choices:[
          {icon:'📈',label:'Train with urgency', hint:'Passing +1', actionType:'training', payload:{passing:1}},
          {icon:'💪',label:'Extra gym session', hint:'Physical +1, Fitness -5', actionType:'apply-season', payload:{deltas:{physical:1,fitness:-5}, msg:'You embraced the loan grind and trained harder.'}},
          {icon:'🧠',label:'Study match film', hint:'Dribbling +1', actionType:'training', payload:{dribbling:1}},
      ]
    };
  }

  return {
    colorClass:'ec-fame', icon:'🧾', tag:'CONTRACT WEEK',
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Quiet market week. Your focus remains on performance and long-term value.`,
    choices:[
        {icon:'📈',label:'Agent networking', hint:'Reputation +1', actionType:'apply-season', payload:{deltas:{reputation:1}, msg:'Your camp strengthened your market reputation.'}},
        {icon:'🎯',label:'Ignore noise, train', hint:'Shooting +1', actionType:'training', payload:{shooting:1}},
        {icon:'📡',label:'Open marketplace', hint:'Who wants you?', actionType:'open-marketplace'},
    ]
  };
}

function pickLoanHelpClub() {
  const currentTierIndex = Math.max(0, (state.G.clubTier || 1) - 1);
  const targetTierIndexes = [...new Set([
    Math.max(0, currentTierIndex - 1),
    Math.max(0, currentTierIndex - 2),
    Math.max(0, currentTierIndex - 3),
  ])].filter(index => index >= 0 && index < TIERS.length);

  const candidates = targetTierIndexes
    .flatMap(index => (TIERS[index] || []).map(club => ({ club, tierIndex: index })))
    .filter(entry => entry.club?.name && entry.club.name !== state.G.club?.name);

  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildLoanHelpEvent() {
  const target = pickLoanHelpClub();
  if (!target) {
    return {
      colorClass:'ec-media', icon:'📬', tag:'AGENT UPDATE',
      text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Loan opportunities were discussed, but no suitable club was available right now.`,
      choices:[
        {icon:'📈',label:'Use this week to train', hint:'Passing +1', actionType:'training', payload:{passing:1}},
        {icon:'⚽',label:'Stay focused at current club', hint:'No risk', actionType:'go-season'},
      ]
    };
  }

  const ovr = calcOvr();
  const olderMoneyLoan = state.G.age >= 30 && ovr >= 78;
  const loanYears = rng(1, 2);
  const completionBonus = olderMoneyLoan
    ? Math.round((state.G.contract?.salary || 0) * 52 * loanYears * 0.4)
    : 0;

  const rewardText = olderMoneyLoan
    ? `Complete it for a bonus around <strong>${formatM(completionBonus)}</strong>.`
    : 'Complete it to unlock a <strong>+25% loan development boost</strong>.';

  return {
    colorClass:'ec-season', icon:'🤝', tag:'LOAN HELP REQUEST',
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. ${target.club.name} asked for your help on a ${loanYears}-season loan spell. ${rewardText}`,
    choices:[
      {
        icon:'✅',
        label:`Accept loan to ${target.club.name}`,
        hint: olderMoneyLoan ? `Money focus · ${loanYears}y` : `Stat boost · ${loanYears}y`,
        actionType:'accept-help-loan',
        payload:{
          clubName: target.club.name,
          tierIndex: target.tierIndex,
          loanYears,
          focus: olderMoneyLoan ? 'money' : 'development',
          completionBonus,
        }
      },
      {icon:'❌',label:'Decline and stay', hint:'No loan move', actionType:'go-season'},
    ]
  };
}

function buildLoanSignOfferEvent() {
  const offer = state.loanSignOffer;
  if (!offer?.club) {
    return {
      colorClass:'ec-media', icon:'📬', tag:'AGENT UPDATE',
      text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. No active offer to review.`,
      choices:[{icon:'➡️',label:'Continue', hint:'Next action', actionType:'go-season'}],
    };
  }

  return {
    colorClass:'ec-gold', icon:'✍️', tag:'POST-LOAN OFFER',
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. ${offer.club.name} wants to sign you permanently after your loan.<br>
      Contract: <strong>${offer.contractYrs} years</strong><br>
      Wage: <strong>${formatWeeklyWage(offer.salary)}</strong> (<strong>${formatM((offer.salary * 52) / 1000000)}</strong>/year)<br>
      Why move: ${offer.reason || 'More role responsibility and long-term growth upside.'}`,
    choices:[
      {icon:'📋',label:'Check contract details', hint:'See full terms + move logic', actionType:'loan-sign-details'},
      {icon:'🖊️',label:`Sign for ${offer.club.name}`, hint:'Permanent move', actionType:'accept-loan-sign-offer'},
      {icon:'🏠',label:'Stay with parent club', hint:'Decline offer', actionType:'decline-loan-sign-offer'},
    ],
  };
}

function buildLoanTransferLockedEvent() {
  return buildTransferWeekFallbackEvent();
}

function buildInjuryEvent() {
  const injs=[
    {name:'Hamstring Pull',      deltas:{pace:-3,fitness:-25},         text:'A sharp pull during a sprint. Hamstring injury. Weeks off training.'},
    {name:'Ankle Sprain',        deltas:{dribbling:-2,physical:-2,fitness:-20}, text:'You twist your ankle badly in a tackle. A painful few months ahead.'},
    {name:'Knee Ligament Strain',deltas:{pace:-2,physical:-4,fitness:-30},text:'A scan confirms ligament damage after a collision. Long recovery ahead.'},
    {name:'Back Spasm',          deltas:{physical:-3,fitness:-15},      text:'Your back seizes during training. The body is talking.'},
    {name:'Calf Tear',           deltas:{pace:-2,fitness:-20},          text:'Coming off a corner you feel a tear. Calf muscle. Race against the clock.'},
  ];
  const inj=injs[Math.floor(Math.random()*injs.length)];
  return {
    colorClass:'ec-injury', icon:'🚑', tag:`INJURY — ${inj.name.toUpperCase()}`,
    text:inj.text+' How do you handle it?', isInjury:true,
    choices:[
      {icon:'🏥',label:'Follow the physio protocol',      hint:'Safe — full recovery',    actionType:'apply-season', payload:{deltas:inj.deltas, msg:`Managed your ${inj.name} carefully.`}},
      {icon:'💉',label:'Rush back with pain injections',  hint:'Fitness risk — maybe ban',actionType:'rush-back', payload:{baseDelta:inj.deltas}},
    ]
  };
}

function buildDopingEvent() {
  return {
    colorClass:'ec-doping', icon:'💊', tag:'TEMPTATION',
    text:`A figure approaches after training. <em>"Performance enhancers. Untraceable. Every top player does it."</em> The offer is on the table.`,
    choices:[
      {icon:'🚫',label:'Refuse — walk away',   hint:'Rep +5',            actionType:'refuse-doping'},
      {icon:'⚗️',label:'Ask for substance options', hint:'Choose risk/reward tier',actionType:'open-booster-menu', payload:{source:'event'}},
    ]
  };
}

function buildFameEvent() {
  const opts=[
    {
      text:`You\'re on every magazine cover. A global brand offers a huge sponsorship deal. Football or fame?`,
      choices:[
        {icon:'📸',label:'Take the deal — live the life', hint:'Rep +15, Shooting −2', actionType:'apply-season', payload:{deltas:{reputation:15,shooting:-2}, msg:'The world loves you. Your shot accuracy suffers.'}},
        {icon:'⚽',label:'Turn it down — football first', hint:'All stats +1',          actionType:'apply-season', payload:{deltas:{pace:1,shooting:1,passing:1,dribbling:1,physical:1}, msg:'You stay grounded. Coaches respect you.'}},
      ]
    },
    {
      text:`Tabloids have photos from a late-night party. Your agent is panicking. How do you handle it?`,
      choices:[
        {icon:'🎉',label:'Shrug it off — you earned it',    hint:'Rep −10, Fitness −10', actionType:'apply-season', payload:{deltas:{reputation:-10,fitness:-10}, msg:'The headlines linger.'}},
        {icon:'🤐',label:'Apologise publicly and lie low',  hint:'Rep −3 only',           actionType:'apply-season', payload:{deltas:{reputation:-3}, msg:'Handled professionally. Fans forgive quickly.'}},
      ]
    },
  ];
  const o=opts[Math.floor(Math.random()*opts.length)];
  return {colorClass:'ec-fame', icon:'🌟', tag:'FAME & DISTRACTION', text:o.text, choices:o.choices};
}

function buildRivalryEvent() {
  const lowestStat = getLowestStatKey();
  const lowestStatLabel = getStatLabel(lowestStat);

  return {
    colorClass:'ec-rivalry', icon:'🗡️', tag:'DRESSING ROOM',
    text:`Teammate <strong>Lucas Ferreira</strong> is spreading stories to the coaching staff — he wants your spot. How do you react?`,
    choices:[
      {icon:'🤝',label:'Head down — let football talk',       hint:`${lowestStatLabel} +2`,   actionType:'apply-season', payload:{deltas:{[lowestStat]:2}, msg:'Your performances silence everyone.'}},
      {icon:'💬',label:'Confront him directly',               hint:'50/50',                   actionType:'confront-rival'},
      {icon:'🤫',label:'Go straight to the manager',          hint:'Rep −5 but issue resolved',actionType:'apply-season', payload:{deltas:{reputation:-5}, msg:'Sorted — but teammates see you as a snitch.'}},
    ]
  };
}

function getLowestStatKey() {
  const statKeys = ['pace', 'shooting', 'passing', 'dribbling', 'physical'];
  const stats = state.G?.stats || {};

  let lowestKey = statKeys[0];
  let lowestValue = Number.isFinite(stats[lowestKey]) ? stats[lowestKey] : 99;

  statKeys.slice(1).forEach((key) => {
    const value = Number.isFinite(stats[key]) ? stats[key] : 99;
    if (value < lowestValue) {
      lowestValue = value;
      lowestKey = key;
    }
  });

  return lowestKey;
}

function getStatLabel(statKey) {
  const meta = state.G?.pos === 'goalkeeper' ? GK_STAT_META : STAT_META;
  const rawLabel = meta?.[statKey]?.label || statKey;
  return rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
}

function buildMentorEvent() {
  return {
    colorClass:'ec-mentor', icon:'🎓', tag:'VETERAN MENTOR',
    text:`Club legend <strong>Roberto Castillo</strong> — 15 years at the top — offers to spend the week coaching you personally.`,
    choices:[
      {icon:'📖',label:'Train with him every day', hint:'2 random stats +4', actionType:'mentor-train'},
      {icon:'😎',label:'I\'m good on my own',       hint:'Pass',              actionType:'go-season'},
    ]
  };
}

function buildMediaEvent() {
  return {
    colorClass:'ec-media', icon:'📺', tag:'MEDIA PRESSURE',
    text:`After a string of quiet performances the press asks: <strong>"Is ${state.G.name} finished?"</strong>`,
    choices:[
      {icon:'🔇',label:'Go dark — block it out',   hint:'Dribbling +2',         actionType:'apply-season', payload:{deltas:{dribbling:2}, msg:'You zone in. Your dribbling becomes unplayable.'}},
      {icon:'🎙️',label:'Call a press conference',  hint:'Rep +8 or Rep −5',     actionType:'press-conf'},
    ]
  };
}
