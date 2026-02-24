const ACADEMY_BONUS_TEMPLATES = [
  {
    bonus: { dribbling: 2, passing: 2 },
    desc: 'Technical school focused on first touch and ball control.',
  },
  {
    bonus: { passing: 2, physical: 2 },
    desc: 'Structured development with strong tactical habits.',
  },
  {
    bonus: { pace: 2, shooting: 2 },
    desc: 'Direct attacking profile built on speed and finishing.',
  },
  {
    bonus: { physical: 3, passing: 1 },
    desc: 'High-intensity academy built around duels and discipline.',
  },
  {
    bonus: { pace: 1, dribbling: 3 },
    desc: 'Expressive style that rewards flair and one-vs-one skill.',
  },
  {
    bonus: { shooting: 2, passing: 2 },
    desc: 'Balanced final-third training with decision-making focus.',
  },
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cloneClub(club) {
  return {
    name: club.name,
    league: club.league,
    country: club.country,
    prestige: club.prestige,
  };
}

function applyPrestigeBonus(baseBonus, prestige) {
  const bonus = { ...baseBonus };
  if (prestige >= 85) {
    const entries = Object.entries(bonus).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      const [topStat] = entries[0];
      bonus[topStat] += 1;
    }
  }
  return bonus;
}

function buildAcademyFromClub(club, tierIndex) {
  const fingerprint = `${club.name}:${club.league}:${club.country}`;
  const template = ACADEMY_BONUS_TEMPLATES[hashString(fingerprint) % ACADEMY_BONUS_TEMPLATES.length];
  return {
    id: `academy_${slugify(club.name)}`,
    name: `${club.name} Academy`,
    club: club.name,
    league: `${club.country} ${club.league}`,
    prestige: club.prestige,
    bonus: applyPrestigeBonus(template.bonus, club.prestige),
    desc: template.desc,
    sourceClub: cloneClub(club),
    sourceTier: tierIndex + 1,
  };
}

function shuffle(array) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* Tiers 1–7 of club pool */
export const TIERS = [
  /* Tier 1 */ [
    { name:'Sunderland AFC',        league:'EFL Championship',   country:'🇬🇧', prestige:35 },
    { name:'Sheffield United',      league:'EFL Championship',   country:'🇬🇧', prestige:42 },
    { name:'Hertha BSC',            league:'2. Bundesliga',      country:'🇩🇪', prestige:41 },
    { name:'Hannover 96',           league:'2. Bundesliga',      country:'🇩🇪', prestige:36 },
    { name:'Palermo FC',            league:'Serie B',            country:'🇮🇹', prestige:39 },
    { name:'Bari',                  league:'Serie B',            country:'🇮🇹', prestige:35 },
    { name:'Real Zaragoza',         league:'Segunda División',   country:'🇪🇸', prestige:38 },
    { name:'Sporting Gijón',        league:'Segunda División',   country:'🇪🇸', prestige:36 },
    { name:'FC Metz',               league:'Ligue 2',            country:'🇫🇷', prestige:40 },
    { name:'SM Caen',               league:'Ligue 2',            country:'🇫🇷', prestige:32 },
    { name:'RCD Espanyol',          league:'La Liga',            country:'🇪🇸', prestige:46 },
    { name:'CD Leganés',            league:'La Liga',            country:'🇪🇸', prestige:42 },
    { name:'Real Valladolid',       league:'La Liga',            country:'🇪🇸', prestige:43 },
    { name:'Venezia FC',            league:'Serie A',            country:'🇮🇹', prestige:42 },
    { name:'Parma Calcio 1913',     league:'Serie A',            country:'🇮🇹', prestige:49 },
    { name:'FC St. Pauli',          league:'Bundesliga',         country:'🇩🇪', prestige:47 },
    { name:'Holstein Kiel',         league:'Bundesliga',         country:'🇩🇪', prestige:40 },
    { name:'Angers SCO',            league:'Ligue 1',            country:'🇫🇷', prestige:44 },
    { name:'AJ Auxerre',            league:'Ligue 1',            country:'🇫🇷', prestige:45 },
    { name:'Le Havre AC',           league:'Ligue 1',            country:'🇫🇷', prestige:44 },
  ],
  /* Tier 2 */ [
    { name:'Leeds United',          league:'EFL Championship',   country:'🇬🇧', prestige:49 },
    { name:'Burnley FC',            league:'EFL Championship',   country:'🇬🇧', prestige:46 },
    { name:'Hamburger SV',          league:'2. Bundesliga',      country:'🇩🇪', prestige:50 },
    { name:'FC Schalke 04',         league:'2. Bundesliga',      country:'🇩🇪', prestige:48 },
    { name:'Sampdoria',             league:'Serie B',            country:'🇮🇹', prestige:47 },
    { name:'US Cremonese',          league:'Serie B',            country:'🇮🇹', prestige:43 },
    { name:'Real Oviedo',           league:'Segunda División',   country:'🇪🇸', prestige:40 },
    { name:'Deportivo La Coruña',   league:'Segunda División',   country:'🇪🇸', prestige:44 },
    { name:'Paris FC',              league:'Ligue 2',            country:'🇫🇷', prestige:35 },
    { name:'AC Ajaccio',            league:'Ligue 2',            country:'🇫🇷', prestige:34 },
    { name:'Ipswich Town',          league:'Premier League',     country:'🇬🇧', prestige:51 },
    { name:'Leicester City',        league:'Premier League',     country:'🇬🇧', prestige:57 },
    { name:'Southampton FC',        league:'Premier League',     country:'🇬🇧', prestige:54 },
    { name:'Getafe CF',             league:'La Liga',            country:'🇪🇸', prestige:54 },
    { name:'Deportivo Alavés',      league:'La Liga',            country:'🇪🇸', prestige:53 },
    { name:'CA Osasuna',            league:'La Liga',            country:'🇪🇸', prestige:56 },
    { name:'Empoli FC',             league:'Serie A',            country:'🇮🇹', prestige:50 },
    { name:'US Lecce',              league:'Serie A',            country:'🇮🇹', prestige:51 },
    { name:'Cagliari Calcio',       league:'Serie A',            country:'🇮🇹', prestige:54 },
    { name:'VfL Bochum',            league:'Bundesliga',         country:'🇩🇪', prestige:52 },
  ],
  /* Tier 3 */ [
    { name:'1. FC Heidenheim',      league:'Bundesliga',         country:'🇩🇪', prestige:55 },
    { name:'FC Augsburg',           league:'Bundesliga',         country:'🇩🇪', prestige:57 },
    { name:'TSG Hoffenheim',        league:'Bundesliga',         country:'🇩🇪', prestige:59 },
    { name:'Mainz 05',              league:'Bundesliga',         country:'🇩🇪', prestige:60 },
    { name:'VfL Wolfsburg',         league:'Bundesliga',         country:'🇩🇪', prestige:63 },
    { name:'Montpellier HSC',       league:'Ligue 1',            country:'🇫🇷', prestige:56 },
    { name:'FC Nantes',             league:'Ligue 1',            country:'🇫🇷', prestige:59 },
    { name:'Toulouse FC',           league:'Ligue 1',            country:'🇫🇷', prestige:60 },
    { name:'Stade de Reims',        league:'Ligue 1',            country:'🇫🇷', prestige:60 },
    { name:'RC Strasbourg',         league:'Ligue 1',            country:'🇫🇷', prestige:62 },
    { name:'Wolverhampton Wanderers', league:'Premier League',   country:'🇬🇧', prestige:62 },
    { name:'AFC Bournemouth',       league:'Premier League',     country:'🇬🇧', prestige:63 },
    { name:'Fulham FC',             league:'Premier League',     country:'🇬🇧', prestige:64 },
    { name:'Everton FC',            league:'Premier League',     country:'🇬🇧', prestige:68 },
    { name:'UD Las Palmas',         league:'La Liga',            country:'🇪🇸', prestige:58 },
    { name:'Rayo Vallecano',        league:'La Liga',            country:'🇪🇸', prestige:59 },
    { name:'RCD Mallorca',          league:'La Liga',            country:'🇪🇸', prestige:60 },
    { name:'Celta Vigo',            league:'La Liga',            country:'🇪🇸', prestige:63 },
    { name:'Hellas Verona',         league:'Serie A',            country:'🇮🇹', prestige:58 },
    { name:'Genoa CFC',             league:'Serie A',            country:'🇮🇹', prestige:64 },
    { name:'Udinese Calcio',        league:'Serie A',            country:'🇮🇹', prestige:60 },
  ],
  /* Tier 4 */ [
    { name:'West Bromwich Albion',  league:'EFL Championship',   country:'🇬🇧', prestige:45 },
    { name:'Norwich City',          league:'EFL Championship',   country:'🇬🇧', prestige:47 },
    { name:'Middlesbrough FC',      league:'EFL Championship',   country:'🇬🇧', prestige:43 },
    { name:'Coventry City',         league:'EFL Championship',   country:'🇬🇧', prestige:42 },
    { name:'Brentford FC',          league:'Premier League',     country:'🇬🇧', prestige:68 },
    { name:'Crystal Palace',        league:'Premier League',     country:'🇬🇧', prestige:69 },
    { name:'Nottingham Forest',     league:'Premier League',     country:'🇬🇧', prestige:70 },
    { name:'Brighton & Hove Albion',league:'Premier League',     country:'🇬🇧', prestige:72 },
    { name:'Girona FC',             league:'La Liga',            country:'🇪🇸', prestige:66 },
    { name:'Sevilla FC',            league:'La Liga',            country:'🇪🇸', prestige:70 },
    { name:'Valencia CF',           league:'La Liga',            country:'🇪🇸', prestige:72 },
    { name:'Real Betis',            league:'La Liga',            country:'🇪🇸', prestige:74 },
    { name:'Torino FC',             league:'Serie A',            country:'🇮🇹', prestige:67 },
    { name:'Bologna FC 1909',       league:'Serie A',            country:'🇮🇹', prestige:72 },
    { name:'AC Monza',              league:'Serie A',            country:'🇮🇹', prestige:62 },
    { name:'Como 1907',             league:'Serie A',            country:'🇮🇹', prestige:57 },
    { name:'Werder Bremen',         league:'Bundesliga',         country:'🇩🇪', prestige:66 },
    { name:'Borussia Mönchengladbach', league:'Bundesliga',      country:'🇩🇪', prestige:69 },
    { name:'Union Berlin',          league:'Bundesliga',         country:'🇩🇪', prestige:68 },
    { name:'1. FC Nürnberg',        league:'2. Bundesliga',      country:'🇩🇪', prestige:37 },
  ],
  /* Tier 5 */ [
    { name:'Olympique de Marseille',league:'Ligue 1',            country:'🇫🇷', prestige:79 },
    { name:'Olympique Lyonnais',    league:'Ligue 1',            country:'🇫🇷', prestige:77 },
    { name:'AS Monaco',             league:'Ligue 1',            country:'🇫🇷', prestige:80 },
    { name:'Stade Rennais FC',      league:'Ligue 1',            country:'🇫🇷', prestige:74 },
    { name:'OGC Nice',              league:'Ligue 1',            country:'🇫🇷', prestige:76 },
    { name:'LOSC Lille',            league:'Ligue 1',            country:'🇫🇷', prestige:78 },
    { name:'RC Lens',               league:'Ligue 1',            country:'🇫🇷', prestige:75 },
    { name:'Stade Brestois 29',     league:'Ligue 1',            country:'🇫🇷', prestige:72 },
    { name:'AS Saint-Étienne',      league:'Ligue 1',            country:'🇫🇷', prestige:68 },
    { name:'SC Freiburg',           league:'Bundesliga',         country:'🇩🇪', prestige:72 },
    { name:'Eintracht Frankfurt',   league:'Bundesliga',         country:'🇩🇪', prestige:76 },
    { name:'VfB Stuttgart',         league:'Bundesliga',         country:'🇩🇪', prestige:77 },
    { name:'Aston Villa',           league:'Premier League',     country:'🇬🇧', prestige:79 },
    { name:'West Ham United',       league:'Premier League',     country:'🇬🇧', prestige:76 },
    { name:'Villarreal CF',         league:'La Liga',            country:'🇪🇸', prestige:78 },
    { name:'Athletic Club',         league:'La Liga',            country:'🇪🇸', prestige:80 },
    { name:'Real Sociedad',         league:'La Liga',            country:'🇪🇸', prestige:79 },
    { name:'ACF Fiorentina',        league:'Serie A',            country:'🇮🇹', prestige:75 },
    { name:'Lazio',                 league:'Serie A',            country:'🇮🇹', prestige:78 },
    { name:'Atalanta BC',           league:'Serie A',            country:'🇮🇹', prestige:81 },
  ],
  /* Tier 6 */ [
    { name:'Tottenham Hotspur',     league:'Premier League',     country:'🇬🇧', prestige:83 },
    { name:'Newcastle United',      league:'Premier League',     country:'🇬🇧', prestige:84 },
    { name:'Chelsea FC',            league:'Premier League',     country:'🇬🇧', prestige:86 },
    { name:'Manchester United',     league:'Premier League',     country:'🇬🇧', prestige:87 },
    { name:'AS Roma',               league:'Serie A',            country:'🇮🇹', prestige:82 },
    { name:'SSC Napoli',            league:'Serie A',            country:'🇮🇹', prestige:84 },
    { name:'Juventus FC',           league:'Serie A',            country:'🇮🇹', prestige:89 },
    { name:'RB Leipzig',            league:'Bundesliga',         country:'🇩🇪', prestige:82 },
    { name:'Borussia Dortmund',     league:'Bundesliga',         country:'🇩🇪', prestige:88 },
    { name:'Bayer Leverkusen',      league:'Bundesliga',         country:'🇩🇪', prestige:90 },
    { name:'Atlético de Madrid',    league:'La Liga',            country:'🇪🇸', prestige:90 },
    { name:'Paris Saint-Germain',   league:'Ligue 1',            country:'🇫🇷', prestige:93 },
  ],
  /* Tier 7 */ [
    { name:'Arsenal FC',            league:'Premier League',     country:'🇬🇧', prestige:93 },
    { name:'Liverpool FC',          league:'Premier League',     country:'🇬🇧', prestige:96 },
    { name:'Manchester City FC',    league:'Premier League',     country:'🇬🇧', prestige:99 },
    { name:'Real Madrid CF',        league:'La Liga',            country:'🇪🇸', prestige:99 },
    { name:'FC Barcelona',          league:'La Liga',            country:'🇪🇸', prestige:97 },
    { name:'Inter Milan',           league:'Serie A',            country:'🇮🇹', prestige:94 },
    { name:'AC Milan',              league:'Serie A',            country:'🇮🇹', prestige:92 },
    { name:'FC Bayern München',     league:'Bundesliga',         country:'🇩🇪', prestige:97 },
  ],
];

export function getAcademyClubDatabase() {
  const byClubName = new Map();

  TIERS.forEach((tierClubs, tierIndex) => {
    tierClubs.forEach((club) => {
      const existing = byClubName.get(club.name);
      if (!existing || club.prestige > existing.prestige) {
        byClubName.set(club.name, { ...cloneClub(club), tierIndex });
      }
    });
  });

  return [...byClubName.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((club) => ({
      name: club.name,
      league: club.league,
      country: club.country,
      prestige: club.prestige,
      tierIndex: club.tierIndex,
    }));
}

export function getRandomAcademies(count = 6) {
  const db = getAcademyClubDatabase();
  if (!db.length) return [];

  return shuffle(db)
    .slice(0, Math.max(1, count))
    .map((club) => buildAcademyFromClub(club, club.tierIndex));
}

export const OVR_THRESHOLDS = [0, 60, 67, 74, 80, 85, 90];

export const TROPHY_NAMES = {
  league_low:'Lower League Title', league_mid:'League Title', league_top:'Premier League / La Liga Title',
  cup:'Domestic Cup',champions:'UEFA Champions League',poty:'Player of the Year',
  golden_boot:'Golden Boot',clean_sheet:'Clean Sheet Master',ballon:'Ballon d\'Or',
};

const DOMESTIC_CUP_BY_LEAGUE = {
  'Premier League': 'FA Cup',
  'EFL Championship': 'FA Cup',
  'La Liga': 'Copa del Rey',
  'Segunda División': 'Copa del Rey',
  'Serie A': 'Coppa Italia',
  'Serie B': 'Coppa Italia',
  'Bundesliga': 'DFB-Pokal',
  '2. Bundesliga': 'DFB-Pokal',
  'Ligue 1': 'Coupe de France',
  'Ligue 2': 'Coupe de France',
  'Eredivisie': 'KNVB Cup',
  'Primeira Liga': 'Taça de Portugal',
};

export function getDomesticCupName(league) {
  return DOMESTIC_CUP_BY_LEAGUE[league] || 'Domestic Cup';
}

export function getTrophyName(trophyKey) {
  if (typeof trophyKey !== 'string') return 'Unknown Trophy';
  if (trophyKey.startsWith('preseason:')) {
    const parts = trophyKey.slice('preseason:'.length).split(':S');
    const cupName = parts[0];
    return cupName || 'Preseason Cup';
  }
  if (trophyKey.startsWith('league:')) {
    const league = trophyKey.slice('league:'.length);
    return league ? `${league} Title` : 'League Title';
  }
  if (trophyKey.startsWith('cup:')) {
    const cup = trophyKey.slice('cup:'.length);
    return cup || 'Domestic Cup';
  }
  return TROPHY_NAMES[trophyKey] || trophyKey;
}

export function extractPreseasonTrophyInfo(trophyKey) {
  if (!trophyKey.startsWith('preseason:')) return null;
  const parts = trophyKey.slice('preseason:'.length).split(':S');
  return { cupName: parts[0], season: parseInt(parts[1]) || 0 };
}

export const STAT_META = {
  pace:      { color:'#60a5fa', icon:'⚡' },
  shooting:  { color:'#f87171', icon:'🎯' },
  passing:   { color:'#a78bfa', icon:'🔄' },
  dribbling: { color:'#fb923c', icon:'🕺' },
  physical:  { color:'#4ade80', icon:'💪' },
};

export const GK_STAT_META = {
  pace:      { color:'#60a5fa', icon:'🧤', label:'diving' },
  shooting:  { color:'#f87171', icon:'✋', label:'handling' },
  passing:   { color:'#a78bfa', icon:'🦶', label:'kicking' },
  dribbling: { color:'#fb923c', icon:'⚡', label:'reflexes' },
  physical:  { color:'#4ade80', icon:'📍', label:'positioning' },
};

export const PHASES = [
  { minAge:0,  icon:'🌱', text:'Youth Academy — The World Is Waiting' },
  { minAge:18, icon:'🔥', text:'Breaking Through — Prove Yourself' },
  { minAge:21, icon:'⭐', text:'Rising Star — Eyes Are On You' },
  { minAge:24, icon:'👑', text:'Peak Years — This Is Your Time' },
  { minAge:30, icon:'🎯', text:'Experienced Pro — Fight For Every Season' },
  { minAge:33, icon:'🌅', text:'Twilight Years — Leave A Legacy' },
];

export const NATIONAL_TEAM_PROFILES = {
  '🇬🇧': { name:'England', tier:'elite', minOvr:84 },
  '🇪🇸': { name:'Spain', tier:'elite', minOvr:84 },
  '🇫🇷': { name:'France', tier:'elite', minOvr:85 },
  '🇩🇪': { name:'Germany', tier:'elite', minOvr:83 },
  '🇧🇷': { name:'Brazil', tier:'elite', minOvr:86 },
  '🇦🇷': { name:'Argentina', tier:'elite', minOvr:85 },
  '🇮🇹': { name:'Italy', tier:'strong', minOvr:81 },
  '🇵🇹': { name:'Portugal', tier:'strong', minOvr:80 },
  '🇳🇱': { name:'Netherlands', tier:'strong', minOvr:80 },
  '🇧🇪': { name:'Belgium', tier:'strong', minOvr:79 },
  '🇭🇷': { name:'Croatia', tier:'strong', minOvr:78 },
  '🇺🇾': { name:'Uruguay', tier:'strong', minOvr:78 },
  '🇨🇴': { name:'Colombia', tier:'strong', minOvr:77 },
  '🇨🇭': { name:'Switzerland', tier:'mid', minOvr:75 },
  '🇸🇪': { name:'Sweden', tier:'mid', minOvr:74 },
  '🇩🇰': { name:'Denmark', tier:'mid', minOvr:75 },
  '🇷🇸': { name:'Serbia', tier:'mid', minOvr:74 },
  '🇲🇦': { name:'Morocco', tier:'mid', minOvr:75 },
  '🇯🇵': { name:'Japan', tier:'mid', minOvr:74 },
  '🇰🇷': { name:'South Korea', tier:'mid', minOvr:74 },
  '🇺🇸': { name:'USA', tier:'mid', minOvr:73 },
  '🇲🇽': { name:'Mexico', tier:'mid', minOvr:74 },
  '🇳🇴': { name:'Norway', tier:'mid', minOvr:73 },
  '🇨🇱': { name:'Chile', tier:'mid', minOvr:73 },
  '🇵🇱': { name:'Poland', tier:'mid', minOvr:73 },
  '🇭🇺': { name:'Hungary', tier:'rising', minOvr:69 },
  '🇷🇴': { name:'Romania', tier:'rising', minOvr:68 },
  '🇬🇷': { name:'Greece', tier:'rising', minOvr:68 },
  '🇨🇿': { name:'Czech Republic', tier:'rising', minOvr:69 },
  '🇸🇰': { name:'Slovakia', tier:'rising', minOvr:67 },
  '🇦🇹': { name:'Austria', tier:'rising', minOvr:70 },
  '🇮🇪': { name:'Ireland', tier:'rising', minOvr:67 },
  '🇹🇷': { name:'Turkey', tier:'rising', minOvr:71 },
  '🇵🇪': { name:'Peru', tier:'rising', minOvr:68 },
  '🇪🇨': { name:'Ecuador', tier:'rising', minOvr:69 },
  '🇵🇾': { name:'Paraguay', tier:'rising', minOvr:68 },
  '🇳🇬': { name:'Nigeria', tier:'rising', minOvr:71 },
  '🇸🇳': { name:'Senegal', tier:'rising', minOvr:72 },
  '🇬🇭': { name:'Ghana', tier:'rising', minOvr:69 },
};

export function getNationalTeamProfile(flag) {
  return NATIONAL_TEAM_PROFILES[flag] || { name:'National Team', tier:'developing', minOvr:66 };
}
