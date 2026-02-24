import { state } from './state.js';
import { TIERS } from './data.js';
import { calcMarketValue, calcOvr, calcSalary, formatM, getContractYearRange, getTierOfClub, prestige2Stars, rollContractYears, rng } from './utils.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function findClubByName(name) {
  return TIERS.flat().find(c => c.name === name) || null;
}

function isClubBlocked(clubName) {
  return Array.isArray(state.G.bannedFromClubs) && state.G.bannedFromClubs.includes(clubName);
}

function isLoanActive() {
  const loan = state.G?.loan;
  return !!loan?.active && Number(loan.seasonsLeft) > 0;
}

function getMarketplaceFrozenReason() {
  if (!isLoanActive()) return '';
  const loanClub = state.G?.loan?.toClub?.name || 'another club';
  const seasonsLeft = Math.max(1, Number(state.G?.loan?.seasonsLeft) || 1);
  return `Marketplace is frozen while you are on loan at ${loanClub} (${seasonsLeft} season${seasonsLeft !== 1 ? 's' : ''} left).`;
}

function weightedPick(pool) {
  if (!pool.length) return null;
  let r = Math.random() * pool.reduce((sum, item) => sum + item.weight, 0);
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

const APPLICATION_MODES = {
  balanced: {
    key: 'balanced',
    label: 'Balanced Proposal',
    salaryMultiplier: 1,
    chanceBonus: 0,
    relationDelta: 0,
    desc: 'Standard wage and role demands.',
  },
  teamFirst: {
    key: 'teamFirst',
    label: 'Team-First Deal',
    salaryMultiplier: 0.88,
    chanceBonus: 0.18,
    relationDelta: 6,
    desc: 'Lower wage ask to increase acceptance chance.',
  },
  proveIt: {
    key: 'proveIt',
    label: 'Prove-It Year',
    salaryMultiplier: 0.94,
    chanceBonus: 0.11,
    relationDelta: 3,
    desc: 'Flexible role request with modest wage cut.',
  },
  starDemand: {
    key: 'starDemand',
    label: 'Star Demands',
    salaryMultiplier: 1.15,
    chanceBonus: -0.12,
    relationDelta: -5,
    desc: 'Higher wage ask and bigger role expectation.',
  },
};

const EXTENSION_PROPOSAL_MODES = {
  balanced: {
    key: 'balanced',
    label: 'Balanced Ask',
    salaryMultiplier: 1,
    minutesShift: 0,
    chanceBonus: 0,
    desc: 'Standard salary and role expectations.',
  },
  teamFirst: {
    key: 'teamFirst',
    label: 'Team-First Offer',
    salaryMultiplier: 0.86,
    minutesShift: -520,
    chanceBonus: 0.18,
    desc: 'Lower wages and lighter role demand for higher acceptance.',
  },
  shortTerm: {
    key: 'shortTerm',
    label: 'Short-Term Deal',
    salaryMultiplier: 0.93,
    minutesShift: -240,
    chanceBonus: 0.09,
    desc: 'Shorter commitment with modest salary flexibility.',
  },
  starDemand: {
    key: 'starDemand',
    label: 'Star Demands',
    salaryMultiplier: 1.13,
    minutesShift: 450,
    chanceBonus: -0.16,
    desc: 'Higher wages and bigger role expectation.',
  },
};

function getApplyMode() {
  const key = state.marketUi?.applyMode;
  return APPLICATION_MODES[key] || APPLICATION_MODES.balanced;
}

function getExtensionMode() {
  const key = state.extensionUi?.mode;
  return EXTENSION_PROPOSAL_MODES[key] || EXTENSION_PROPOSAL_MODES.balanced;
}

function getManagerConnection(clubName) {
  if (!state.G.managerConnections) state.G.managerConnections = {};
  if (typeof state.G.managerConnections[clubName] !== 'number') {
    const rep = state.G.reputation || 0;
    const tierGap = getTierOfClub(clubName) - (state.G.clubTier || 1);
    const seed = 34 + rep * 0.22 - Math.max(0, tierGap) * 4 + rng(-8, 8);
    state.G.managerConnections[clubName] = clamp(Math.round(seed), 8, 82);
  }
  return state.G.managerConnections[clubName];
}

function adjustManagerConnection(clubName, delta) {
  const current = getManagerConnection(clubName);
  state.G.managerConnections[clubName] = clamp(Math.round(current + delta), 0, 100);
}

export function changeManagerConnection(clubName, delta) {
  if (!clubName || !Number.isFinite(delta)) return;
  adjustManagerConnection(clubName, delta);
}

export function changeCurrentClubManagerConnection(delta) {
  const currentClub = state.G?.club?.name;
  if (!currentClub || !Number.isFinite(delta)) return;
  adjustManagerConnection(currentClub, delta);
}

export function rippleKnownManagerConnections(delta) {
  if (!Number.isFinite(delta) || !state.G.managerConnections) return;
  const keys = Object.keys(state.G.managerConnections);
  keys.forEach(clubName => adjustManagerConnection(clubName, delta));
}

function getConnectionLabel(value) {
  if (value >= 80) return 'Elite Trust';
  if (value >= 65) return 'Strong Link';
  if (value >= 50) return 'Good Contact';
  if (value >= 35) return 'Neutral';
  if (value >= 20) return 'Cold';
  return 'Difficult';
}

function estimatePlayingTime(club, managerConnection) {
  const ovr = calcOvr();
  const rep = state.G.reputation || 0;
  const profileScore = ovr + rep / 4 + managerConnection / 7;
  const squadBar = 56 + (club.prestige || 50) * 0.36;
  const delta = profileScore - squadBar;

  if (delta >= 14) {
    return { role: 'Key Player', minutes: rng(3000, 3700), startChance: 0.9 };
  }
  if (delta >= 6) {
    return { role: 'Starter', minutes: rng(2400, 3200), startChance: 0.74 };
  }
  if (delta >= -3) {
    return { role: 'Rotation', minutes: rng(1500, 2400), startChance: 0.52 };
  }
  return { role: 'Bench / Cup', minutes: rng(700, 1500), startChance: 0.31 };
}

function minutesToRole(minutes) {
  if (minutes >= 3000) return 'Key Player';
  if (minutes >= 2200) return 'Starter';
  if (minutes >= 1400) return 'Rotation';
  return 'Bench / Cup';
}

function formatSalary(salary) {
  return salary >= 1000000 ? `€${(salary / 1000000).toFixed(2)}M/wk` : `€${(salary / 1000).toFixed(0)}K/wk`;
}

function buildExtensionProposal(mode = EXTENSION_PROPOSAL_MODES.balanced) {
  const club = state.G.club;
  if (!club) return null;

  const managerConnection = getManagerConnection(club.name);
  const baselineRole = estimatePlayingTime(club, managerConnection);
  const baseSalary = Math.round(calcSalary(calcOvr(), state.G.age) * (1 + club.prestige / 260) / 1000) * 1000;
  const salary = Math.max(1000, Math.round(baseSalary * (mode.salaryMultiplier || 1) / 1000) * 1000);
  const releaseClause = Math.round(calcMarketValue() * (2 + club.prestige / 120) * 10) / 10;
  const baseYears = rollContractYears(state.G.age);
  const contractYrs = mode.key === 'shortTerm' ? Math.max(1, Math.min(2, baseYears)) : baseYears;
  const requestedMinutes = clamp((baselineRole.minutes || 1800) + (mode.minutesShift || 0), 450, 3800);
  const requestedRole = minutesToRole(requestedMinutes);

  let acceptanceChance = 0.26;
  acceptanceChance += (calcOvr() - 68) * 0.012;
  acceptanceChance += (state.G.reputation || 0) * 0.002;
  acceptanceChance += ((club.prestige || 50) - 65) * 0.003;
  acceptanceChance += (managerConnection - 45) * 0.004;
  acceptanceChance += (1 - (mode.salaryMultiplier || 1)) * 0.9;
  acceptanceChance += (-(mode.minutesShift || 0) / 1000) * 0.2;
  acceptanceChance += mode.chanceBonus || 0;
  acceptanceChance -= Math.max(0, (state.G.contract?.years || 0) - 1) * 0.09;
  acceptanceChance = clamp(acceptanceChance, 0.04, 0.95);

  return {
    club,
    modeKey: mode.key,
    contractYrs,
    releaseClause,
    salary,
    requestedRole,
    requestedMinutes,
    managerConnection,
    acceptanceChance,
  };
}

export function canClubFinanceMove(club, fee, ovr = calcOvr()) {
  if (!club) return false;
  const transferFee = Math.max(0, fee || 0);
  const prestige = club.prestige || 50;
  const baselineBudget = 5 + prestige * 1.22 + Math.max(0, prestige - 72) * 0.95;
  const ovrPressure = Math.max(0, (ovr - 80) * 0.75);
  const adjustedNeed = transferFee + ovrPressure;
  let chance = clamp((baselineBudget / Math.max(1, adjustedNeed)) * 0.95, 0.02, 0.97);

  if (adjustedNeed > 135 && prestige < 78) chance *= 0.3;
  else if (adjustedNeed > 95 && prestige < 68) chance *= 0.45;

  chance += (90 - Math.min(90, Math.max(55, state.G.reputation || 50))) / 900;

  return Math.random() < clamp(chance, 0.02, 0.98);
}

function isCurrentClubWillingToSell(buyingClub) {
  if (!buyingClub) return false;
  const years = state.G.contract?.years || 0;
  const mv = calcMarketValue();
  const rc = state.G.contract?.releaseClause || mv * 2;
  const prestigeGap = buyingClub.prestige - (state.G.club?.prestige || 50);
  let chance = 0.16 + prestigeGap * 0.01;

  if (years <= 1) chance += 0.28;
  else if (years === 2) chance += 0.12;
  else chance -= 0.08;

  if (rc < mv * 1.35) chance += 0.14;
  if ((state.G.reputation || 0) > 75) chance += 0.06;
  if ((state.G.reputation || 0) < 35) chance -= 0.04;

  return Math.random() < clamp(chance, 0.04, 0.9);
}

function buildClubTerms(club, mode = APPLICATION_MODES.balanced) {
  const ovr = calcOvr();
  const mv = calcMarketValue();
  const managerConnection = getManagerConnection(club.name);
  const playingTime = estimatePlayingTime(club, managerConnection);
  const contractYrs = rollContractYears(state.G.age);
  const rcMult = 1.55 + (club.prestige / 100) * 1.15 + Math.random() * 0.35;
  const releaseClause = Math.max(mv * 1.15, Math.round(mv * rcMult * 10) / 10);
  const salaryBase = calcSalary(ovr, state.G.age) * (1 + club.prestige / 220);
  const salary = Math.round((salaryBase * (mode.salaryMultiplier || 1)) / 1000) * 1000;
  return {
    club,
    contractYrs,
    releaseClause,
    salary,
    managerConnection,
    playingTime,
    requestedMode: mode.key,
  };
}

function getMarketPool() {
  const ovr = calcOvr();
  const minTier = Math.max(0, (state.G.clubTier || 1) - 3);
  const maxTier = Math.min(TIERS.length - 1, (state.G.clubTier || 1) + (ovr >= 86 ? 3 : 2));

  return TIERS
    .slice(minTier, maxTier + 1)
    .flat()
    .filter(c => c.name !== state.G.club?.name)
    .filter(c => !isClubBlocked(c.name))
    .filter((club, idx, arr) => arr.findIndex(c => c.name === club.name) === idx);
}

function getExistingApplication(clubName) {
  return (state.marketApplications || []).find(a => a.clubName === clubName && a.status === 'pending');
}

function buildIncomingMarketInterests(pool) {
  const ovr = calcOvr();
  const rep = state.G.reputation || 0;
  const contractYears = state.G.contract?.years || 0;
  const mv = calcMarketValue();
  const rc = state.G.contract?.releaseClause || mv * 2;

  const interests = [];

  pool.forEach(club => {
    const managerConnection = getManagerConnection(club.name);
    const playingTime = estimatePlayingTime(club, managerConnection);
    const tierGap = getTierOfClub(club.name) - (state.G.clubTier || 1);
    let interestChance = 0.07 + (ovr - 66) * 0.012 + rep * 0.003 - Math.max(0, tierGap) * 0.028;
    interestChance += (club.prestige - (state.G.club?.prestige || 50)) * 0.0015;
    interestChance += (managerConnection - 45) * 0.0022;
    interestChance = clamp(interestChance, 0.02, 0.74);

    if (Math.random() >= interestChance) return;

    let status = 'monitor';
    let detail = 'Scouts are monitoring your situation.';
    let offer = null;

    if (contractYears <= 0) {
      status = 'free-agent';
      detail = 'Ready to sign now as a free agent.';
      offer = buildClubTerms(club);
    } else if (contractYears <= 1) {
      status = 'wait-expiry';
      detail = 'They can approach now, but your move likely starts after contract expiry.';
      if (canClubFinanceMove(club, mv * 0.18, ovr)) {
        offer = buildClubTerms(club);
      }
    } else if (rc <= mv * 1.65 && canClubFinanceMove(club, rc, ovr)) {
      status = 'release-clause';
      detail = `They can afford your release clause (${formatM(rc)}).`;
      offer = buildClubTerms(club);
    } else if (isCurrentClubWillingToSell(club) && canClubFinanceMove(club, mv * 1.1, ovr)) {
      status = 'offer-now';
      detail = 'Your club is open to a sale right now.';
      offer = buildClubTerms(club);
    } else {
      status = 'wait-expiry';
      detail = 'Current club prefers to keep you unless your contract runs down.';
    }

    interests.push({ club, status, detail, offer, managerConnection, playingTime });
  });

  return interests
    .sort((a, b) => b.club.prestige - a.club.prestige)
    .slice(0, 6);
}

function buildTargetApplications(pool) {
  const ovr = calcOvr();
  const rep = state.G.reputation || 0;

  const targets = pool
    .map(club => {
      const existing = getExistingApplication(club.name);
      const managerConnection = getManagerConnection(club.name);
      const playingTime = estimatePlayingTime(club, managerConnection);
      const tierGap = getTierOfClub(club.name) - (state.G.clubTier || 1);
      let score = 0.26 + (ovr - 68) * 0.016 + rep * 0.003 + tierGap * 0.025;
      score += (managerConnection - 45) * 0.0025;
      score -= Math.max(0, state.G.age - 31) * 0.018;
      score = clamp(score, 0.03, 0.88);

      return {
        club,
        responseScore: score,
        managerConnection,
        playingTime,
        canApply: !existing,
        reason: existing ? `Application sent in Season ${existing.seasonApplied} — waiting response.` : 'Send an interest message to your agent and board.',
      };
    })
    .sort((a, b) => b.club.prestige - a.club.prestige)
    .slice(0, 10);

  return targets;
}

export function buildMarketplaceBoard() {
  if (state.G?.club?.name) getManagerConnection(state.G.club.name);
  const pool = getMarketPool();
  const incoming = buildIncomingMarketInterests(pool);
  const targets = buildTargetApplications(pool);
  return {
    incoming,
    targets,
    season: state.G.season,
    contractYears: state.G.contract?.years || 0,
    releaseClause: state.G.contract?.releaseClause || 0,
    mode: getApplyMode(),
  };
}

function getMarketplaceBoardForCurrentSeason() {
  if (state.marketBoard && state.marketBoard.season === state.G.season) {
    return state.marketBoard;
  }

  const board = buildMarketplaceBoard();
  state.marketBoard = board;
  return board;
}

function getRenderableTargets(board) {
  return (board?.targets || []).map(target => {
    const existing = getExistingApplication(target.club.name);
    return {
      ...target,
      canApply: !existing,
      reason: existing
        ? `Application sent in Season ${existing.seasonApplied} — waiting response.`
        : 'Send an interest message to your agent and board.',
    };
  });
}

function renderIncomingCard(entry, idx) {
  const statusMap = {
    'offer-now': '✅ Offer Ready',
    'release-clause': '💣 Clause Route',
    'wait-expiry': '⏳ Wait Contract End',
    'free-agent': '🟢 Free Agent Offer',
    'monitor': '👀 Monitoring',
  };
  const statusText = statusMap[entry.status] || '👀 Monitoring';
  const actionBtn = entry.offer
    ? `<button class="btn-accept" data-action="accept-market-interest" data-index="${idx}">🖊️ Accept ${entry.club.name}</button>`
    : '';

  return `<div class="market-card">
    <div class="coc-league">${entry.club.country} ${entry.club.league}</div>
    <div class="coc-name">${entry.club.name}</div>
    <div class="coc-prestige">${prestige2Stars(entry.club.prestige)} &nbsp; ${statusText}</div>
    <div class="market-mini">Manager Link ${entry.managerConnection}/100 · ${getConnectionLabel(entry.managerConnection)}</div>
    <div class="market-mini">Expected Role: ${entry.playingTime.role} (${entry.playingTime.minutes} min)</div>
    <div class="market-detail">${entry.detail}</div>
    ${entry.offer ? `<div class="market-mini">Contract ${entry.offer.contractYrs}y · RC ${formatM(entry.offer.releaseClause)}</div>` : ''}
    <div class="market-actions">
      <button class="btn-decline" data-action="view-market-interest" data-index="${idx}">🔎 View Details</button>
      ${actionBtn}
    </div>
  </div>`;
}

function renderTargetCard(target, idx) {
  return `<div class="market-card">
    <div class="coc-league">${target.club.country} ${target.club.league}</div>
    <div class="coc-name">${target.club.name}</div>
    <div class="coc-prestige">${prestige2Stars(target.club.prestige)} &nbsp; Response chance ${(target.responseScore * 100).toFixed(0)}%</div>
    <div class="market-mini">Manager Link ${target.managerConnection}/100 · ${getConnectionLabel(target.managerConnection)}</div>
    <div class="market-mini">Projected Role: ${target.playingTime.role} (${target.playingTime.minutes} min)</div>
    <div class="market-detail">${target.reason}</div>
    <div class="market-actions">
      <button class="btn-decline" data-action="view-market-target" data-index="${idx}">🔎 Open Club Profile</button>
      <button class="${target.canApply ? 'btn-accept' : 'btn-decline'}" data-action="apply-market-club" data-index="${idx}" ${target.canApply ? '' : 'disabled'}>
        ${target.canApply ? '📨 Send Interest' : '📭 Already Applied'}
      </button>
    </div>
  </div>`;
}

function renderApplyModeButtons(modeKey) {
  const modes = Object.values(APPLICATION_MODES);
  return `<div class="market-mode-grid">${modes.map(mode => `
    <button class="market-mode-btn ${mode.key === modeKey ? 'active' : ''}" data-action="set-market-mode" data-mode="${mode.key}">
      <span class="market-mode-name">${mode.label}</span>
      <span class="market-mode-meta">Wage ${Math.round(mode.salaryMultiplier * 100)}% · Chance ${mode.chanceBonus >= 0 ? '+' : ''}${Math.round(mode.chanceBonus * 100)}%</span>
    </button>`).join('')}</div>`;
}

function renderExtensionModeButtons(modeKey) {
  const modes = Object.values(EXTENSION_PROPOSAL_MODES);
  return `<div class="market-mode-grid">${modes.map(mode => `
    <button class="market-mode-btn ${mode.key === modeKey ? 'active' : ''}" data-action="set-extension-mode" data-mode="${mode.key}">
      <span class="market-mode-name">${mode.label}</span>
      <span class="market-mode-meta">Wage ${Math.round(mode.salaryMultiplier * 100)}% · Role ${mode.minutesShift > 0 ? '+' : ''}${mode.minutesShift} mins</span>
    </button>`).join('')}</div>`;
}

function renderIncomingDetailPanel(entry, index) {
  if (!entry) return '';
  return `<div class="market-detail-panel">
    <div class="market-detail-title">Incoming Detail — ${entry.club.name}</div>
    <div class="market-detail-grid">
      <div><strong>Manager Connection:</strong> ${entry.managerConnection}/100 (${getConnectionLabel(entry.managerConnection)})</div>
      <div><strong>Expected Role:</strong> ${entry.playingTime.role}</div>
      <div><strong>Expected Minutes:</strong> ${entry.playingTime.minutes} / season</div>
      <div><strong>Status:</strong> ${entry.status}</div>
      ${entry.offer ? `<div><strong>Weekly Salary:</strong> ${formatSalary(entry.offer.salary)}</div>` : ''}
      ${entry.offer ? `<div><strong>Contract:</strong> ${entry.offer.contractYrs} year${entry.offer.contractYrs > 1 ? 's' : ''}</div>` : ''}
    </div>
    <div class="market-detail-text">${entry.detail}</div>
    <div class="market-actions">
      ${entry.offer ? `<button class="btn-accept" data-action="accept-market-interest" data-index="${index}">🖊️ Accept Deal</button>` : ''}
      <button class="btn-decline" data-action="market-clear-focus">Close</button>
    </div>
  </div>`;
}

function renderTargetDetailPanel(target, index, mode) {
  if (!target) return '';
  const wagePreview = Math.round(calcSalary(calcOvr(), state.G.age) * (1 + target.club.prestige / 220) * mode.salaryMultiplier / 1000) * 1000;
  const chancePreview = clamp(target.responseScore + mode.chanceBonus, 0.03, 0.95);
  return `<div class="market-detail-panel">
    <div class="market-detail-title">Application Setup — ${target.club.name}</div>
    <div class="market-detail-grid">
      <div><strong>Manager Connection:</strong> ${target.managerConnection}/100 (${getConnectionLabel(target.managerConnection)})</div>
      <div><strong>Projected Role:</strong> ${target.playingTime.role}</div>
      <div><strong>Projected Minutes:</strong> ${target.playingTime.minutes}</div>
      <div><strong>Apply Mode:</strong> ${mode.label}</div>
      <div><strong>Estimated Wage Ask:</strong> ${formatSalary(wagePreview)}</div>
      <div><strong>Adjusted Acceptance:</strong> ${(chancePreview * 100).toFixed(0)}%</div>
    </div>
    <div class="market-detail-text">${mode.desc}</div>
    <div class="market-actions">
      <button class="${target.canApply ? 'btn-accept' : 'btn-decline'}" data-action="apply-market-club" data-index="${index}" ${target.canApply ? '' : 'disabled'}>
        ${target.canApply ? '📨 Send Application' : '📭 Already Applied'}
      </button>
      <button class="btn-decline" data-action="market-clear-focus">Close</button>
    </div>
  </div>`;
}

export function showMarketplaceBoard(message = '') {
  const marketplaceFrozenReason = getMarketplaceFrozenReason();
  if (marketplaceFrozenReason) {
    const area = document.getElementById('event-area');
    area.innerHTML = `<div class="event-box ec-season">
      <div class="event-tag"><div class="event-dot"></div>📡 MARKETPLACE HUB</div>
      <div class="event-text">${marketplaceFrozenReason}</div>
      <div class="market-detail-panel">
        <div class="market-detail-title">Loan Rule Active</div>
        <div class="market-detail-text">You cannot send applications, accept marketplace offers, or negotiate extensions until the loan spell ends.</div>
      </div>
      ${message ? `<div class="market-flash">${message}</div>` : ''}
      <button class="btn-decline" data-action="back-transfer-week">⬅ Back</button>
    </div>`;
    return;
  }

  const board = getMarketplaceBoardForCurrentSeason();
  board.mode = getApplyMode();
  const renderTargets = getRenderableTargets(board);
  const extensionMode = getExtensionMode();
  const extensionProposal = buildExtensionProposal(extensionMode);
  const extensionBlockedReason = state.pendingTransfer
    ? `You already signed a pre-contract with ${state.pendingTransfer.club.name}.`
    : (state.G.contract?.years || 0) <= 0
    ? 'You are currently a free agent, so there is no active contract to extend.'
    : '';
  const currentSeason = Math.max(1, Number(state.G.season) || 1);
  const nextLoanRequestSeason = Math.max(1, Number(state.G.loanRequestCooldownSeason) || 1);
  const loanCooldownBlockedReason = currentSeason < nextLoanRequestSeason
    ? `Loan request cooldown active: available again in ${nextLoanRequestSeason - currentSeason} season${(nextLoanRequestSeason - currentSeason) !== 1 ? 's' : ''}.`
    : '';
  const loanRequestBlockedReason = isLoanActive()
    ? `Loan request unavailable: currently on loan at ${state.G.loan?.toClub?.name || 'another club'}.`
    : (state.G.contract?.years || 0) <= 0
    ? 'Loan request unavailable: you are a free agent without a parent-club contract.'
    : state.pendingTransfer
    ? `Loan request unavailable: transfer already agreed to ${state.pendingTransfer.club.name}.`
    : loanCooldownBlockedReason
    ? loanCooldownBlockedReason
    : '';

  const selectedIncoming = Number.isInteger(state.marketUi?.incomingIndex) ? board.incoming[state.marketUi.incomingIndex] : null;
  const selectedTarget = Number.isInteger(state.marketUi?.targetIndex) ? renderTargets[state.marketUi.targetIndex] : null;

  const area = document.getElementById('event-area');
  area.innerHTML = `<div class="event-box ec-season">
    <div class="event-tag"><div class="event-dot"></div>📡 MARKETPLACE HUB</div>
    <div class="event-text">Check detailed incoming interest, your manager relationship at each club, and tune your application terms to improve acceptance.</div>
    <div class="market-contract-bar">Contract left: <strong>${board.contractYears} year${board.contractYears !== 1 ? 's' : ''}</strong> · Release clause: <strong>${formatM(board.releaseClause)}</strong></div>
    <div class="market-section-title">Application Strategy</div>
    ${renderApplyModeButtons(board.mode.key)}
    <div class="market-section-title">Offer Extension To ${state.G.club.name}</div>
    ${renderExtensionModeButtons(extensionMode.key)}
    <div class="market-detail-panel">
      <div class="market-detail-title">Player Proposal Preview</div>
      <div class="market-detail-grid">
        <div><strong>Requested Salary:</strong> ${extensionProposal ? formatSalary(extensionProposal.salary) : '—'}</div>
        <div><strong>Requested Contract:</strong> ${extensionProposal ? `${extensionProposal.contractYrs} year${extensionProposal.contractYrs !== 1 ? 's' : ''}` : '—'}</div>
        <div><strong>Requested Role:</strong> ${extensionProposal ? extensionProposal.requestedRole : '—'}</div>
        <div><strong>Requested Minutes:</strong> ${extensionProposal ? extensionProposal.requestedMinutes : '—'} / season</div>
        <div><strong>Manager Link:</strong> ${extensionProposal ? `${extensionProposal.managerConnection}/100 (${getConnectionLabel(extensionProposal.managerConnection)})` : '—'}</div>
        <div><strong>Est. Acceptance:</strong> ${extensionProposal ? `${Math.round(extensionProposal.acceptanceChance * 100)}%` : '—'}</div>
      </div>
      <div class="market-detail-text">${extensionMode.desc}</div>
      ${extensionBlockedReason
        ? `<div class="market-detail-text">${extensionBlockedReason}</div>`
        : '<button class="btn-accept" data-action="send-extension-offer">📨 Send Extension Offer</button>'}
    </div>
    <div class="market-section-title">Request Loan Move</div>
    <div class="market-detail-panel">
      <div class="market-detail-title">Ask Club For 1–2 Year Loan</div>
      <div class="market-detail-text">Useful if minutes are limited at a strong club. Younger players gain development boost; older established players can target extra money packages.</div>
      ${loanRequestBlockedReason
        ? `<div class="market-detail-text">${loanRequestBlockedReason}</div>`
        : '<button class="btn-accept" data-action="request-market-loan">📄 Ask For Loan Out</button>'}
    </div>
    ${message ? `<div class="market-flash">${message}</div>` : ''}
    <div class="market-section-title">Incoming Interest</div>
    <div class="transfer-grid">${board.incoming.length ? board.incoming.map((entry, idx) => renderIncomingCard(entry, idx)).join('') : '<div class="empty-market">No active interest yet — keep performing.</div>'}</div>
    ${selectedIncoming ? renderIncomingDetailPanel(selectedIncoming, state.marketUi.incomingIndex) : ''}
    <div class="market-section-title">Apply To Clubs</div>
    <div class="transfer-grid">${renderTargets.map((target, idx) => renderTargetCard(target, idx)).join('')}</div>
    ${selectedTarget ? renderTargetDetailPanel(selectedTarget, state.marketUi.targetIndex, board.mode) : ''}
    <button class="btn-decline" data-action="back-transfer-week">⬅ Back</button>
  </div>`;
}

export function setMarketApplicationMode(modeKey) {
  if (!APPLICATION_MODES[modeKey]) return;
  const marketplaceFrozenReason = getMarketplaceFrozenReason();
  if (marketplaceFrozenReason) {
    showMarketplaceBoard(marketplaceFrozenReason);
    return;
  }
  if (!state.marketUi) state.marketUi = { incomingIndex: null, targetIndex: null, applyMode: 'balanced' };
  state.marketUi.applyMode = modeKey;
  showMarketplaceBoard(`Application mode set: ${APPLICATION_MODES[modeKey].label}`);
}

export function setExtensionOfferMode(modeKey) {
  if (!EXTENSION_PROPOSAL_MODES[modeKey]) return;
  const marketplaceFrozenReason = getMarketplaceFrozenReason();
  if (marketplaceFrozenReason) {
    showMarketplaceBoard(marketplaceFrozenReason);
    return;
  }
  if (!state.extensionUi) state.extensionUi = { mode: 'balanced', lastFeedback: '' };
  state.extensionUi.mode = modeKey;
  showMarketplaceBoard(`Extension mode set: ${EXTENSION_PROPOSAL_MODES[modeKey].label}`);
}

export function submitExtensionOffer() {
  const marketplaceFrozenReason = getMarketplaceFrozenReason();
  if (marketplaceFrozenReason) {
    showMarketplaceBoard(marketplaceFrozenReason);
    return;
  }

  const yearsLeft = state.G.contract?.years || 0;
  if (yearsLeft <= 0) {
    showMarketplaceBoard('You cannot extend because you are currently a free agent.');
    return;
  }

  if (state.pendingTransfer?.club?.name) {
    showMarketplaceBoard(`You already signed a pre-contract with ${state.pendingTransfer.club.name}.`);
    return;
  }

  if (!state.extensionUi) state.extensionUi = { mode: 'balanced', lastFeedback: '' };
  const mode = getExtensionMode();
  const proposal = buildExtensionProposal(mode);
  if (!proposal) {
    showMarketplaceBoard('Could not prepare your extension offer.');
    return;
  }

  const accepted = Math.random() < proposal.acceptanceChance;
  if (accepted) {
    state.pendingContract = {
      years: proposal.contractYrs,
      releaseClause: proposal.releaseClause,
      salary: proposal.salary,
    };
    state.renewalOffer = null;
    state.renewalContext = null;
    adjustManagerConnection(state.G.club.name, 8);

    const msg = `${state.G.club.name} accepted your proposal: ${proposal.contractYrs} year${proposal.contractYrs !== 1 ? 's' : ''}, ${formatSalary(proposal.salary)}, role ${proposal.requestedRole}. Starts next season.`;
    state.extensionUi.lastFeedback = msg;
    showMarketplaceBoard(msg);
    return;
  }

  const relationshipHit = mode.key === 'starDemand' ? -5 : -2;
  adjustManagerConnection(state.G.club.name, relationshipHit);
  const msg = `${state.G.club.name} declined this proposal. Try again with lower wage and/or reduced playing-time demands.`;
  state.extensionUi.lastFeedback = msg;
  showMarketplaceBoard(msg);
}

export function clearMarketplaceFocus() {
  if (!state.marketUi) return;
  state.marketUi.incomingIndex = null;
  state.marketUi.targetIndex = null;
  showMarketplaceBoard();
}

export function viewMarketplaceIncoming(index) {
  if (!state.marketUi) state.marketUi = { incomingIndex: null, targetIndex: null, applyMode: 'balanced' };
  state.marketUi.incomingIndex = Number.isInteger(index) ? index : null;
  state.marketUi.targetIndex = null;
  showMarketplaceBoard();
}

export function viewMarketplaceTarget(index) {
  if (!state.marketUi) state.marketUi = { incomingIndex: null, targetIndex: null, applyMode: 'balanced' };
  state.marketUi.targetIndex = Number.isInteger(index) ? index : null;
  state.marketUi.incomingIndex = null;
  showMarketplaceBoard();
}

export function applyToMarketClub(index) {
  const marketplaceFrozenReason = getMarketplaceFrozenReason();
  if (marketplaceFrozenReason) {
    showMarketplaceBoard(marketplaceFrozenReason);
    return;
  }

  const board = getMarketplaceBoardForCurrentSeason();
  const renderTargets = getRenderableTargets(board);
  const target = renderTargets?.[index];
  if (!target) return;

  if (!state.marketUi) state.marketUi = { incomingIndex: null, targetIndex: null, applyMode: 'balanced' };
  const mode = getApplyMode();

  if (!target.canApply) {
    showMarketplaceBoard('You already applied to this club and must wait for feedback.');
    return;
  }

  const entry = {
    clubName: target.club.name,
    seasonApplied: state.G.season,
    status: 'pending',
    responseScore: target.responseScore,
    mode: mode.key,
    salaryMultiplier: mode.salaryMultiplier,
    chanceBonus: mode.chanceBonus,
  };

  adjustManagerConnection(target.club.name, mode.relationDelta);

  state.marketApplications.push(entry);
  if (board?.targets?.[index]) {
    board.targets[index].canApply = false;
    board.targets[index].reason = `Application sent in Season ${state.G.season} — waiting response.`;
  }
  state.marketUi.targetIndex = index;
  showMarketplaceBoard(`Interest sent to ${target.club.name} (${mode.label}). Season-end feedback will arrive.`);
}

export function acceptMarketInterest(index) {
  if (isLoanActive()) return null;
  const entry = state.marketBoard?.incoming?.[index];
  if (!entry || !entry.offer) return null;
  return entry.offer;
}

export function resolveMarketplaceFeedbackAtSeasonEnd() {
  if (!Array.isArray(state.marketApplications) || !state.marketApplications.length) return;

  const pending = state.marketApplications.filter(a => a.status === 'pending' && a.seasonApplied < state.G.season);
  if (!pending.length) return;

  const responses = [];
  const ovr = calcOvr();
  const rep = state.G.reputation || 0;

  pending.forEach(app => {
    const club = findClubByName(app.clubName);
    if (!club) {
      app.status = 'rejected';
      responses.push({
        clubName: app.clubName,
        type: 'rejected',
        text: `${app.clubName} could not process your request and moved on.`,
      });
      return;
    }

    const managerConnection = getManagerConnection(club.name);
    const applyMode = APPLICATION_MODES[app.mode] || APPLICATION_MODES.balanced;

    let chance = (app.responseScore || 0.2)
      + (ovr - 72) * 0.01
      + rep * 0.0015
      + (managerConnection - 45) * 0.0032
      + (app.chanceBonus || 0)
      - Math.max(0, state.G.age - 33) * 0.02;
    chance = clamp(chance, 0.04, 0.92);

    const accepted = Math.random() < chance;
    if (!accepted) {
      app.status = 'rejected';
      responses.push({
        clubName: club.name,
        type: 'rejected',
        text: `${club.name} rejected your approach this year. The manager link (${managerConnection}/100) wasn\'t enough — keep improving and try again.`,
      });
      return;
    }

    const moveNow = (state.G.contract?.years || 0) <= 1 || isCurrentClubWillingToSell(club);
    const financeOk = canClubFinanceMove(club, calcMarketValue() * (moveNow ? 1.1 : 0.2), ovr);

    if (!financeOk) {
      app.status = 'hold';
      responses.push({
        clubName: club.name,
        type: 'hold',
        text: `${club.name} liked your profile, but budget limits blocked a move for now.`,
      });
      return;
    }

    const offer = buildClubTerms(club, applyMode);
    app.status = 'offered';
    responses.push({
      clubName: club.name,
      type: moveNow ? 'offer' : 'precontract',
      text: moveNow
        ? `${club.name} accepted your application (${applyMode.label}) and sent an official offer.`
        : `${club.name} accepted your application (${applyMode.label}) but prefers to sign when your contract ends.`,
      offer,
    });
  });

  if (responses.length) {
    state.marketFeedbackQueue = [...(state.marketFeedbackQueue || []), ...responses];
  }
}

export function showNextMarketplaceFeedback() {
  if (isLoanActive()) return false;

  const next = state.marketFeedbackQueue?.[0];
  if (!next) return false;

  const area = document.getElementById('event-area');
  const hasOffer = !!next.offer;
  if (hasOffer) state.transferOffers = [next.offer];

  area.innerHTML = `<div class="event-box ec-gold">
    <div class="event-tag"><div class="event-dot"></div>📬 MARKETPLACE FEEDBACK</div>
    <div class="event-text"><strong>${next.clubName}</strong>: ${next.text}</div>
    ${hasOffer ? `<div class="offer-card-wrap">${renderClubOfferCardHTML(next.offer, 0, false)}</div>` : ''}
    <div class="action-row action-row-space">
      ${hasOffer ? '<button class="btn-accept btn-flex-sm" data-action="accept-market-feedback">🖊️ Accept Offer</button>' : ''}
      <button class="btn-decline btn-flex-sm" data-action="dismiss-market-feedback">Continue</button>
    </div>
  </div>`;

  return true;
}

export function consumeMarketFeedback(acceptOffer = false) {
  if (acceptOffer && isLoanActive()) return null;
  const next = state.marketFeedbackQueue?.shift();
  if (!next) return null;

  if (acceptOffer && next.offer) return next.offer;
  return null;
}

export function buildTransferOffers(forFreeAgency=false) {
  const ovr = calcOvr();
  let numOffers = rng(2,3);
  const offers = [];
  const mv = calcMarketValue();
  const restrictedPostBan = !!state.G.banFreeAgencyLock;

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

  if (forFreeAgency && restrictedPostBan) {
    numOffers = rng(1, 2);
    eligibleTiers = TIERS.slice(Math.max(0, state.G.clubTier - 2), state.G.clubTier + 1).flat();
  }

  eligibleTiers = eligibleTiers
    .filter(c => c.name !== state.G.club.name)
    .filter(c => !isClubBlocked(c.name));
  if (!eligibleTiers.length) return [];

  const marketNeed = forFreeAgency ? mv * 0.2 : mv * 1.1;
  const realisticPool = eligibleTiers.filter(c => canClubFinanceMove(c, marketNeed, ovr));
  if (realisticPool.length) eligibleTiers = realisticPool;

  const minP = Math.min(...eligibleTiers.map(c=>c.prestige));
  const pool = eligibleTiers.map(c=>({...c, weight: Math.max(1, c.prestige - minP + 5)}));

  let attempts = 0;
  while (offers.length < numOffers && pool.length && attempts < 24) {
    attempts++;
    const chosen = weightedPick(pool);
    if (!chosen) break;
    pool.splice(pool.indexOf(chosen), 1);

    if (!canClubFinanceMove(chosen, marketNeed, ovr)) {
      if (Math.random() < 0.12) {
        offers.push(buildClubTerms(chosen));
      }
      continue;
    }

    offers.push(buildClubTerms(chosen));
  }

  return offers;
}

export function renderClubOfferCardHTML(o, idx, isRC) {
  const tierDiff = getTierOfClub(o.club.name) - state.G.clubTier;
  const tierLabel = tierDiff > 0 ? `📈 Step up (Tier ${getTierOfClub(o.club.name)+1})` :
                    tierDiff === 0 ? `➡️ Same level` : `📉 Step down`;
  const salaryStr = o.salary >= 1000000 ? `€${(o.salary/1000000).toFixed(2)}M/wk` : `€${(o.salary/1000).toFixed(0)}K/wk`;
  const connection = typeof o.managerConnection === 'number' ? o.managerConnection : getManagerConnection(o.club.name);
  const playing = o.playingTime || estimatePlayingTime(o.club, connection);

  return `<div class="club-offer-card">
    <div class="coc-league">${o.club.country} ${o.club.league}</div>
    <div class="coc-name">${o.club.name}</div>
    <div class="coc-prestige">${prestige2Stars(o.club.prestige)} &nbsp; ${tierLabel}</div>
    <div class="coc-details">
      <div class="coc-row"><span class="coc-key">Contract</span><span class="coc-val gold">${o.contractYrs} years</span></div>
      <div class="coc-row"><span class="coc-key">Salary</span><span class="coc-val green">${salaryStr}</span></div>
      <div class="coc-row"><span class="coc-key">Release Clause</span><span class="coc-val">${formatM(o.releaseClause)}</span></div>
      <div class="coc-row"><span class="coc-key">Role</span><span class="coc-val">${playing.role}</span></div>
      <div class="coc-row"><span class="coc-key">Minutes</span><span class="coc-val">${playing.minutes}/season</span></div>
      <div class="coc-row"><span class="coc-key">Manager Link</span><span class="coc-val">${connection}/100</span></div>
      <div class="coc-row"><span class="coc-key">Club Prestige</span><span class="coc-val">${o.club.prestige}/100</span></div>
    </div>
    <button class="btn-accept" data-action="${isRC?'accept-rc':'accept-transfer'}" data-index="${idx}">${isRC?'✅ Accept Transfer':'🖊️ Sign Here'}</button>
  </div>`;
}

export function showReleaseClauseEvent(buyingClub) {
  const mv = calcMarketValue();
  const rc = state.G.contract.releaseClause;
  const { minYears, maxYears } = getContractYearRange(state.G.age);
  const contractYrs = rng(Math.max(1, minYears), Math.max(minYears, maxYears));
  const newRC = Math.round(mv * (2.2 + buyingClub.prestige/120) * 10)/10;
  const salary = Math.round(calcSalary(calcOvr(), state.G.age) * (1 + buyingClub.prestige / 200) / 1000) * 1000;
  const managerConnection = getManagerConnection(buyingClub.name);
  const playingTime = estimatePlayingTime(buyingClub, managerConnection);

  const area = document.getElementById('event-area');
  area.innerHTML = `<div class="event-box ec-gold">
    <div class="event-tag"><div class="event-dot"></div>✈️ RELEASE CLAUSE ACTIVATED</div>
    <div class="event-text">
      <strong>${buyingClub.country} ${buyingClub.name}</strong> have triggered your 
      <strong>${formatM(rc)}</strong> release clause. Your current club cannot stop this. 
      Do you want to make the move?
    </div>
    <div class="offer-card-wrap">
      ${renderClubOfferCardHTML({club:buyingClub, contractYrs, releaseClause:newRC, salary, managerConnection, playingTime}, 0, true)}
    </div>
    <button class="btn-decline" data-action="decline-rc">Stay — Force them to keep you (break their deal)</button>
  </div>`;

  state.rcOffer = { club:buyingClub, contractYrs, releaseClause:newRC, salary, managerConnection, playingTime };
}

export function buildRenewalOffer(forFreeAgent=false) {
  if (forFreeAgent && state.G.banFreeAgencyLock) return null;
  if (state.G?.club?.name && isClubBlocked(state.G.club.name)) return null;

  const ovr = calcOvr();

  let chance = forFreeAgent ? 0.5 : 0.42;
  if (state.G.age <= 23) chance += 0.28;
  else if (state.G.age <= 27) chance += 0.18;
  else if (state.G.age >= 34) chance -= 0.12;
  if (state.G.age >= 37) chance -= 0.22;

  if (ovr >= 86) chance += 0.22;
  else if (ovr >= 78) chance += 0.12;
  else if (ovr < 68) chance -= 0.12;
  if (ovr < 60) chance -= 0.18;

  chance += (state.G.club.prestige - 75) / 250;
  if (forFreeAgent && state.G.age >= 36) chance -= 0.1;
  chance = Math.max(0.05, Math.min(0.92, chance));

  if (Math.random() > chance) return null;

  const contractYrs = rollContractYears(state.G.age);
  const releaseClause = Math.round(calcMarketValue() * (2 + state.G.club.prestige/120) * 10)/10;
  const salary = Math.round(calcSalary(ovr, state.G.age) * (1 + state.G.club.prestige / 260) / 1000) * 1000;

  return {
    club: state.G.club,
    contractYrs,
    releaseClause,
    salary,
    forFreeAgent,
  };
}

export function showContractTalk(offer, forFreeAgent=false) {
  const area = document.getElementById('event-area');
  const salaryStr = offer.salary >= 1000000
    ? `€${(offer.salary/1000000).toFixed(2)}M/wk`
    : `€${(offer.salary/1000).toFixed(0)}K/wk`;

  area.innerHTML = `<div class="event-box ec-gold">
    <div class="event-tag"><div class="event-dot"></div>📝 CONTRACT TALKS</div>
    <div class="event-text">${forFreeAgent
      ? `You are a <strong>free agent</strong>, but <strong>${state.G.club.name}</strong> wants you back.`
      : `You are entering your <strong>final contract year</strong>. <strong>${state.G.club.name}</strong> opens renewal talks.`
    }</div>
    <div class="offer-card-wrap">
      <div class="club-offer-card">
        <div class="coc-league">${offer.club.country} ${offer.club.league}</div>
        <div class="coc-name">${offer.club.name}</div>
        <div class="coc-prestige">${prestige2Stars(offer.club.prestige)} &nbsp; Renewal Offer</div>
        <div class="coc-details">
          <div class="coc-row"><span class="coc-key">Contract</span><span class="coc-val gold">${offer.contractYrs} year${offer.contractYrs>1?'s':''}</span></div>
          <div class="coc-row"><span class="coc-key">Salary</span><span class="coc-val green">${salaryStr}</span></div>
          <div class="coc-row"><span class="coc-key">Release Clause</span><span class="coc-val">${formatM(offer.releaseClause)}</span></div>
        </div>
      </div>
    </div>
    <div class="action-row action-row-space">
      <button class="btn-accept btn-flex-sm" data-action="accept-renewal">🖊️ Sign New Deal</button>
      <button class="btn-decline btn-flex-sm" data-action="decline-renewal">${forFreeAgent ? 'Test Free Agency' : 'Delay Talks'}</button>
    </div>
  </div>`;

  state.renewalOffer = offer;
  state.renewalContext = forFreeAgent ? 'free-agent' : 'expiring';
}

export function showFreeAgencyTransfer() {
  const offers = buildTransferOffers(true);
  const ovr = calcOvr();
  const restrictedPostBan = !!state.G.banFreeAgencyLock;

  if (!offers.length) {
    const area = document.getElementById('event-area');
    const msg = state.G.age >= 38
      ? `At ${state.G.age} and OVR ${ovr}, no clubs are willing to take a chance on you right now.`
      : `Despite being available, no clubs have made an offer. Options are limited at your age and rating.`;

    area.innerHTML = `<div class="event-box ec-red">
      <div class="event-tag"><div class="event-dot"></div>🚪 NO OFFERS</div>
      <div class="event-text">${msg}</div>
      <div class="action-row action-row-space">
        <button class="btn-accept btn-flex-sm" data-action="skip-free-agency">⚽ Keep Playing</button>
        <button class="btn-primary btn-flex-sm" data-action="retire">🌅 Retire Now</button>
      </div>
    </div>`;
    return;
  }

  const area = document.getElementById('event-area');
  area.innerHTML = `<div class="event-box ec-green">
    <div class="event-tag"><div class="event-dot"></div>🔓 FREE AGENT — CONTRACT EXPIRED</div>
    <div class="event-text">${restrictedPostBan
      ? `Your suspension is over. You\'re a <strong>free agent</strong>, and only a few clubs are willing to take the risk.`
      : `Your contract has expired. You\'re a <strong>free agent</strong>. ${
      state.G.age >= 36
      ? `At ${state.G.age}, ${offers.length} club${offers.length>1?'s':''} still interested. Final chance to play?`
      : `Multiple clubs are interested — choose your next chapter.`
    }`}</div>
    <div class="transfer-grid">${offers.map((o,i)=>renderClubOfferCardHTML(o,i,false)).join('')}</div>
    <button class="btn-decline" data-action="retire-early">Hang up the boots — retire now</button>
    ${restrictedPostBan ? '' : '<button class="btn-decline" data-action="open-marketplace">📡 Open Marketplace Hub</button>'}
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
    <button class="btn-decline" data-action="open-marketplace">📡 Open Marketplace Hub</button>
  </div>`;
  state.transferOffers = ev.offers;
}
