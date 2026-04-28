export const golfers = [
  { id: '1', name: 'JARED', handicap: 0 },
  { id: '2', name: 'FRED', handicap: 0 },
  { id: '3', name: 'MIKE', handicap: 0 },
  { id: '4', name: 'TODD', handicap: 0 },
];

export const courses = [
  { id: 'mcc', name: 'Montgomery Country Club', par: 72 }
];

export const tournamentSettings = {
  name: "Blitz Board Tournament",
  date: new Date().toLocaleDateString(),
};

// Satisfies the Teams page
export const BLITZ_TEAMS = [
  { id: 't1', name: 'TEAM 1', playerIds: ['1', '2'] },
  { id: 't2', name: 'TEAM 2', playerIds: ['3', '4'] },
];

// Safety exports in case other pages are crashing the build
export const PLAYERS = golfers;
export const MATCHUPS = [];
export const TEAM_BETS = [];
