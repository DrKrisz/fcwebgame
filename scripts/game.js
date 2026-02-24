import { state } from './state.js';
import { getRandomAcademies, TIERS } from './data.js';
import { calcOvrFromStats, calcReleaseClause, calcSalary, rng } from './utils.js';
import { showScreen, renderUI } from './ui.js';
import { nextEvent } from './events.js';

export function init() {
  renderAcademyGrid();
  if (state.academyChoices.length) {
    selectAcademy(state.academyChoices[0].id);
  }

  document.getElementById('inp-name').addEventListener('keypress',e=>{if(e.key==='Enter')startGame();});
}

export function rerollAcademies() {
  renderAcademyGrid();
  if (state.academyChoices.length) {
    selectAcademy(state.academyChoices[0].id);
  }
}

function renderAcademyGrid() {
  state.academyChoices = getRandomAcademies(6);
  const grid = document.getElementById('academy-grid');
  grid.innerHTML = '';
  state.academyChoices.forEach(a => {
    const bonusStr = Object.entries(a.bonus).map(([k,v])=>`${k} +${v}`).join(', ');
    const card = document.createElement('div');
    card.className = 'academy-card';
    card.id = `ac-${a.id}`;
    card.dataset.action = 'select-academy';
    card.dataset.academyId = a.id;
    card.innerHTML = `
      <div class="ac-name">${a.name}</div>
      <div class="ac-club">${a.club}</div>
      <div class="ac-league">${a.league}</div>
      <div class="ac-bonus">+${bonusStr}</div>
      <div class="ac-prestige">Prestige: ${a.prestige}/100</div>`;
    grid.appendChild(card);
  });
}

export function selectAcademy(id) {
  document.querySelectorAll('.academy-card').forEach(c => c.classList.remove('selected'));
  const el = document.getElementById(`ac-${id}`);
  const selected = state.academyChoices.find(a => a.id === id);
  if (!selected) return;
  if (el) el.classList.add('selected');
  state.selectedAcademy = id;
}

const DEFAULT_NAME_POOL = {
  first: ['Alex','Sam','Luca','Noah','Leo','Kai','Milan','Nico','Adrian','Mateo'],
  last: ['Silva','Garcia','Rossi','Kovacs','Santos','Fernandez','Costa','Novak','Muller','Petrov']
};

const COUNTRY_NAME_POOLS = {
  '🇬🇧': { first:['Liam','Noah','Mason','Jack','Harry','Oliver'], last:['Smith','Johnson','Brown','Taylor','Walker','Hughes'] },
  '🇮🇪': { first:['Conor','Seán','Cian','Darragh','Eoin','Ryan'], last:['Murphy','Kelly','OBrien','Byrne','Doyle','Walsh'] },
  '🇪🇸': { first:['Alejandro','Carlos','Diego','Javier','Pablo','Sergio'], last:['Garcia','Fernandez','Lopez','Gonzalez','Martinez','Ruiz'] },
  '🇵🇹': { first:['Joao','Diogo','Tiago','Andre','Ruben','Rafael'], last:['Silva','Santos','Ferreira','Costa','Pereira','Oliveira'] },
  '🇮🇹': { first:['Lorenzo','Matteo','Francesco','Alessandro','Marco','Antonio'], last:['Rossi','Bianchi','Esposito','Romano','Gallo','Conti'] },
  '🇩🇪': { first:['Lukas','Leon','Felix','Jonas','Maximilian','Timo'], last:['Muller','Schmidt','Schneider','Fischer','Weber','Becker'] },
  '🇫🇷': { first:['Kylian','Adrien','Theo','Antoine','Lucas','Yanis'], last:['Martin','Bernard','Dubois','Moreau','Laurent','Leroy'] },
  '🇳🇱': { first:['Daan','Luuk','Thijs','Milan','Sem','Noah'], last:['de Jong','Bakker','Visser','Smit','de Vries','van Dijk'] },
  '🇧🇷': { first:['Gabriel','Vinicius','Rodrigo','Bruno','Caio','Matheus'], last:['Silva','Santos','Souza','Oliveira','Lima','Costa'] },
  '🇦🇷': { first:['Mateo','Tomas','Agustin','Franco','Thiago','Nicolas'], last:['Gonzalez','Rodriguez','Lopez','Diaz','Fernandez','Alvarez'] },
  '🇯🇵': { first:['Haruto','Ren','Yuto','Sota','Kaito','Takumi'], last:['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito'] },
  '🇰🇷': { first:['Min-jun','Seo-jun','Ji-hoon','Hyun-woo','Joon-ho','Dong-hyun'], last:['Kim','Lee','Park','Choi','Jung','Kang'] },
  '🇺🇸': { first:['Ethan','Jacob','Logan','Aiden','Mason','Jayden'], last:['Smith','Johnson','Miller','Davis','Wilson','Moore'] },
  '🇲🇽': { first:['Santiago','Emiliano','Diego','Leonardo','Gael','Mateo'], last:['Hernandez','Garcia','Martinez','Lopez','Gonzalez','Perez'] },
  '🇳🇬': { first:['Chinedu','Tunde','Emeka','Ifeanyi','Femi','Seyi'], last:['Okafor','Adebayo','Ibrahim','Nwosu','Balogun','Ogunleye'] },
  '🇬🇭': { first:['Kwame','Kojo','Kofi','Yaw','Nana','Kwaku'], last:['Mensah','Boateng','Owusu','Asante','Osei','Appiah'] },
  '🇸🇳': { first:['Moussa','Ibrahima','Cheikh','Amadou','Mamadou','Saliou'], last:['Ndiaye','Diop','Sarr','Ba','Niane','Fall'] },
  '🇲🇦': { first:['Youssef','Achraf','Hakim','Amine','Sofyan','Nabil'], last:['El Amrani','Ait Ahmed','Benjelloun','Benkirane','Idrissi','Alaoui'] },
  '🇹🇷': { first:['Arda','Kerem','Emre','Can','Mert','Ozan'], last:['Yilmaz','Kaya','Demir','Sahin','Aydin','Celik'] },
  '🇷🇺': { first:['Ivan','Dmitri','Nikita','Artem','Maksim','Aleksei'], last:['Ivanov','Smirnov','Kuznetsov','Popov','Vasiliev','Sokolov'] },
};

const SOUTH_AMERICA_FLAGS = new Set(['🇺🇾','🇨🇱','🇨🇴','🇵🇪','🇪🇨','🇻🇪','🇵🇾','🇧🇴']);
const AFRICA_FLAGS = new Set(['🇨🇮','🇩🇿','🇹🇳','🇪🇬','🇨🇲','🇿🇦']);
const EUROPE_FLAGS = new Set(['🇧🇪','🇨🇭','🇦🇹','🇸🇪','🇳🇴','🇩🇰','🇫🇮','🇵🇱','🇨🇿','🇸🇰','🇭🇺','🇷🇸','🇭🇷','🇧🇦','🇷🇴','🇧🇬','🇬🇷','🇺🇦']);
const ASIA_FLAGS = new Set(['🇨🇳','🇮🇳','🇮🇷','🇸🇦','🇦🇪','🇶🇦']);
const OCEANIA_FLAGS = new Set(['🇦🇺','🇳🇿']);
const NORTH_AMERICA_FLAGS = new Set(['🇨🇦','🇨🇷','🇵🇦']);

const REGIONAL_NAME_POOLS = {
  southAmerica: { first:['Thiago','Matias','Bruno','Felipe','Nicolas','Agustin'], last:['Gonzalez','Silva','Pereira','Rojas','Suarez','Castro'] },
  africa: { first:['Yaya','Kofi','Samba','Amadou','Ibrahim','Ayo'], last:['Traore','Mensah','Diallo','Konate','Ndiaye','Kamara'] },
  europe: { first:['Luka','Marek','Dominik','Patrik','Milan','Filip'], last:['Novak','Kovacs','Horvath','Popescu','Nagy','Stoicov'] },
  asia: { first:['Ali','Reza','Omar','Hassan','Wei','Arjun'], last:['Kim','Zhang','Singh','Rahimi','Al-Qahtani','Tan'] },
  oceania: { first:['Lachlan','Cooper','Mitchell','Ryan','Noah','Jordan'], last:['Wilson','Taylor','Brown','Anderson','Clark','Scott'] },
  northAmerica: { first:['Liam','Lucas','Mateo','Diego','Evan','Noah'], last:['Smith','Garcia','Hernandez','Miller','Lopez','Campbell'] }
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getNamePoolForCountry(flag) {
  const specificPool = COUNTRY_NAME_POOLS[flag];
  if (specificPool) return specificPool;
  if (SOUTH_AMERICA_FLAGS.has(flag)) return REGIONAL_NAME_POOLS.southAmerica;
  if (AFRICA_FLAGS.has(flag)) return REGIONAL_NAME_POOLS.africa;
  if (EUROPE_FLAGS.has(flag)) return REGIONAL_NAME_POOLS.europe;
  if (ASIA_FLAGS.has(flag)) return REGIONAL_NAME_POOLS.asia;
  if (OCEANIA_FLAGS.has(flag)) return REGIONAL_NAME_POOLS.oceania;
  if (NORTH_AMERICA_FLAGS.has(flag)) return REGIONAL_NAME_POOLS.northAmerica;
  return DEFAULT_NAME_POOL;
}

const SECRET_CAREER_STARTS = [
  {
    triggerName: 'cristiano ronaldo',
    requiredNat: '🇵🇹',
    clubName: 'Real Madrid CF',
    statBoost: 14,
    minSalary: 260000,
    minClause: 220,
    reputation: 30,
    managerConnection: 82,
  },
  {
    triggerName: 'lionel messi',
    requiredNat: '🇦🇷',
    clubName: 'FC Barcelona',
    statBoost: 14,
    minSalary: 260000,
    minClause: 220,
    reputation: 30,
    managerConnection: 82,
  },
];

function normalizeProfileName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getClubByName(clubName) {
  for (let tierIndex = 0; tierIndex < TIERS.length; tierIndex++) {
    const club = TIERS[tierIndex].find((entry) => entry.name === clubName);
    if (club) {
      return {
        club: {
          name: club.name,
          league: club.league,
          country: club.country,
          prestige: club.prestige,
        },
        tier: tierIndex + 1,
      };
    }
  }
  return null;
}

function getSecretCareerStart(name, nat) {
  const normalizedName = normalizeProfileName(name);
  const matched = SECRET_CAREER_STARTS.find((entry) =>
    entry.triggerName === normalizedName && entry.requiredNat === nat,
  );
  if (!matched) return null;

  const starterClub = getClubByName(matched.clubName);
  if (!starterClub) return null;

  return {
    ...matched,
    starterClub,
  };
}

export function randomizeProfile() {
  const positions = ['striker', 'midfielder', 'defender', 'goalkeeper'];
  const natInput = document.getElementById('inp-nat');
  const nationalityOptions = [...natInput.options].map(opt => opt.value).filter(Boolean);
  const randomNat = nationalityOptions.length ? pickRandom(nationalityOptions) : '🇬🇧';
  natInput.value = randomNat;

  const pool = getNamePoolForCountry(randomNat);
  const firstName = pickRandom(pool.first);
  const lastName = pickRandom(pool.last);
  document.getElementById('inp-name').value = `${firstName} ${lastName}`;

  const randomPos = pickRandom(positions);
  document.getElementById('inp-pos').value = randomPos;

  if (!state.academyChoices.length) renderAcademyGrid();
  const randomAcad = pickRandom(state.academyChoices);
  selectAcademy(randomAcad.id);
}

export function startGame() {
  try {
    const name = document.getElementById('inp-name').value.trim();
    const pos  = document.getElementById('inp-pos').value;
    const nat  = document.getElementById('inp-nat').value;
    if (!name) { alert('Please enter your name.'); return; }
    if (!pos)  { alert('Choose a position.'); return; }

    const acad = state.academyChoices.find(a => a.id === state.selectedAcademy);
    if (!acad) { alert('Please select an academy.'); return; }

    const base = {
      striker:    { pace:62, shooting:65, passing:52, dribbling:60, physical:55 },
      midfielder: { pace:58, shooting:55, passing:68, dribbling:62, physical:56 },
      defender:   { pace:60, shooting:45, passing:58, dribbling:50, physical:68 },
      goalkeeper: { pace:60, shooting:58, passing:52, dribbling:63, physical:70 }, // diving, handling, kicking, reflexes, positioning
    }[pos];

    if (!base) { alert('Invalid position selected.'); return; }

    const stats = { ...base };
    Object.entries(acad.bonus).forEach(([k,v]) => stats[k] = Math.min(99, stats[k] + v));
    const prestigeBonus = Math.floor((acad.prestige - 78) / 20);
    if (prestigeBonus > 0) {
      Object.keys(stats).forEach(k => stats[k] = Math.min(99, stats[k] + prestigeBonus));
    }

    const secretCareerStart = getSecretCareerStart(name, nat);
    if (secretCareerStart) {
      Object.keys(stats).forEach((k) => {
        stats[k] = Math.min(98, stats[k] + secretCareerStart.statBoost);
      });
    }

    const startClub = secretCareerStart
      ? { ...secretCareerStart.starterClub.club }
      : { ...acad.sourceClub };
    const startTier = secretCareerStart
      ? secretCareerStart.starterClub.tier
      : Math.max(1, Number(acad.sourceTier) || 1);
    const initialContractYears = secretCareerStart
      ? rng(7, 9)
      : (startClub.prestige >= 86 ? rng(6, 7) : 3);
    const initialOvr = calcOvrFromStats(stats, pos);
    const baseClause = calcReleaseClause(initialOvr, startClub.prestige);
    const baseSalary = calcSalary(initialOvr);
    const initialReleaseClause = secretCareerStart
      ? Math.max(secretCareerStart.minClause, baseClause)
      : baseClause;
    const initialSalary = secretCareerStart
      ? Math.max(secretCareerStart.minSalary, baseSalary)
      : baseSalary;

    state.G = {
      name, pos, nat,
      academy: acad,
      age: 16,
      season: 1,
      stats,
      fitness: 100,
      reputation: secretCareerStart ? secretCareerStart.reputation : 5,
      trophies: [],
      club: startClub,
      clubTier: startTier,
      contract: {
        years: initialContractYears,
        releaseClause: initialReleaseClause,
        salary: initialSalary,
      },
      loan: {
        active: false,
        fromClub: null,
        toClub: null,
        seasonsLeft: 0,
        growthMultiplier: 1.25,
        youthLoanCheckDone: false,
        focus: 'development',
        completionBonus: 0,
      },
      log: [],
      retired: false,
      totalGoals: 0,
      totalAssists: 0,
      totalEarnings: 0,
      seasonsPlayed: 0,
      peakOvr: 0,
      peakClub: startClub.name,
      ballonHistory: [],
      injuryCount: 0,
      dopingBans: 0,
      bannedSeasons: 0,
      bannedFromClubs: [],
      banFreeAgencyLock: false,
      postBanValueRecoverySeasons: 0,
      postLoanSigningBoostSeasons: 0,
      postLoanSigningBoostMultiplier: 1,
      loanRequestCooldownSeason: 1,
      seasonHistory: [],
      nationalCaps: 0,
      nationalGoals: 0,
      nationalTrophies: [],
      managerConnections: {
        [startClub.name]: secretCareerStart ? secretCareerStart.managerConnection : 62,
      },
    };

    state.seasonAction = 1;
    state.seasonActionsTotal = 10;
    state.actionLocked = false;
    state.pendingContract = null;
    state.pendingTransfer = null;
    state.marketBoard = null;
    state.marketApplications = [];
    state.marketFeedbackQueue = [];
    state.marketLastResponseSeason = null;
    state.loanSignOffer = null;
    state.pendingLoanReaction = null;
    state.marketUi = {
      incomingIndex: null,
      targetIndex: null,
      applyMode: 'balanced',
    };
    state.extensionUi = {
      mode: 'balanced',
      lastFeedback: '',
    };

    showScreen('game');
    renderUI();
    nextEvent();
  } catch(err) {
    alert('ERROR: ' + err.message + '\n\nStack: ' + err.stack);
  }
}
