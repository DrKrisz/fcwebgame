import { state } from './state.js';
import { calcMarketValue, calcOvr } from './utils.js';
import { renderEvent, renderSeasonResult } from './ui.js';
import { buildTransferOffers, renderTransferChoices, showFreeAgencyTransfer, showReleaseClauseEvent } from './transfers.js';
import { buildSeasonEvent } from './season.js';
import { TIERS } from './data.js';

export function nextEvent() {
  if (state.G.bannedSeasons > 0) {
    state.G.bannedSeasons--;
    state.G.fitness = Math.min(100, state.G.fitness + 10);
    const se = buildSeasonEvent();
    renderSeasonResult(se, [], null, true);
    return;
  }

  if (state.G.contract.years <= 0) {
    showFreeAgencyTransfer();
    return;
  }

  const triggerRC = checkReleaseClauseTrigger();
  if (triggerRC) {
    showReleaseClauseEvent(triggerRC);
    return;
  }

  const pool = buildEventPool();
  const ev = pool[Math.floor(Math.random()*pool.length)];
  if (ev.type==='transfer') { renderTransferChoices(ev); return; }
  renderEvent(ev);
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

function buildEventPool() {
  const pool = [];
  pool.push(buildTrainingEvent());

  let injuryChance = 0.28;
  if (state.G.age > 29) injuryChance = 0.40;
  if (state.G.age > 34) injuryChance = 0.55;
  if (state.G.age > 37) injuryChance = 0.70;
  if (Math.random() < injuryChance) pool.push(buildInjuryEvent());

  if (state.G.age>=17 && Math.random()<0.22) pool.push(buildDopingEvent());
  if (state.G.reputation>35 && Math.random()<0.32) pool.push(buildFameEvent());
  if (state.G.age>=18 && Math.random()<0.28) pool.push(buildRivalryEvent());
  if (state.G.age<23 && Math.random()<0.38) pool.push(buildMentorEvent());
  if (state.G.reputation>50 && Math.random()<0.28) pool.push(buildMediaEvent());
  if (state.G.age>=18 && Math.random()<0.4) {
    const offers = buildTransferOffers();
    if (offers.length) pool.push(buildTransferEvent(offers));
  }
  pool.push(buildSeasonEventWrapper());
  return pool;
}

function buildTransferEvent(offers) {
  return { type:'transfer', offers };
}

function buildTrainingEvent() {
  return {
    colorClass:'ec-training', icon:'🏋️', tag:'TRAINING CAMP',
    text:`Pre-season. Coaches are watching. <strong>${state.G.name}</strong>, where do you focus this season?`,
    choices:[
      {icon:'⚡',label:'Sprint & Acceleration Work',  hint:'Pace +3',                  actionType:'training', payload:{pace:3}},
      {icon:'🎯',label:'Finishing & Shooting Drills', hint:'Shooting +3',               actionType:'training', payload:{shooting:3}},
      {icon:'🔄',label:'Tactical & Passing Sessions', hint:'Passing +2, Dribbling +1',  actionType:'training', payload:{passing:2,dribbling:1}},
      {icon:'💪',label:'Strength & Conditioning',     hint:'Physical +3',               actionType:'training', payload:{physical:3}},
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

function buildSeasonEventWrapper() {
  return {
    colorClass:'ec-season', icon:'🏁', tag:'SEASON KICKOFF',
    text:`The season has begun at <strong>${state.G.club.name}</strong>. You\'re in the squad and ready to give everything. The pitch awaits.`,
    choices:[
      {icon:'⚽',label:'Play the full season',hint:'Let fate decide',actionType:'go-season'},
    ]
  };
}
