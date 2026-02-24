export const ACADEMIES = [
  { id:'la_masia',   name:'La Masia',    club:'FC Barcelona',        league:'La Liga 🇪🇸',        prestige:97, bonus:{dribbling:4,passing:3},     desc:'Technical perfection. Home of the tiki-taka DNA.' },
  { id:'ajax',       name:'Ajax Academy',club:'AFC Ajax',            league:'Eredivisie 🇳🇱',      prestige:91, bonus:{passing:4,physical:1},       desc:'Total Football philosophy. You\'ll read the game differently.' },
  { id:'man_utd',    name:'Man Utd Acad',club:'Manchester United',   league:'Premier League 🇬🇧',prestige:89, bonus:{physical:3,pace:2},         desc:'The Theatre of Dreams. Grit, heart and winning mentality.' },
  { id:'bvb',        name:'BVB Youth',   club:'Borussia Dortmund',   league:'Bundesliga 🇩🇪',      prestige:86, bonus:{pace:3,shooting:2},           desc:'Famous for explosive young attackers. Speed is religion.' },
  { id:'sporting_cp',name:'Sporting CP', club:'Sporting CP',         league:'Primeira Liga 🇵🇹',   prestige:78, bonus:{dribbling:5,pace:1},           desc:'Birthed Ronaldo, Nani, and countless stars. Skill first.' },
  { id:'chelsea',    name:'Chelsea Acad',club:'Chelsea FC',          league:'Premier League 🇬🇧',prestige:84, bonus:{shooting:3,physical:2},      desc:'Well-funded, competitive. Tactically advanced from day one.' },
];

/* Tiers 1–7 of club pool */
export const TIERS = [
  /* Tier 1 */ [
    { name:'Sunderland AFC',        league:'EFL Championship',   country:'🇬🇧', prestige:34 },
    { name:'Huddersfield Town',     league:'EFL Championship',   country:'🇬🇧', prestige:29 },
    { name:'Vitesse Arnhem',        league:'Eredivisie',         country:'🇳🇱', prestige:43 },
    { name:'FC Nürnberg',           league:'2. Bundesliga',      country:'🇩🇪', prestige:37 },
    { name:'Belenenses SAD',        league:'Primeira Liga',      country:'🇵🇹', prestige:24 },
    { name:'Stade Brestois 29',     league:'Ligue 1',            country:'🇫🇷', prestige:31 },
    { name:'Spezia Calcio',         league:'Serie A',            country:'🇮🇹', prestige:26 },
    { name:'Girona FC',             league:'La Liga',            country:'🇪🇸', prestige:38 },
    { name:'Millwall FC',           league:'EFL Championship',   country:'🇬🇧', prestige:27 },
  ],
  /* Tier 2 */ [
    { name:'Crystal Palace',        league:'Premier League',     country:'🇬🇧', prestige:55 },
    { name:'Brighton & Hove Albion',league:'Premier League',     country:'🇬🇧', prestige:60 },
    { name:'Celta Vigo',            league:'La Liga',            country:'🇪🇸', prestige:52 },
    { name:'Hellas Verona',         league:'Serie A',            country:'🇮🇹', prestige:46 },
    { name:'SC Freiburg',           league:'Bundesliga',         country:'🇩🇪', prestige:57 },
    { name:'Stade de Reims',        league:'Ligue 1',            country:'🇫🇷', prestige:49 },
    { name:'Go Ahead Eagles',       league:'Eredivisie',         country:'🇳🇱', prestige:38 },
    { name:'Famalicão FC',          league:'Primeira Liga',      country:'🇵🇹', prestige:40 },
  ],
  /* Tier 3 */ [
    { name:'West Ham United',       league:'Premier League',     country:'🇬🇧', prestige:67 },
    { name:'Aston Villa',           league:'Premier League',     country:'🇬🇧', prestige:70 },
    { name:'Villarreal CF',         league:'La Liga',            country:'🇪🇸', prestige:65 },
    { name:'Atalanta BC',           league:'Serie A',            country:'🇮🇹', prestige:73 },
    { name:'Bayer Leverkusen',      league:'Bundesliga',         country:'🇩🇪', prestige:75 },
    { name:'Olympique Lyonnais',    league:'Ligue 1',            country:'🇫🇷', prestige:71 },
    { name:'FC Porto',              league:'Primeira Liga',      country:'🇵🇹', prestige:76 },
    { name:'PSV Eindhoven',         league:'Eredivisie',         country:'🇳🇱', prestige:73 },
  ],
  /* Tier 4 */ [
    { name:'Tottenham Hotspur',     league:'Premier League',     country:'🇬🇧', prestige:79 },
    { name:'Newcastle United',      league:'Premier League',     country:'🇬🇧', prestige:77 },
    { name:'Real Sociedad',         league:'La Liga',            country:'🇪🇸', prestige:72 },
    { name:'Juventus FC',           league:'Serie A',            country:'🇮🇹', prestige:84 },
    { name:'Borussia Dortmund',     league:'Bundesliga',         country:'🇩🇪', prestige:82 },
    { name:'Paris Saint-Germain',   league:'Ligue 1',            country:'🇫🇷', prestige:90 },
    { name:'SL Benfica',            league:'Primeira Liga',      country:'🇵🇹', prestige:79 },
    { name:'Ajax',                  league:'Eredivisie',         country:'🇳🇱', prestige:83 },
  ],
  /* Tier 5 */ [
    { name:'Arsenal FC',            league:'Premier League',     country:'🇬🇧', prestige:86 },
    { name:'Liverpool FC',          league:'Premier League',     country:'🇬🇧', prestige:92 },
    { name:'Atlético de Madrid',    league:'La Liga',            country:'🇪🇸', prestige:87 },
    { name:'AC Milan',              league:'Serie A',            country:'🇮🇹', prestige:88 },
    { name:'Inter Milan',           league:'Serie A',            country:'🇮🇹', prestige:87 },
    { name:'RB Leipzig',            league:'Bundesliga',         country:'🇩🇪', prestige:78 },
    { name:'Olympique de Marseille',league:'Ligue 1',            country:'🇫🇷', prestige:74 },
    { name:'Sporting CP',           league:'Primeira Liga',      country:'🇵🇹', prestige:79 },
  ],
  /* Tier 6 */ [
    { name:'Chelsea FC',            league:'Premier League',     country:'🇬🇧', prestige:89 },
    { name:'Manchester United',     league:'Premier League',     country:'🇬🇧', prestige:88 },
    { name:'Real Madrid CF',        league:'La Liga',            country:'🇪🇸', prestige:99 },
    { name:'FC Barcelona',          league:'La Liga',            country:'🇪🇸', prestige:97 },
    { name:'FC Bayern München',     league:'Bundesliga',         country:'🇩🇪', prestige:96 },
  ],
  /* Tier 7 */ [
    { name:'Manchester City FC',    league:'Premier League',     country:'🇬🇧', prestige:98 },
    { name:'Real Madrid CF',        league:'La Liga',            country:'🇪🇸', prestige:99 },
    { name:'FC Barcelona',          league:'La Liga',            country:'🇪🇸', prestige:97 },
    { name:'FC Bayern München',     league:'Bundesliga',         country:'🇩🇪', prestige:96 },
  ],
];

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
  'Serie A': 'Coppa Italia',
  'Bundesliga': 'DFB-Pokal',
  '2. Bundesliga': 'DFB-Pokal',
  'Ligue 1': 'Coupe de France',
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
