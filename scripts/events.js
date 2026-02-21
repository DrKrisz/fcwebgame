import { state } from './state.js';
import { calcMarketValue, calcOvr } from './utils.js';
import { renderEvent, renderSeasonResult } from './ui.js';
import { buildRenewalOffer, buildTransferOffers, renderTransferChoices, showContractTalk, showFreeAgencyTransfer, showReleaseClauseEvent } from './transfers.js';
import { buildSeasonEvent } from './season.js';
import { TIERS, getDomesticCupName, getNationalTeamProfile } from './data.js';

const ACTION_LABELS = {
  1: 'Preseason Training',
  2: 'League Matchday',
  3: 'League Matchday',
  4: 'Domestic Cup',
  5: 'League Matchday',
  6: 'Continental Night',
  7: 'National Team Window',
  8: 'Clutch Moment',
  9: 'Transfer & Contract Week',
  10:'Season Run-In',
};

export function nextEvent() {
  if (state.G.bannedSeasons > 0) {
    state.G.bannedSeasons--;
    state.G.fitness = Math.min(100, state.G.fitness + 10);
    const se = buildSeasonEvent();
    renderSeasonResult(se, [], null, true);
    return;
  }

  const slot = state.seasonAction || 1;

  if (slot === 9) {
    if (state.G.contract.years === 1 && state.renewalCheckSeason !== state.G.season) {
      state.renewalCheckSeason = state.G.season;
      const renewalOffer = buildRenewalOffer(false);
      if (renewalOffer) {
        showContractTalk(renewalOffer, false);
        return;
      }
    }

    if (state.G.contract.years <= 0) {
      if (state.freeAgentRenewalCheckSeason !== state.G.season) {
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
  renderEvent(ev);
}

export function getActionLabel(slot) {
  return ACTION_LABELS[slot] || 'Career Action';
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
  const pool = higherTiers.flat().filter(c => c.prestige > state.G.club.prestige + 5);
  if (!pool.length) return null;

  const total = pool.reduce((s,c)=>s+c.prestige,0);
  let r = Math.random()*total;
  for (const c of pool) { r-=c.prestige; if(r<=0) return c; }
  return pool[pool.length-1];
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
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal} — ${ACTION_LABELS[state.seasonAction]}. Coaches are watching. <strong>${state.G.name}</strong>, how hard do you train?`,
    choices:[
      {icon:'🔥',label:'Train Hard', hint:'Two stats +1, Fitness -9', actionType:'apply-season', payload:{deltas:buildHardTrainingDeltas(), msg:'You pushed the limit in preseason.'}},
      {icon:'⚖️',label:'Balanced Work', hint:'One focused boost', actionType:'training', payload:buildBalancedTrainingDeltas()},
      {icon:'🛌',label:'Recovery Block', hint:'Fitness +8', actionType:'apply-season', payload:{deltas:buildRecoveryDeltas(), msg:'You prioritized freshness and tactical sharpness.'}},
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
  return {
    colorClass:'ec-fame', icon:'🧾', tag:'CONTRACT WEEK',
    text:`Action ${state.seasonAction}/${state.seasonActionsTotal}. Quiet market week. Your focus remains on performance and long-term value.`,
    choices:[
      {icon:'📈',label:'Agent networking', hint:'Reputation +1', actionType:'apply-season', payload:{deltas:{reputation:1}, msg:'Your camp strengthened your market reputation.'}},
      {icon:'🎯',label:'Ignore noise, train', hint:'Shooting +1', actionType:'training', payload:{shooting:1}},
    ]
  };
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
      {icon:'⚗️',label:'Accept the enhancers', hint:'High risk — 2yr ban',actionType:'accept-doping'},
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
  return {
    colorClass:'ec-rivalry', icon:'🗡️', tag:'DRESSING ROOM',
    text:`Teammate <strong>Lucas Ferreira</strong> is spreading stories to the coaching staff — he wants your spot. How do you react?`,
    choices:[
      {icon:'🤝',label:'Head down — let football talk',       hint:'Passing +2',              actionType:'apply-season', payload:{deltas:{passing:2}, msg:'Your performances silence everyone.'}},
      {icon:'💬',label:'Confront him directly',               hint:'50/50',                   actionType:'confront-rival'},
      {icon:'🤫',label:'Go straight to the manager',          hint:'Rep −5 but issue resolved',actionType:'apply-season', payload:{deltas:{reputation:-5}, msg:'Sorted — but teammates see you as a snitch.'}},
    ]
  };
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
