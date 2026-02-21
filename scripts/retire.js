import { state } from './state.js';
import { TROPHY_NAMES } from './data.js';
import { calcOvr, ordinal } from './utils.js';
import { showScreen } from './ui.js';

export function retire() {
  showScreen('retire');
  const ovr=calcOvr(), tCount=state.G.trophies.length;
  const hasBallon=state.G.trophies.includes('ballon');
  const hasCL=state.G.trophies.includes('champions');

  let rating=1;
  if (state.G.peakOvr>=91&&tCount>=8) rating=5;
  else if (state.G.peakOvr>=84&&tCount>=4) rating=4;
  else if (state.G.peakOvr>=76&&tCount>=2) rating=3;
  else if (state.G.peakOvr>=68&&tCount>=1) rating=2;

  const stars='⭐'.repeat(rating)+'☆'.repeat(5-rating);
  const ratingLabel=['','Journeyman','Solid Professional','Fan Favourite','Club Legend','World Legend'][rating];

  document.getElementById('ret-sub').textContent = `${state.G.name} · ${state.G.club.name}`;

  let statsDisplay;
  if (state.G.pos === 'goalkeeper') {
    const totalSaves = state.G.seasonHistory.reduce((acc, sh) => acc + sh.saves, 0);
    const totalCleanSheets = state.G.seasonHistory.reduce((acc, sh) => acc + sh.cleanSheets, 0);
    statsDisplay = [
      {v:state.G.peakOvr,l:'Peak Rating'},{v:state.G.seasonsPlayed,l:'Seasons'},{v:tCount,l:'Trophies'},
      {v:totalSaves,l:'Total Saves'},{v:totalCleanSheets,l:'Clean Sheets'},{v:Math.round(state.G.reputation),l:'Final Reputation'},
    ];
  } else {
    statsDisplay = [
      {v:state.G.peakOvr,l:'Peak Rating'},{v:state.G.seasonsPlayed,l:'Seasons'},{v:tCount,l:'Trophies'},
      {v:state.G.totalGoals,l:'Goals'},{v:state.G.totalAssists,l:'Assists'},{v:Math.round(state.G.reputation),l:'Final Reputation'},
    ];
  }

  document.getElementById('ret-grid').innerHTML=statsDisplay.map(s=>`<div class="ret-stat"><div class="ret-val">${s.v}</div><div class="ret-lbl">${s.l}</div></div>`).join('');

  const bdList = document.getElementById('ret-bd-list');
  if (!state.G.ballonHistory.length) {
    bdList.innerHTML='<div class="empty-muted">No Ballon d\'Or rankings this career.</div>';
  } else {
    bdList.innerHTML=state.G.ballonHistory.map(h=>`
      <div class="ret-bd-row">
        <span>Season ${h.season} (Age ${h.age}) <span class="ret-bd-club">(${h.club})</span></span>
        <span class="rank-text ${getRankClass(h.rank)}">${h.rank?ordinal(h.rank)+' place':'Not ranked'}</span>
      </div>`).join('');
  }

  document.getElementById('ret-career-lbl').textContent = ratingLabel+' Career';
  document.getElementById('ret-stars').textContent = stars;

  const legacy = hasBallon
    ? `${state.G.name} transcended football. A Ballon d'Or winner, a cultural icon — some players leave marks that last forever.`
    : hasCL
    ? `A Champions League winner. ${state.G.name} proved himself on the biggest stage in the world.`
    : tCount>=4
    ? `${state.G.name} gave everything to the game over ${state.G.seasonsPlayed} remarkable seasons. The trophies speak.`
    : state.G.peakOvr>=82
    ? `The talent was never in question. Perhaps the silverware didn't reflect the quality of the player.`
    : `A footballer who lived the dream. Not every career ends in glory — but every one matters.`;

  document.getElementById('ret-legacy').textContent = legacy
    + (state.G.dopingBans?' The doping controversy will always cast a shadow.':'')
    + (state.G.injuryCount>=5?' Injuries were a constant battle — a warrior to the end.':'');

  renderRetirementChart();
  renderSeasonTable();
}

function getRankClass(rank) {
  if (rank === 1) return 'rank-1';
  if (rank === null || rank === undefined) return 'rank-5';
  if (rank && rank <= 5) return 'rank-5';
  if (rank && rank <= 15) return 'rank-15';
  if (rank) return 'rank-else';
  return 'rank-5';
}

function renderRetirementChart() {
  const chartDiv = document.getElementById('ovrChart');
  chartDiv.innerHTML = '';

  if (!state.G.seasonHistory.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-muted empty-center';
    empty.textContent = 'No season data recorded.';
    chartDiv.appendChild(empty);
    return;
  }

  const maxOvr = Math.max(99, Math.max(...state.G.seasonHistory.map(s=>s.ovr)));
  const minOvr = Math.min(50, Math.min(...state.G.seasonHistory.map(s=>s.ovr)));
  const range = maxOvr - minOvr || 10;

  state.G.seasonHistory.forEach((sh) => {
    const heightPercent = ((sh.ovr - minOvr) / range * 100);
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.innerHTML = `
      <div class="chart-bar-fill"></div>
      <div class="chart-bar-label">S${sh.season}</div>
    `;
    bar.title = `Season ${sh.season} (Age ${sh.age}): OVR ${sh.ovr}`;
    bar.querySelector('.chart-bar-fill').style.setProperty('--bar-height', `${Math.max(2, heightPercent)}%`);
    chartDiv.appendChild(bar);
  });
}

function renderSeasonTable() {
  const tableDiv = document.getElementById('seasonTable');

  if (!state.G.seasonHistory.length) {
    tableDiv.innerHTML = '<div class="empty-muted empty-center">No season data recorded.</div>';
    return;
  }

  let bestSeasonIdx = 0;
  let bestScore = -Infinity;
  state.G.seasonHistory.forEach((sh, idx) => {
    let score;
    if (state.G.pos === 'goalkeeper') {
      score = sh.ovr * 3 + sh.saves * 0.15 + sh.cleanSheets * 2 + sh.trophies.length * 8;
    } else {
      score = sh.ovr * 3 + sh.goals * 0.5 + sh.assists * 0.4 + sh.trophies.length * 8;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSeasonIdx = idx;
    }
  });

  let headerRow;
  if (state.G.pos === 'goalkeeper') {
    headerRow = `
      <tr>
        <th>Season</th>
        <th>Age</th>
        <th>OVR</th>
        <th>Saves</th>
        <th>Clean Sheets</th>
        <th>Club</th>
        <th>Trophies</th>
      </tr>
    `;
  } else {
    headerRow = `
      <tr>
        <th>Season</th>
        <th>Age</th>
        <th>OVR</th>
        <th>Goals</th>
        <th>Assists</th>
        <th>Club</th>
        <th>Trophies</th>
      </tr>
    `;
  }

  let html = `
    <table class="season-table">
      <thead>
        ${headerRow}
      </thead>
      <tbody>
  `;

  state.G.seasonHistory.forEach((sh, idx) => {
    const trophyStr = sh.trophies.length > 0 ? sh.trophies.map(t => TROPHY_NAMES[t] || t).join(', ') : '—';
    const isPrime = idx === bestSeasonIdx;
    const rowClass = isPrime ? 'season-prime' : '';
    const primeLabel = isPrime ? '<span class="prime-label">✨ PRIME</span>' : '';

    let statsCells;
    if (state.G.pos === 'goalkeeper') {
      statsCells = `<td>${sh.saves}</td><td>${sh.cleanSheets}</td>`;
    } else {
      statsCells = `<td>${sh.goals}</td><td>${sh.assists}</td>`;
    }

    html += `
      <tr class="${rowClass}">
        <td><span class="season-val">${sh.season}</span>${primeLabel}</td>
        <td>${sh.age}</td>
        <td><span class="season-val">${sh.ovr}</span></td>
        ${statsCells}
        <td>${sh.club}</td>
        <td class="trophy-cell">${trophyStr}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  tableDiv.innerHTML = html;
}

export function downloadCareerData() {
  const data = {
    player: {
      name: state.G.name,
      position: state.G.pos,
      nationality: state.G.nat,
      academy: state.G.academy.name
    },
    career: {
      seasonsPlayed: state.G.seasonsPlayed,
      finalAge: state.G.age,
      peakOverall: state.G.peakOvr,
      peakClub: state.G.peakClub,
      finalClub: state.G.club.name,
      totalGoals: state.G.totalGoals,
      totalAssists: state.G.totalAssists,
      finalReputation: Math.round(state.G.reputation),
      totalTrophies: state.G.trophies.length
    },
    seasonBySeason: state.G.seasonHistory
  };

  const csv = [
    ['Player Career Summary', state.G.name],
    ['Position', state.G.pos],
    ['Academy', state.G.academy.name],
    [''],
    ['Career Stats'],
    ['Seasons Played', state.G.seasonsPlayed],
    ['Peak Overall Rating', state.G.peakOvr],
    ['Total Goals', state.G.totalGoals],
    ['Total Assists', state.G.totalAssists],
    ['Total Trophies', state.G.trophies.length],
    ['Final Reputation', Math.round(state.G.reputation)],
    [''],
    ['Season', 'Age', 'OVR', 'Goals', 'Assists', 'Club', 'Trophies']
  ];

  state.G.seasonHistory.forEach(sh => {
    const trophy = sh.trophies.length > 0 ? sh.trophies.map(t => TROPHY_NAMES[t] || t).join('; ') : '';
    csv.push([sh.season, sh.age, sh.ovr, sh.goals, sh.assists, sh.club, trophy]);
  });

  const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.G.name}-career.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
