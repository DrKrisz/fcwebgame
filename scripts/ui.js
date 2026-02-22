import { state } from './state.js';
import { STAT_META, GK_STAT_META, PHASES, getTrophyName } from './data.js';
import { calcOvr, calcMarketValue, formatM, ordinal } from './utils.js';

function formatCurrency(n) {
  if (n >= 1000000000) return `€${(n / 1000000000).toFixed(2)}B`;
  if (n >= 1000000) return `€${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `€${Math.round(n / 1000)}K`;
  return `€${Math.round(n)}`;
}

function formatWeeklySalary(salary) {
  return `${formatCurrency(salary)}/wk`;
}

function getRankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === null || rank === undefined) return 'rank-5';
  if (rank && rank <= 5) return 'rank-5';
  if (rank && rank <= 15) return 'rank-15';
  if (rank) return 'rank-else';
  return 'rank-5';
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>{s.style.display='none';s.classList.remove('active');});
  const t=document.getElementById('screen-'+id);
  t.style.display='block'; t.classList.add('active');
}

export function renderUI() {
  const ovr = calcOvr();
  const mv  = calcMarketValue();
  state.G.peakOvr = Math.max(state.G.peakOvr, ovr);
  if (ovr >= calcOvr() && state.G.club) state.G.peakClub = state.G.club.name;

  document.getElementById('d-name').textContent    = `${state.G.nat} ${state.G.name}`;
  document.getElementById('d-club').textContent    = state.G.club.name;
  document.getElementById('d-league').textContent  = `${state.G.club.country} ${state.G.club.league}`;
  document.getElementById('d-age').textContent     = state.G.age;
  document.getElementById('d-ovr').textContent     = ovr;
  const actionNow = Math.min(state.seasonAction || 1, state.seasonActionsTotal || 10);
  const actionTotal = state.seasonActionsTotal || 10;
  document.getElementById('d-season').textContent  = `Season ${state.G.season} · Action ${actionNow}/${actionTotal}`;
  document.getElementById('d-value').textContent   = formatM(mv);

  const yrs = state.G.contract.years;
  document.getElementById('d-years').textContent  = `${yrs} yr${yrs!==1?'s':''}`;
  document.getElementById('d-years').className    = 'cbar-val' + (yrs<=1?' contract-alert':'');
  document.getElementById('d-payment').textContent = formatWeeklySalary(state.G.contract.salary || 0);
  document.getElementById('d-earned').textContent  = formatCurrency(state.G.totalEarnings || 0);
  document.getElementById('d-ga').textContent      = `${state.G.totalGoals || 0}/${state.G.totalAssists || 0}`;

  const fp = state.G.fitness;
  const fc = fp>70?'#4ade80':fp>40?'#facc15':'#f87171';
  const fitFill = document.getElementById('fit-fill');
  fitFill.style.setProperty('--fit-width', `${fp}%`);
  fitFill.style.setProperty('--fit-color', fc);
  document.getElementById('fit-pct').textContent  = `${fp}%`;
  document.getElementById('fit-pct').style.color  = fc;

  renderStats();
  renderTrophies();
  renderPhase();
  renderBallonLive();
}

export function renderStats() {
  const keys = ['pace','shooting','passing','dribbling','physical'];
  const isGK = state.G.pos === 'goalkeeper';
  const statMeta = isGK ? GK_STAT_META : STAT_META;
  const panel = document.getElementById('stats-panel');
  panel.innerHTML = '';
  keys.forEach(k => {
    const v = Math.round(state.G.stats[k]);
    const meta = statMeta[k];
    const sp = (v/99).toFixed(3);
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.setProperty('--sc', meta.color);
    card.style.setProperty('--sp', sp);

    const name = document.createElement('div');
    name.className = 'stat-name';
    const displayLabel = meta.label || k;
    name.textContent = `${meta.icon} ${displayLabel}`;

    const val = document.createElement('div');
    val.className = 'stat-val';
    val.textContent = v;

    const trend = document.createElement('div');
    trend.className = 'stat-trend';
    trend.id = `tr-${k}`;

    card.appendChild(name);
    card.appendChild(val);
    card.appendChild(trend);
    panel.appendChild(card);
  });
}

export function setTrend(key, delta) {
  const el = document.getElementById(`tr-${key}`);
  if (!el) return;
  if (delta > 0)      el.innerHTML = `<span class="trend-up">+${delta}</span>`;
  else if (delta < 0) el.innerHTML = `<span class="trend-dn">${delta}</span>`;
  else el.textContent = '';
}

export function renderTrophies() {
  const counts = {};
  state.G.trophies.forEach(t => counts[t] = (counts[t]||0)+1);
  const inner = document.getElementById('trophies-inner');
  inner.querySelectorAll('.trophy-chip').forEach(e=>e.remove());
  if (state.G.trophies.length === 0) {
    document.getElementById('no-trophy-msg').style.display='';
    return;
  }
  document.getElementById('no-trophy-msg').style.display='none';
  Object.entries(counts).forEach(([t,n]) => {
    const chip = document.createElement('span');
    chip.className='trophy-chip';
    chip.textContent=`${getTrophyName(t)}${n>1?` ×${n}`:''}`;
    inner.appendChild(chip);
  });
}

export function renderBallonLive() {
  const last = state.G.ballonHistory[state.G.ballonHistory.length-1];
  const bd = document.getElementById('ballon-display');
  if (!last) {
    bd.innerHTML=`<div class="ballon-display rank-none"><span class="ballon-suffix ballon-empty">Season not started</span></div>`;
    return;
  }
  const rankClass = getRankClass(last.rank);
  const rankStr = last.rank ? ordinal(last.rank) : 'Not ranked';
  bd.innerHTML=`<div class="ballon-display ${rankClass}">
    <span class="ballon-rank">${last.rank||'—'}</span>
    <div>
      <div class="ballon-suffix">${last.rank?rankStr+' place':'Not in contention'}</div>
      <div class="ballon-prev">Age ${last.age} · S${last.season}</div>
    </div>
  </div>`;
}

export function renderPhase() {
  const ph=[...PHASES].reverse().find(p=>state.G.age>=p.minAge)||PHASES[0];
  document.getElementById('phase-icon').textContent=ph.icon;
  document.getElementById('phase-text').textContent=ph.text;
}

export function addLog(msg, imp=false) {
  if (!Array.isArray(state.G.log)) state.G.log = [];
  state.G.log.unshift({
    age: state.G.age,
    season: state.G.season,
    msg,
    imp: !!imp
  });
  renderLogStrip();
}

export function renderLogStrip() {
  const strip = document.getElementById('log-strip');
  if (!strip) return;
  const logs = Array.isArray(state.G.log) ? state.G.log : [];
  strip.innerHTML = logs.map(entry => {
    const className = entry.imp ? 'log-e imp' : 'log-e';
    return `<div class="${className}">[Age ${entry.age}] ${entry.msg}</div>`;
  }).join('');
}

export function downloadCareerLogTxt() {
  const logs = Array.isArray(state.G.log) ? [...state.G.log].reverse() : [];
  const lines = [
    `${state.G.name} - Career Log`,
    `Position: ${state.G.pos}`,
    `Academy: ${state.G.academy?.name || 'Unknown'}`,
    ''
  ];

  if (!logs.length) {
    lines.push('No log entries recorded.');
  } else {
    logs.forEach(entry => {
      lines.push(`[Season ${entry.season} | Age ${entry.age}] ${entry.msg}`);
    });
  }

  const textContent = lines.join('\n');
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (state.G.name || 'player').replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '_') || 'player';
  a.href = url;
  a.download = `${safeName}_career_log.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function renderEvent(ev) {
  if (ev.isInjury) state.G.injuryCount++;

  const area=document.getElementById('event-area');
  area.innerHTML=`<div class="event-box ${ev.colorClass}">
    <div class="event-tag"><div class="event-dot"></div>${ev.icon} ${ev.tag}</div>
    <div class="event-text">${ev.text}</div>
    <div class="choices">${ev.choices.map((c,i)=>`
      <button class="btn-c" data-action="choice" data-index="${i}">
        <span class="c-icon">${c.icon}</span>
        <span>${c.label}</span>
        <span class="c-hint">${c.hint}</span>
      </button>`).join('')}
    </div>
  </div>`;

  state.currentChoices = ev.choices;
}

export function renderSeasonResult(se, chips=[], bd=null, isBan=false) {
  const area = document.getElementById('event-area');
  const chipsHTML = chips.map(c=>`<span class="chip ${c.type}">${c.label}</span>`).join('');

  let ballonHTML = '';
  if (bd) {
    if (bd.rank) {
      const rankClass = getRankClass(bd.rank);
      ballonHTML = `<div class="ballon-reveal ${rankClass}">
        <div class="br-icon">${bd.rank===1?'🏆':'🌟'}</div>
        <div>
          <div class="ballon-meta">Ballon d'Or Ranking</div>
          <div class="ballon-row">
            <span class="br-rank">${ordinal(bd.rank)}</span>
            <span class="br-label">in the world this season</span>
          </div>
        </div>
      </div>`;
    } else {
      ballonHTML = `<div class="ballon-reveal"><div class="br-icon">⚽</div><div><div class="br-label">Ballon d'Or</div><div class="br-none">Not in contention this season — keep improving.</div></div></div>`;
    }
  }

  area.innerHTML = `<div class="season-results">
    <div class="sr-title">${isBan ? se.title : '🏁 END OF SEASON ' + state.G.season}</div>
    <div class="sr-text">${se.text}</div>
    ${chipsHTML?`<div class="sr-chips">${chipsHTML}</div>`:''}
    ${ballonHTML}
    <button class="btn-continue" data-action="advance-season">▶ NEXT SEASON — Age ${state.G.age+1}</button>
  </div>`;

  state.pendingSeason = { se, bd };
}

export function renderRetirementChoice(retireMsg, keepPlayingMsg, canKeepPlaying) {
  const area = document.getElementById('event-area');
  area.innerHTML = `<div class="event-box ec-gold">
    <div class="event-tag"><div class="event-dot"></div>🌅 THE TWILIGHT YEARS</div>
    <div class="event-text">${retireMsg}</div>
    <div class="event-text event-text-muted">${keepPlayingMsg}</div>
    <div class="action-row action-row-space">
      <button class="btn-primary btn-flex-sm" data-action="retire">🌅 Retire Now</button>
      ${canKeepPlaying ? `<button class="btn-accept btn-flex-sm btn-keep-playing" data-action="continue-career">⚽ Keep Playing</button>` : `<button class="btn-decline btn-flex-sm">⚽ Keep Playing (No clubs interested)</button>`}
    </div>
  </div>`;
}
