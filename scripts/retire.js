import { state } from './state.js';
import { getTrophyName } from './data.js';
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

function getSeasonOvr(sh) {
  const raw = sh?.ovr ?? sh?.overall ?? sh?.rating;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(99, Math.round(parsed)));
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

  const seasonRows = state.G.seasonHistory.map(sh => ({ ...sh, _ovr: getSeasonOvr(sh) }));
  const validRows = seasonRows.filter(sh => sh._ovr !== null);

  if (!validRows.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-muted empty-center';
    empty.textContent = 'No valid OVR data recorded.';
    chartDiv.appendChild(empty);
    return;
  }

  const ovrs = validRows.map(sh => sh._ovr);
  const dataMin = Math.min(...ovrs);
  const dataMax = Math.max(...ovrs);
  const yMin = Math.max(1, dataMin - 2);
  const yMax = Math.min(99, dataMax + 2);
  const yRange = Math.max(4, yMax - yMin);

  const chartHeight = 180;
  const leftPad = 28;
  const rightPad = 10;
  const topPad = 10;
  const bottomPad = 34;
  const innerHeight = chartHeight - topPad - bottomPad;
  const colWidth = 28;
  const minWidth = 540;
  const chartWidth = Math.max(minWidth, leftPad + rightPad + ((validRows.length - 1) * colWidth));

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
  svg.setAttribute('width', `${chartWidth}`);
  svg.setAttribute('height', `${chartHeight}`);
  svg.classList.add('ovr-chart-svg');

  const toX = idx => leftPad + (idx * colWidth);
  const toY = ovr => topPad + ((yMax - ovr) / yRange) * innerHeight;

  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax];
  yTicks.forEach((tick) => {
    const y = toY(tick);
    const gridLine = document.createElementNS(svgNs, 'line');
    gridLine.setAttribute('x1', `${leftPad}`);
    gridLine.setAttribute('y1', `${y}`);
    gridLine.setAttribute('x2', `${chartWidth - rightPad}`);
    gridLine.setAttribute('y2', `${y}`);
    gridLine.setAttribute('stroke', 'rgba(245,240,232,0.10)');
    gridLine.setAttribute('stroke-width', '1');
    svg.appendChild(gridLine);

    const yLabel = document.createElementNS(svgNs, 'text');
    yLabel.setAttribute('x', `${leftPad - 6}`);
    yLabel.setAttribute('y', `${y + 4}`);
    yLabel.setAttribute('text-anchor', 'end');
    yLabel.setAttribute('fill', 'rgba(245,240,232,0.45)');
    yLabel.setAttribute('font-size', '9');
    yLabel.textContent = `${tick}`;
    svg.appendChild(yLabel);
  });

  const points = validRows.map((sh, idx) => `${toX(idx)},${toY(sh._ovr)}`).join(' ');
  const polyline = document.createElementNS(svgNs, 'polyline');
  polyline.setAttribute('points', points);
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', 'var(--gold)');
  polyline.setAttribute('stroke-width', '2');
  polyline.setAttribute('stroke-linejoin', 'round');
  polyline.setAttribute('stroke-linecap', 'round');
  svg.appendChild(polyline);

  validRows.forEach((sh, idx) => {
    const x = toX(idx);
    const y = toY(sh._ovr);

    const dot = document.createElementNS(svgNs, 'circle');
    dot.setAttribute('cx', `${x}`);
    dot.setAttribute('cy', `${y}`);
    dot.setAttribute('r', '2.6');
    dot.setAttribute('fill', 'var(--gold-l)');
    const title = document.createElementNS(svgNs, 'title');
    title.textContent = `Season ${sh.season} (Age ${sh.age}): OVR ${sh._ovr}`;
    dot.appendChild(title);
    svg.appendChild(dot);

    const xLabel = document.createElementNS(svgNs, 'text');
    xLabel.setAttribute('x', `${x}`);
    xLabel.setAttribute('y', `${chartHeight - 12}`);
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', 'rgba(245,240,232,0.42)');
    xLabel.setAttribute('font-size', '8');
    xLabel.textContent = `S${sh.season}`;
    svg.appendChild(xLabel);
  });

  chartDiv.appendChild(svg);
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
    const seasonOvr = getSeasonOvr(sh) ?? 1;
    let score;
    if (state.G.pos === 'goalkeeper') {
      score = seasonOvr * 3 + sh.saves * 0.15 + sh.cleanSheets * 2 + sh.trophies.length * 8;
    } else {
      score = seasonOvr * 3 + sh.goals * 0.5 + sh.assists * 0.4 + sh.trophies.length * 8;
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
    const seasonOvr = getSeasonOvr(sh);
    const trophyStr = sh.trophies.length > 0 ? sh.trophies.map(t => getTrophyName(t)).join(', ') : '—';
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
        <td><span class="season-val">${seasonOvr ?? '—'}</span></td>
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
    const trophy = sh.trophies.length > 0 ? sh.trophies.map(t => getTrophyName(t)).join('; ') : '';
    csv.push([sh.season, sh.age, getSeasonOvr(sh) ?? '', sh.goals, sh.assists, sh.club, trophy]);
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
