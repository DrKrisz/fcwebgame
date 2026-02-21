import { state } from './state.js';
import { TIERS } from './data.js';
import { calcMarketValue, calcOvr, calcSalary, formatM, getTierOfClub, prestige2Stars, rng } from './utils.js';

export function buildTransferOffers(forFreeAgency=false) {
  const ovr = calcOvr();
  let numOffers = rng(2,3);
  const offers = [];
  const mv = calcMarketValue();

  let eligibleTiers;
  if (forFreeAgency && state.G.age >= 40) {
    // At 40+, only lower-tier clubs interested
    if (ovr < 65) return [];
    numOffers = rng(0,1);
    eligibleTiers = TIERS.slice(0, Math.min(3, state.G.clubTier+1)).flat();
  } else if (forFreeAgency && state.G.age >= 38) {
    // At 38-39, mostly mid-tier clubs
    if (ovr < 68) return [];
    numOffers = rng(0,2);
    eligibleTiers = TIERS.slice(0, Math.min(4, state.G.clubTier+1)).flat();
  } else if (forFreeAgency && state.G.age >= 36) {
    // At 36-37, top clubs unlikely unless high OVR
    if (ovr < 73) {
      eligibleTiers = TIERS.slice(Math.max(0,state.G.clubTier-2), state.G.clubTier+1).flat();
    } else {
      eligibleTiers = TIERS.slice(Math.max(0,state.G.clubTier-1), state.G.clubTier+2).flat();
    }
    numOffers = Math.min(numOffers, rng(1,2));
  } else if (forFreeAgency && state.G.age >= 34) {
    // At 34-35, slight downgrade likely
    eligibleTiers = TIERS.slice(Math.max(0,state.G.clubTier-1), state.G.clubTier+2).flat();
  } else {
    eligibleTiers = forFreeAgency
      ? TIERS.slice(Math.max(0,state.G.clubTier-1), state.G.clubTier+2).flat()
      : TIERS.slice(state.G.clubTier, state.G.clubTier+2).flat();
  }

  eligibleTiers = eligibleTiers.filter(c => c.name !== state.G.club.name);
  if (!eligibleTiers.length) return [];

  const minP = Math.min(...eligibleTiers.map(c=>c.prestige));
  const pool = eligibleTiers.map(c=>({...c, weight: Math.max(1, c.prestige - minP + 5)}));

  for (let i=0; i<numOffers && pool.length; i++) {
    let r = Math.random()*pool.reduce((s,c)=>s+c.weight,0);
    let chosen = null;
    for (const c of pool) { r-=c.weight; if(r<=0){chosen=c;break;} }
    if (!chosen) chosen=pool[pool.length-1];
    pool.splice(pool.indexOf(chosen),1);
    
    // Age-based contract length
    let contractYrs;
    if (state.G.age >= 38) contractYrs = 1;
    else if (state.G.age >= 35) contractYrs = rng(1,2);
    else if (state.G.age >= 32) contractYrs = rng(2,3);
    else contractYrs = Math.min(5, Math.max(1, Math.round(4 - (state.G.age - 24) * 0.15)));
    
    const rcMult = 1.6 + (chosen.prestige/100)*1.2 + Math.random()*0.4;
    const rc = Math.max(mv*1.2, Math.round(mv*rcMult*10)/10);
    const salary = Math.round(calcSalary(ovr) * (1 + chosen.prestige/120) / 1000)*1000;
    offers.push({ club:chosen, contractYrs, releaseClause:rc, salary });
  }
  return offers;
}

export function renderClubOfferCardHTML(o, idx, isRC) {
  const tierDiff = getTierOfClub(o.club.name) - state.G.clubTier;
  const tierLabel = tierDiff > 0 ? `📈 Step up (Tier ${getTierOfClub(o.club.name)+1})` :
                    tierDiff === 0 ? `➡️ Same level` : `📉 Step down`;
  const salaryStr = o.salary >= 1000000 ? `€${(o.salary/1000000).toFixed(2)}M/wk` : `€${(o.salary/1000).toFixed(0)}K/wk`;

  return `<div class="club-offer-card">
    <div class="coc-league">${o.club.country} ${o.club.league}</div>
    <div class="coc-name">${o.club.name}</div>
    <div class="coc-prestige">${prestige2Stars(o.club.prestige)} &nbsp; ${tierLabel}</div>
    <div class="coc-details">
      <div class="coc-row"><span class="coc-key">Contract</span><span class="coc-val gold">${o.contractYrs} years</span></div>
      <div class="coc-row"><span class="coc-key">Salary</span><span class="coc-val green">${salaryStr}</span></div>
      <div class="coc-row"><span class="coc-key">Release Clause</span><span class="coc-val">${formatM(o.releaseClause)}</span></div>
      <div class="coc-row"><span class="coc-key">Club Prestige</span><span class="coc-val">${o.club.prestige}/100</span></div>
    </div>
    <button class="btn-accept" data-action="${isRC?'accept-rc':'accept-transfer'}" data-index="${idx}">${isRC?'✅ Accept Transfer':'🖊️ Sign Here'}</button>
  </div>`;
}

export function showReleaseClauseEvent(buyingClub) {
  const mv = calcMarketValue();
  const rc = state.G.contract.releaseClause;
  const contractYrs = Math.min(5, Math.max(2, rng(3,5)));
  const newRC = Math.round(mv * (2.2 + buyingClub.prestige/120) * 10)/10;
  const salary = Math.round(calcSalary(calcOvr()) * (1+buyingClub.prestige/110) / 1000)*1000;

  const area = document.getElementById('event-area');
  area.innerHTML = `<div class="event-box ec-gold">
    <div class="event-tag"><div class="event-dot"></div>✈️ RELEASE CLAUSE ACTIVATED</div>
    <div class="event-text">
      <strong>${buyingClub.country} ${buyingClub.name}</strong> have triggered your 
      <strong>${formatM(rc)}</strong> release clause. Your current club cannot stop this. 
      Do you want to make the move?
    </div>
    <div class="offer-card-wrap">
      ${renderClubOfferCardHTML({club:buyingClub, contractYrs, releaseClause:newRC, salary}, 0, true)}
    </div>
    <button class="btn-decline" data-action="decline-rc">Stay — Force them to keep you (break their deal)</button>
  </div>`;

  state.rcOffer = { club:buyingClub, contractYrs, releaseClause:newRC };
}

export function showFreeAgencyTransfer() {
  const offers = buildTransferOffers(true);
  const ovr = calcOvr();

  if (!offers.length) {
    const area = document.getElementById('event-area');
    const msg = state.G.age >= 38
      ? `At ${state.G.age} and OVR ${ovr}, no clubs are willing to take a chance on you. Your time has come.`
      : `Despite being available, no clubs have made an offer. Options are limited at your age and rating.`;

    area.innerHTML = `<div class="event-box ec-red">
      <div class="event-tag"><div class="event-dot"></div>🚪 NO OFFERS</div>
      <div class="event-text">${msg}</div>
      <button class="btn-primary btn-center-small" data-action="retire">🌅 RETIRE</button>
    </div>`;
    return;
  }

  const area = document.getElementById('event-area');
  area.innerHTML = `<div class="event-box ec-green">
    <div class="event-tag"><div class="event-dot"></div>🔓 FREE AGENT — CONTRACT EXPIRED</div>
    <div class="event-text">Your contract has expired. You\'re a <strong>free agent</strong>. ${
      state.G.age >= 36
      ? `At ${state.G.age}, ${offers.length} club${offers.length>1?'s':''} still interested. Final chance to play?`
      : `Multiple clubs are interested — choose your next chapter.`
    }</div>
    <div class="transfer-grid">${offers.map((o,i)=>renderClubOfferCardHTML(o,i,false)).join('')}</div>
    <button class="btn-decline" data-action="retire-early">Hang up the boots — retire now</button>
  </div>`;

  state.transferOffers = offers;
}

export function renderTransferChoices(ev) {
  const area = document.getElementById('event-area');
  const cardsHTML = ev.offers.map((o,i)=>renderClubOfferCardHTML(o,i,false)).join('');
  area.innerHTML = `<div class="event-box ec-season">
    <div class="event-tag"><div class="event-dot"></div>✈️ TRANSFER WINDOW</div>
    <div class="event-text">Clubs are circling. Your agent has brought you <strong>${ev.offers.length} concrete offers</strong>. Where do you go next — or do you stay loyal?</div>
    <div class="transfer-grid">${cardsHTML}</div>
    <button class="btn-decline" data-action="stay-club">🏠 Stay at ${state.G.club.name}</button>
  </div>`;
  state.transferOffers = ev.offers;
}
