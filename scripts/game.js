import { state } from './state.js';
import { ACADEMIES, TIERS } from './data.js';
import { calcOvrFromStats, calcReleaseClause, calcSalary } from './utils.js';
import { showScreen, renderUI } from './ui.js';
import { nextEvent } from './events.js';

export function init() {
  renderAcademyGrid();
  selectAcademy('bvb');

  document.getElementById('inp-name').addEventListener('keypress',e=>{if(e.key==='Enter')startGame();});
}

function renderAcademyGrid() {
  const grid = document.getElementById('academy-grid');
  grid.innerHTML = '';
  ACADEMIES.forEach(a => {
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
  if (el) el.classList.add('selected');
  state.selectedAcademy = id;
}

export function randomizeProfile() {
  const firstNames = ['Liam','Noah','Ethan','Marcus','Lucas','Gabriel','Alexander','Diego','Carlos','Miguel','Paulo','André','Juan','David','Luis','João','Francesco','Antonio','Marco','Sergio','Matteo','Alessandro','Cristian','Adrian','Stefan','Andrei','Vlad','Gennady','Igor','Dimitri','Alexei','Jürgen','Klaus','Sebastian','Markus','Felix','Nils','Pierre','Laurent','Thierry','Benoit','Antonin','Kylian','Karim','Yannick','Edson','Pelé','Vinicius','Rodrygo','Ronaldinho','Ronaldo','Paulo','Caio','Ramos','Oscar','Jack','Kyle','Mason','Tyler','Hunter'];
  const lastNames = ['Johnson','Smith','Garcia','Martinez','Gonzalez','Rodriguez','Silva','Santos','Costa','Oliveira','Fernandes','Neumann','Mueller','Schneider','Hoffmann','Schroeder','Meier','Rossi','Bianchi','Ferrari','Gallo','Moretti','Colombo','Fontana','Barbieri','Rizzo','Conti','Bruno','Fonseca','Teixeira','Sousa','Rocha','Lopes','Carvalho','Farias','Ribeiro','Trimboli','Di Napoli','Conte','Rizzo','Zappa','Müller','König','Lehmann','Bernd','Kraft','Weise','Arndt'];
  const positions = ['striker', 'midfielder', 'defender', 'goalkeeper'];
  const nationalities = [
    { flag: '🏴', val: '🏴' },
    { flag: '🇪🇸', val: '🇪🇸' },
    { flag: '🇧🇷', val: '🇧🇷' },
    { flag: '🇩🇪', val: '🇩🇪' },
    { flag: '🇦🇷', val: '🇦🇷' },
    { flag: '🇫🇷', val: '🇫🇷' },
    { flag: '🇵🇹', val: '🇵🇹' },
    { flag: '🇳🇱', val: '🇳🇱' }
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  document.getElementById('inp-name').value = `${firstName} ${lastName}`;

  const randomPos = positions[Math.floor(Math.random() * positions.length)];
  document.getElementById('inp-pos').value = randomPos;

  const randomNat = nationalities[Math.floor(Math.random() * nationalities.length)];
  document.getElementById('inp-nat').value = randomNat.val;

  const randomAcad = ACADEMIES[Math.floor(Math.random() * ACADEMIES.length)];
  selectAcademy(randomAcad.id);
}

export function startGame() {
  try {
    const name = document.getElementById('inp-name').value.trim();
    const pos  = document.getElementById('inp-pos').value;
    const nat  = document.getElementById('inp-nat').value;
    if (!name) { alert('Please enter your name.'); return; }
    if (!pos)  { alert('Choose a position.'); return; }

    const acad = ACADEMIES.find(a => a.id === state.selectedAcademy);
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

    const tier1 = [...TIERS[0]];
    const startClub = tier1[Math.floor(Math.random() * tier1.length)];

    state.G = {
      name, pos, nat,
      academy: acad,
      age: 16,
      season: 1,
      stats,
      fitness: 100,
      reputation: 5,
      trophies: [],
      club: startClub,
      clubTier: 1,
      contract: {
        years: 3,
        releaseClause: calcReleaseClause(calcOvrFromStats(stats, pos), startClub.prestige),
        salary: calcSalary(calcOvrFromStats(stats, pos)),
      },
      log: [],
      retired: false,
      totalGoals: 0,
      totalAssists: 0,
      seasonsPlayed: 0,
      peakOvr: 0,
      peakClub: startClub.name,
      ballonHistory: [],
      injuryCount: 0,
      dopingBans: 0,
      bannedSeasons: 0,
      seasonHistory: [],
    };

    showScreen('game');
    renderUI();
    nextEvent();
  } catch(err) {
    alert('ERROR: ' + err.message + '\n\nStack: ' + err.stack);
  }
}
