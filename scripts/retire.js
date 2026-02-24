import { state } from './state.js';
import { getTrophyName } from './data.js';
import { calcOvr, formatM, ordinal } from './utils.js';
import { showScreen } from './ui.js';

function formatCurrency(n) {
  if (n >= 1000000000) return `€${(n / 1000000000).toFixed(2)}B`;
  if (n >= 1000000) return `€${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `€${Math.round(n / 1000)}K`;
  return `€${Math.round(n)}`;
}

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
      {v:formatCurrency(state.G.totalEarnings || 0),l:'Career Earnings'},
    ];
  } else {
    statsDisplay = [
      {v:state.G.peakOvr,l:'Peak Rating'},{v:state.G.seasonsPlayed,l:'Seasons'},{v:tCount,l:'Trophies'},
      {v:state.G.totalGoals,l:'Goals'},{v:state.G.totalAssists,l:'Assists'},{v:Math.round(state.G.reputation),l:'Final Reputation'},
      {v:formatCurrency(state.G.totalEarnings || 0),l:'Career Earnings'},
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
        <span class="rank-text ${getRankClass(h.rank)}">${h.ineligibleReason==='doping-ban'?'Ineligible (ban)':h.rank?ordinal(h.rank)+' place':'Not ranked'}</span>
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

function getSeasonAvgStat(sh) {
  const direct = Number(sh?.avgStat);
  if (Number.isFinite(direct)) return Math.max(1, Math.min(99, Math.round(direct)));

  const statKeys = ['pace', 'shooting', 'passing', 'dribbling', 'physical'];
  const statValues = statKeys
    .map(key => Number(sh?.[key]))
    .filter(value => Number.isFinite(value));

  if (statValues.length) {
    return Math.max(1, Math.min(99, Math.round(statValues.reduce((sum, value) => sum + value, 0) / statValues.length)));
  }

  return getSeasonOvr(sh);
}

function getSeasonCountMetric(sh, key) {
  const parsed = Number(sh?.[key]);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function calcSeasonMarketValue(sh) {
  const ovr = getSeasonOvr(sh);
  const age = Number(sh?.age);
  if (!Number.isFinite(ovr) || !Number.isFinite(age)) return null;
  const ageFactor = age <= 25
    ? Math.pow((age - 15) / 10, 1.2)
    : Math.max(0.05, 1 - (age - 25) * 0.055);
  const ovrFactor = Math.pow(Math.max(0, ovr - 50) / 49, 2.1);
  return Math.max(0.3, Math.round(ovrFactor * ageFactor * 260 * 10) / 10);
}

function calcAxisRange(values, includeZero = true) {
  const finiteValues = values.filter(value => Number.isFinite(value));
  if (!finiteValues.length) return null;

  let min = Math.min(...finiteValues);
  let max = Math.max(...finiteValues);

  if (includeZero) min = Math.min(min, 0);

  if (min === max) {
    const pad = Math.max(1, Math.abs(max) * 0.12);
    min -= pad;
    max += pad;
  } else {
    const span = max - min;
    min -= span * 0.08;
    max += span * 0.08;
  }

  return { min, max };
}

function formatSeriesValue(seriesKey, value) {
  if (!Number.isFinite(value)) return '—';
  if (seriesKey === 'marketValue') return formatM(value);
  return `${Math.round(value)}`;
}

function renderRetirementChartSvg(chartHost, rows, seriesConfig, selectedKeys) {
  chartHost.innerHTML = '';

  const activeSeries = seriesConfig.filter(series => selectedKeys.has(series.key));
  if (!activeSeries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-muted empty-center';
    empty.textContent = 'Select at least one metric to display the chart.';
    chartHost.appendChild(empty);
    return;
  }

  const leftSeries = activeSeries.filter(series => series.axis === 'left');
  const rightSeries = activeSeries.filter(series => series.axis === 'right');

  const leftRange = calcAxisRange(
    leftSeries.flatMap(series => rows.map(row => Number(row?.[series.key]))),
    true
  );
  const rightRange = calcAxisRange(
    rightSeries.flatMap(series => rows.map(row => Number(row?.[series.key]))),
    true
  );

  const chartHeight = 220;
  const leftPad = 34;
  const rightPad = rightRange ? 44 : 14;
  const topPad = 12;
  const bottomPad = 38;
  const innerHeight = chartHeight - topPad - bottomPad;
  const colWidth = 30;
  const minWidth = 560;
  const chartWidth = Math.max(minWidth, leftPad + rightPad + ((rows.length - 1) * colWidth));

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
  svg.setAttribute('width', `${chartWidth}`);
  svg.setAttribute('height', `${chartHeight}`);
  svg.classList.add('ovr-chart-svg');

  const toX = idx => leftPad + (idx * colWidth);
  const toY = (value, axis) => {
    const range = axis === 'right' ? rightRange : leftRange;
    if (!range) return topPad + (innerHeight / 2);
    const safeSpan = Math.max(0.001, range.max - range.min);
    return topPad + ((range.max - value) / safeSpan) * innerHeight;
  };

  const tickCount = 4;
  if (leftRange) {
    for (let i = 0; i <= tickCount; i++) {
      const ratio = i / tickCount;
      const tickValue = leftRange.max - ((leftRange.max - leftRange.min) * ratio);
      const y = toY(tickValue, 'left');

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
      yLabel.textContent = `${Math.round(tickValue)}`;
      svg.appendChild(yLabel);
    }
  }

  if (rightRange) {
    for (let i = 0; i <= tickCount; i++) {
      const ratio = i / tickCount;
      const tickValue = rightRange.max - ((rightRange.max - rightRange.min) * ratio);
      const y = toY(tickValue, 'right');
      const yLabel = document.createElementNS(svgNs, 'text');
      yLabel.setAttribute('x', `${chartWidth - rightPad + 6}`);
      yLabel.setAttribute('y', `${y + 4}`);
      yLabel.setAttribute('text-anchor', 'start');
      yLabel.setAttribute('fill', 'rgba(245,240,232,0.45)');
      yLabel.setAttribute('font-size', '9');
      yLabel.textContent = `${Math.round(tickValue)}M`;
      svg.appendChild(yLabel);
    }
  }

  activeSeries.forEach(series => {
    const points = rows
      .map((row, idx) => {
        const value = Number(row?.[series.key]);
        if (!Number.isFinite(value)) return null;
        return {
          row,
          value,
          x: toX(idx),
          y: toY(value, series.axis)
        };
      })
      .filter(Boolean);

    if (!points.length) return;

    if (points.length > 1) {
      const polyline = document.createElementNS(svgNs, 'polyline');
      polyline.setAttribute('points', points.map(point => `${point.x},${point.y}`).join(' '));
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', series.color);
      polyline.setAttribute('stroke-width', series.key === 'ovr' ? '2.5' : '2');
      polyline.setAttribute('stroke-linejoin', 'round');
      polyline.setAttribute('stroke-linecap', 'round');
      svg.appendChild(polyline);
    }

    points.forEach(point => {
      const dot = document.createElementNS(svgNs, 'circle');
      dot.setAttribute('cx', `${point.x}`);
      dot.setAttribute('cy', `${point.y}`);
      dot.setAttribute('r', series.key === 'ovr' ? '3.1' : '2.5');
      dot.setAttribute('fill', series.color);
      const title = document.createElementNS(svgNs, 'title');
      title.textContent = `Season ${point.row.season} (Age ${point.row.age}) · ${series.label}: ${formatSeriesValue(series.key, point.value)}`;
      dot.appendChild(title);
      svg.appendChild(dot);
    });
  });

  const labelStep = Math.max(1, Math.ceil(rows.length / 14));
  rows.forEach((row, idx) => {
    if (idx % labelStep !== 0 && idx !== rows.length - 1) return;
    const x = toX(idx);
    const xLabel = document.createElementNS(svgNs, 'text');
    xLabel.setAttribute('x', `${x}`);
    xLabel.setAttribute('y', `${chartHeight - 12}`);
    xLabel.setAttribute('text-anchor', 'middle');
    xLabel.setAttribute('fill', 'rgba(245,240,232,0.42)');
    xLabel.setAttribute('font-size', '8');
    xLabel.textContent = `S${row.season}`;
    svg.appendChild(xLabel);
  });

  chartHost.appendChild(svg);
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

  const seasonRows = state.G.seasonHistory.map(sh => {
    const storedWorth = Number(sh?.marketValue);
    return {
      ...sh,
      ovr: getSeasonOvr(sh),
      marketValue: Number.isFinite(storedWorth) ? storedWorth : calcSeasonMarketValue(sh),
      goals: getSeasonCountMetric(sh, 'goals'),
      assists: getSeasonCountMetric(sh, 'assists'),
      saves: getSeasonCountMetric(sh, 'saves'),
      cleanSheets: getSeasonCountMetric(sh, 'cleanSheets'),
      avgStat: getSeasonAvgStat(sh),
    };
  });
  const validRows = seasonRows.filter(sh => sh.ovr !== null);

  if (!validRows.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-muted empty-center';
    empty.textContent = 'No valid OVR data recorded.';
    chartDiv.appendChild(empty);
    return;
  }

  const isGoalkeeper = state.G.pos === 'goalkeeper';
  const seriesConfig = isGoalkeeper
    ? [
        { key: 'ovr', label: 'Overall', color: 'var(--gold)', axis: 'left', checked: true },
        { key: 'marketValue', label: 'Worth (€M)', color: 'var(--green)', axis: 'right', checked: true },
        { key: 'saves', label: 'Saves', color: 'var(--cream)', axis: 'left', checked: true },
        { key: 'cleanSheets', label: 'Clean Sheets', color: 'var(--red)', axis: 'left', checked: true },
        { key: 'avgStat', label: 'Avg Stats', color: 'var(--gold-l)', axis: 'left', checked: true },
      ]
    : [
        { key: 'ovr', label: 'Overall', color: 'var(--gold)', axis: 'left', checked: true },
        { key: 'marketValue', label: 'Worth (€M)', color: 'var(--green)', axis: 'right', checked: true },
        { key: 'goals', label: 'Goals', color: 'var(--cream)', axis: 'left', checked: true },
        { key: 'assists', label: 'Assists', color: 'var(--red)', axis: 'left', checked: true },
        { key: 'avgStat', label: 'Avg Stats', color: 'var(--gold-l)', axis: 'left', checked: true },
      ];

  const selectedKeys = new Set(seriesConfig.filter(series => series.checked).map(series => series.key));

  const controls = document.createElement('div');
  controls.className = 'chart-controls';
  controls.innerHTML = seriesConfig.map(series => `
    <label class="chart-toggle">
      <input type="checkbox" data-series="${series.key}" ${series.checked ? 'checked' : ''}>
      <span class="chart-swatch" style="--sw:${series.color}"></span>
      <span>${series.label}</span>
    </label>
  `).join('');

  const chartHost = document.createElement('div');
  chartHost.className = 'ovr-chart-host';

  controls.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
    const key = input.dataset.series;
    if (!key) return;
    if (input.checked) selectedKeys.add(key);
    else selectedKeys.delete(key);
    renderRetirementChartSvg(chartHost, validRows, seriesConfig, selectedKeys);
  });

  chartDiv.appendChild(controls);
  chartDiv.appendChild(chartHost);
  renderRetirementChartSvg(chartHost, validRows, seriesConfig, selectedKeys);
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
        <th>Worth</th>
        <th>Saves</th>
        <th>Clean Sheets</th>
        <th>Club</th>
        <th>Status</th>
        <th>Trophies</th>
      </tr>
    `;
  } else {
    headerRow = `
      <tr>
        <th>Season</th>
        <th>Age</th>
        <th>OVR</th>
        <th>Worth</th>
        <th>Goals</th>
        <th>Assists</th>
        <th>Club</th>
        <th>Status</th>
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
    const storedWorth = Number(sh.marketValue);
    const seasonWorthM = Number.isFinite(storedWorth) ? storedWorth : calcSeasonMarketValue(sh);
    const seasonWorth = seasonWorthM !== null ? formatM(seasonWorthM) : '—';
    const trophyStr = sh.trophies.length > 0 ? sh.trophies.map(t => getTrophyName(t)).join(', ') : '—';
    const seasonStatus = sh.seasonType === 'doping-ban'
      ? 'Doping ban'
      : sh.ballonIneligibleReason === 'doping-ban'
      ? 'Ballon ineligible (ban)'
      : 'Normal';
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
        <td><span class="season-val">${seasonWorth}</span></td>
        ${statsCells}
        <td>${sh.club}</td>
        <td>${seasonStatus}</td>
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
    ['Season', 'Age', 'OVR', 'Goals', 'Assists', 'Club', 'Status', 'Trophies']
  ];

  state.G.seasonHistory.forEach(sh => {
    const trophy = sh.trophies.length > 0 ? sh.trophies.map(t => getTrophyName(t)).join('; ') : '';
    const seasonStatus = sh.seasonType === 'doping-ban'
      ? 'Doping ban'
      : sh.ballonIneligibleReason === 'doping-ban'
      ? 'Ballon ineligible (ban)'
      : 'Normal';
    csv.push([sh.season, sh.age, getSeasonOvr(sh) ?? '', sh.goals, sh.assists, sh.club, seasonStatus, trophy]);
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
