import { state } from './state.js';
import { STAT_META, GK_STAT_META, PHASES, getTrophyName, extractPreseasonTrophyInfo } from './data.js';
import { calcOvr, calcMarketValue, formatM, ordinal } from './utils.js';

const statFeedbackClearTimers = {};

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
  const pendingClub = state.pendingTransfer?.club?.name;
  const isFreeAgent = (state.G.contract?.years || 0) <= 0;
  const loan = state.G.loan;
  const loanActive = !!loan?.active && Number(loan.seasonsLeft) > 0 && !!loan.toClub;
  document.getElementById('d-club').textContent    = pendingClub
    ? `${state.G.club.name} → ${pendingClub} (next season)`
    : loanActive
    ? `${loan.toClub.name} (Loan from ${loan.fromClub?.name || 'Parent club'})`
    : isFreeAgent
    ? `Free Agent (ex ${state.G.club.name})`
    : state.G.club.name;
  document.getElementById('d-league').textContent  = isFreeAgent
    ? 'No active club contract'
    : loanActive
    ? `${loan.toClub.country} ${loan.toClub.league}`
    : `${state.G.club.country} ${state.G.club.league}`;
  document.getElementById('d-age').textContent     = state.G.age;
  document.getElementById('d-ovr').textContent     = ovr;
  const actionNow = Math.min(state.seasonAction || 1, state.seasonActionsTotal || 10);
  const actionTotal = state.seasonActionsTotal || 10;
  document.getElementById('d-season').textContent  = `Season ${state.G.season} · Action ${actionNow}/${actionTotal}`;
  document.getElementById('d-value').textContent   = formatM(mv);

  const yrs = Math.max(0, state.G.contract.years || 0);
  const loanSuffix = loanActive
    ? ` · Loan ${loan.seasonsLeft} season${loan.seasonsLeft !== 1 ? 's' : ''}`
    : '';
  document.getElementById('d-years').textContent  = `${yrs} yr${yrs!==1?'s':''}${loanSuffix}`;
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

  renderActiveBoosts();
  renderStats();
  renderTrophies();
  renderPhase();
  renderBallonLive();
}

function renderActiveBoosts() {
  const panel = document.getElementById('boost-panel');
  if (!panel) return;

  const boosts = [];
  const loan = state.G?.loan;
  const loanActive = !!loan?.active && Number(loan.seasonsLeft) > 0 && !!loan.toClub;

  if (loanActive && Number(loan.growthMultiplier) > 1) {
    const pct = Math.round((Number(loan.growthMultiplier) - 1) * 100);
    const src = loan.source === 'market-request'
      ? 'Requested loan move'
      : loan.source === 'forced-youth'
      ? 'Club youth loan decision'
      : loan.source === 'help-loan'
      ? 'Loan help request'
      : 'Loan move';
    boosts.push(`📈 +${pct}% stat growth · ${loan.toClub.name} · ${src} · ${loan.seasonsLeft} season${loan.seasonsLeft !== 1 ? 's' : ''} left`);
  }

  const signingBoostSeasons = Math.max(0, Number(state.G?.postLoanSigningBoostSeasons) || 0);
  const signingBoostMultiplier = Math.max(1, Number(state.G?.postLoanSigningBoostMultiplier) || 1);
  if (signingBoostSeasons > 0 && signingBoostMultiplier > 1) {
    const pct = Math.round((signingBoostMultiplier - 1) * 100);
    boosts.push(`✨ +${pct}% stat growth · Permanent loan-signing development plan · ${signingBoostSeasons} season${signingBoostSeasons !== 1 ? 's' : ''} left`);
  }

  panel.innerHTML = `<div class="boost-title">Active Boosts</div>
    ${boosts.length
      ? `<div class="boost-list">${boosts.map(text => `<span class="boost-chip">${text}</span>`).join('')}</div>`
      : '<div class="boost-empty">No active boosts right now.</div>'
    }`;
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

    const valRow = document.createElement('div');
    valRow.className = 'stat-val-row';

    const val = document.createElement('div');
    val.className = 'stat-val';
    val.textContent = v;

    const feedback = document.createElement('span');
    feedback.className = 'stat-val-feedback';
    feedback.id = `sf-${k}`;

    const delta = Number(state.statFeedback?.[k] || 0);
    if (delta > 0) {
      feedback.classList.add('stat-val-feedback-up');
      feedback.textContent = `+${formatDelta(delta)}`;
    } else if (delta < 0) {
      feedback.classList.add('stat-val-feedback-dn');
      feedback.textContent = `${formatDelta(delta)}`;
    }

    const trend = document.createElement('div');
    trend.className = 'stat-trend';
    trend.id = `tr-${k}`;

    card.appendChild(name);
    valRow.appendChild(val);
    valRow.appendChild(feedback);
    card.appendChild(valRow);
    card.appendChild(trend);
    panel.appendChild(card);
  });
}

function formatDelta(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
}

function clearFeedbackTimer(feedbackId) {
  if (!feedbackId || !statFeedbackClearTimers[feedbackId]) return;
  clearTimeout(statFeedbackClearTimers[feedbackId]);
  delete statFeedbackClearTimers[feedbackId];
}

function clearFeedbackElement(feedback, animated = true) {
  if (!feedback) return;

  const feedbackId = feedback.id;
  clearFeedbackTimer(feedbackId);

  if (!animated || !feedback.textContent.trim()) {
    feedback.className = 'stat-val-feedback';
    feedback.textContent = '';
    return;
  }

  feedback.classList.add('stat-val-feedback-fadeout');
  statFeedbackClearTimers[feedbackId] = setTimeout(() => {
    feedback.className = 'stat-val-feedback';
    feedback.textContent = '';
    delete statFeedbackClearTimers[feedbackId];
  }, 180);
}

export function clearStatFeedback() {
  state.statFeedback = {};
  const feedbackEls = document.querySelectorAll('.stat-val-feedback');
  feedbackEls.forEach((feedback) => clearFeedbackElement(feedback, true));
}

export function setTrend(key, delta) {
  if (!state.statFeedback || typeof state.statFeedback !== 'object') {
    state.statFeedback = {};
  }

  const normalized = Math.round(Number(delta || 0) * 10) / 10;
  const feedback = document.getElementById(`sf-${key}`);

  if (normalized === 0 || Number.isNaN(normalized)) {
    delete state.statFeedback[key];
    clearFeedbackElement(feedback, true);
  } else {

    state.statFeedback[key] = normalized;
    if (feedback) {
      clearFeedbackTimer(feedback.id);
      feedback.className = 'stat-val-feedback';
      feedback.classList.remove('stat-val-feedback-fadeout');
      if (normalized > 0) {
        feedback.classList.add('stat-val-feedback-up');
        feedback.textContent = `+${formatDelta(normalized)}`;
      } else {
        feedback.classList.add('stat-val-feedback-dn');
        feedback.textContent = `${formatDelta(normalized)}`;
      }
    }
  }

  const el = document.getElementById(`tr-${key}`);
  if (el) el.textContent = '';
}

export function renderTrophies() {
  const inner = document.getElementById('trophies-inner');
  inner.querySelectorAll('.trophy-chip').forEach(e=>e.remove());
  inner.querySelectorAll('.trophy-group').forEach(e=>e.remove());
  
  if (state.G.trophies.length === 0) {
    document.getElementById('no-trophy-msg').style.display='';
    return;
  }
  document.getElementById('no-trophy-msg').style.display='none';

  const preseasonTrophies = state.G.trophies.filter(t => t.startsWith('preseason:'));
  const otherTrophies = state.G.trophies.filter(t => !t.startsWith('preseason:'));

  if (preseasonTrophies.length > 0) {
    if (preseasonTrophies.length <= 2) {
      preseasonTrophies.forEach(t => {
        const info = extractPreseasonTrophyInfo(t);
        const chip = document.createElement('span');
        chip.className='trophy-chip';
        chip.textContent=`${info.cupName} (S${info.season})`;
        inner.appendChild(chip);
      });
    } else {
      const groupDiv = document.createElement('div');
      groupDiv.className='trophy-group';
      
      const header = document.createElement('span');
      header.className='trophy-chip trophy-group-header';
      header.id='trophy-preseason-header';
      const expandArrow = document.createElement('span');
      expandArrow.className='trophy-group-arrow';
      expandArrow.textContent = '▶';
      expandArrow.style.display = 'inline-block';
      expandArrow.style.marginRight = '5px';
      expandArrow.style.transition = 'transform .2s';
      header.appendChild(expandArrow);
      header.append(`Pre-Season Cup ×${preseasonTrophies.length}`);
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const list = document.getElementById('trophy-preseason-list');
        const isHidden = list.style.display === 'none';
        list.style.display = isHidden ? 'flex' : 'none';
        expandArrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
      });
      
      groupDiv.appendChild(header);
      
      const listDiv = document.createElement('div');
      listDiv.id='trophy-preseason-list';
      listDiv.style.display='none';
      listDiv.style.flexDirection='column';
      listDiv.style.gap='4px';
      listDiv.style.marginTop='8px';
      listDiv.style.paddingLeft='10px';
      listDiv.style.borderLeft='2px solid rgba(212,160,23,.3)';
      
      preseasonTrophies.forEach(t => {
        const info = extractPreseasonTrophyInfo(t);
        const chip = document.createElement('span');
        chip.className='trophy-chip trophy-subitem';
        chip.textContent=`${info.cupName} (S${info.season})`;
        listDiv.appendChild(chip);
      });
      
      groupDiv.appendChild(listDiv);
      inner.appendChild(groupDiv);
    }
  }

  const counts = {};
  otherTrophies.forEach(t => counts[t] = (counts[t]||0)+1);
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

  if (last.ineligibleReason === 'doping-ban') {
    bd.innerHTML=`<div class="ballon-display rank-none"><span class="ballon-suffix ballon-empty">Ineligible (doping ban)</span></div>`;
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
    if (bd.reason === 'doping-ban') {
      ballonHTML = `<div class="ballon-reveal"><div class="br-icon">⛔</div><div><div class="br-label">Ballon d'Or</div><div class="br-none">Ineligible this season due to doping ban.</div></div></div>`;
    } else if (bd.rank) {
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

function buildPreseasonTableHTML(cup) {
  if (!cup) return '';

  const yourSemi = cup.results.find(r => r.round === 'Semi-final 1');
  const otherSemi = cup.otherSemi;
  const finalResult = cup.results.find(r => r.round === 'Final');

  const fmt = (match) => {
    if (!match) return '—';
    return `${match.home} ${match.homeGoals}-${match.awayGoals} ${match.away}`;
  };

  return `
    <div class="preseason-table-wrap">
      <div class="preseason-table-title">${cup.name} · 4 Teams</div>
      <table class="preseason-table">
        <thead>
          <tr><th>Round</th><th>Match</th></tr>
        </thead>
        <tbody>
          <tr><td>Semi-final 1</td><td>${yourSemi ? fmt(yourSemi) : `${cup.teams[0]} vs ${cup.teams[1]}`}</td></tr>
          <tr><td>Semi-final 2</td><td>${fmt(otherSemi)}</td></tr>
          <tr><td>Final</td><td>${finalResult ? fmt(finalResult) : 'TBD'}</td></tr>
          <tr><td>Champion</td><td>${cup.champion || 'TBD'}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

export function renderPreseasonCupHub() {
  const cup = state.preseasonCup;
  if (!cup) return;

  const area = document.getElementById('event-area');
  const nextRoundLabel = cup.stage === 'final' ? 'Start Final' : 'Start Semi-final';

  area.innerHTML = `<div class="event-box ec-season preseason-box">
    <div class="event-tag"><div class="event-dot"></div>🏆 PRESEASON CUP</div>
    <div class="event-text">Manager says: <strong>"Preseason started. I count on you."</strong> Your team enters the <strong>${cup.name}</strong>.</div>
    ${buildPreseasonTableHTML(cup)}
    <div class="action-row">
      <button class="btn-continue" data-action="preseason-cup-start">▶ ${nextRoundLabel}</button>
    </div>
  </div>`;
}

export function renderPreseasonCupQuestion() {
  const cup = state.preseasonCup;
  const match = cup?.currentMatch;
  if (!cup || !match) return;

  const area = document.getElementById('event-area');
  const q = match.questions[match.questionIndex];
  const progress = `${match.questionIndex + 1}/5`;

  area.innerHTML = `<div class="event-box ec-season preseason-box">
    <div class="event-tag"><div class="event-dot"></div>⚽ ${match.round.toUpperCase()}</div>
    <div class="event-text"><strong>${state.G.club.name}</strong> vs <strong>${match.opponent}</strong> · ${match.startMode}</div>
    ${buildPreseasonTableHTML(cup)}
    <div class="preseason-q-wrap">
      <div class="preseason-q-head">Match Decision ${progress}</div>
      <div class="preseason-q-text">${q.prompt}</div>
      <div class="choices">${q.options.map((opt, i) => `
        <button class="btn-c" data-action="preseason-answer" data-option="${i}">
          <span class="c-icon">🎮</span>
          <span>${opt.label}</span>
          <span class="c-hint">${opt.hint}</span>
        </button>
      `).join('')}</div>
    </div>
  </div>`;
}

export function renderPreseasonCupRoundResult(result, won, isFinal) {
  const cup = state.preseasonCup;
  if (!cup) return;

  const area = document.getElementById('event-area');
  const title = isFinal
    ? (won ? `🏆 ${cup.name} WON` : `💔 ${cup.name} LOST`)
    : (won ? '✅ Semi-final Won' : '❌ Semi-final Lost');
  const subtitle = `${result.home} ${result.homeGoals} - ${result.awayGoals} ${result.away}`;

  const notes = (result.notes || []).slice(-2);
  const notesHTML = notes.length
    ? `<div class="preseason-notes">${notes.map(n => `<div>• ${n}</div>`).join('')}</div>`
    : '';

  const cta = won && !isFinal
    ? '<button class="btn-continue" data-action="preseason-cup-start">▶ Start Final</button>'
    : '<button class="btn-continue" data-action="play-season">▶ Continue to Action 2/10</button>';

  area.innerHTML = `<div class="event-box ec-season preseason-box">
    <div class="event-tag"><div class="event-dot"></div>📋 PRESEASON RESULT</div>
    <div class="event-text"><strong>${title}</strong><br>${subtitle}</div>
    ${notesHTML}
    ${buildPreseasonTableHTML(cup)}
    <div class="action-row">${cta}</div>
  </div>`;
}
