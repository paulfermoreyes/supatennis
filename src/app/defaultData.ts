import { Player, MatchFormat, ScheduledMatch } from './types';

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'John Smith', gender: 'Male', class: 'B' },
  { id: 'p2', name: 'David Lee', gender: 'Male', class: 'B' },
  { id: 'p3', name: 'Sarah Connor', gender: 'Female', class: 'B' },
  { id: 'p4', name: 'Mike Miller', gender: 'Male', class: 'C' },
  { id: 'p5', name: 'Robert Chen', gender: 'Male', class: 'C' },
  { id: 'p6', name: 'Emily Davis', gender: 'Female', class: 'B' },
  { id: 'p7', name: 'Lisa Wong', gender: 'Female', class: 'C' },
];

export const DEFAULT_MATCH_FORMATS: MatchFormat[] = [
  {
    id: 'club-custom',
    name: 'Club Custom (2S / 4D)',
    description: 'Wimbledon-style team encounter with 2 Singles and 4 Doubles matches (Class B & C, Mixed).',
    lines: [
      { id: 'c-line1', name: 'Class B Male Singles #1', type: 'Singles', genderReq: 'Male', classReq: 'B' },
      { id: 'c-line2', name: 'Class B Female Singles', type: 'Singles', genderReq: 'Female', classReq: 'B' },
      { id: 'c-line3', name: 'Class B Male Doubles', type: 'Doubles', genderReq: 'Male', classReq: 'B' },
      { id: 'c-line4', name: 'Class C Male Doubles', type: 'Doubles', genderReq: 'Male', classReq: 'C' },
      { id: 'c-line5', name: 'Mixed Doubles #1 (Class B)', type: 'Doubles', genderReq: 'Mixed', classReq: 'B' },
      { id: 'c-line6', name: 'Mixed Doubles #2 (Class C)', type: 'Doubles', genderReq: 'Mixed', classReq: 'C' },
    ]
  },
  {
    id: 'usta-18-standard',
    name: 'USTA 18+ Standard (2S / 3D)',
    description: 'Standard USTA League encounter consisting of 2 Singles and 3 Doubles lines.',
    lines: [
      { id: 'u-line1', name: 'Singles Line #1', type: 'Singles', genderReq: 'Mixed' },
      { id: 'u-line2', name: 'Singles Line #2', type: 'Singles', genderReq: 'Mixed' },
      { id: 'u-line3', name: 'Doubles Line #1', type: 'Doubles', genderReq: 'Mixed' },
      { id: 'u-line4', name: 'Doubles Line #2', type: 'Doubles', genderReq: 'Mixed' },
      { id: 'u-line5', name: 'Doubles Line #3', type: 'Doubles', genderReq: 'Mixed' },
    ]
  },
  {
    id: 'wtt-standard',
    name: 'World TeamTennis (5-Set)',
    description: 'Cumulative games won format consisting of Men/Women Singles, Men/Women Doubles, and Mixed Doubles.',
    lines: [
      { id: 'w-line1', name: 'Men\'s Singles', type: 'Singles', genderReq: 'Male' },
      { id: 'w-line2', name: 'Women\'s Singles', type: 'Singles', genderReq: 'Female' },
      { id: 'w-line3', name: 'Men\'s Doubles', type: 'Doubles', genderReq: 'Male' },
      { id: 'w-line4', name: 'Women\'s Doubles', type: 'Doubles', genderReq: 'Female' },
      { id: 'w-line5', name: 'Mixed Doubles', type: 'Doubles', genderReq: 'Mixed' },
    ]
  }
];

// Helper to create empty lineup slots for a format
export const createEmptyLineup = (format: MatchFormat) => {
  return format.lines.map(line => ({
    lineId: line.id,
    playerIds: [] as string[]
  }));
};

export const DEFAULT_MATCHES: ScheduledMatch[] = [
  {
    id: 'm1',
    team1: 'Team A',
    team2: 'Team B',
    date: '2026-06-24T18:00',
    status: 'Scheduled',
    formatId: 'club-custom',
    lineup: createEmptyLineup(DEFAULT_MATCH_FORMATS[0])
  },
  {
    id: 'm2',
    team1: 'Team C',
    team2: 'Team D',
    date: '2026-06-27T14:00',
    status: 'Scheduled',
    formatId: 'club-custom',
    lineup: createEmptyLineup(DEFAULT_MATCH_FORMATS[0])
  },
  {
    id: 'm3',
    team1: 'Team A',
    team2: 'Team C',
    date: '2026-07-01T18:00',
    status: 'Scheduled',
    formatId: 'club-custom',
    lineup: createEmptyLineup(DEFAULT_MATCH_FORMATS[0])
  },
  {
    id: 'm4',
    team1: 'Team B',
    team2: 'Team D',
    date: '2026-07-04T14:00',
    status: 'Scheduled',
    formatId: 'club-custom',
    lineup: createEmptyLineup(DEFAULT_MATCH_FORMATS[0])
  },
  {
    id: 'm5',
    team1: 'Team A',
    team2: 'Team D',
    date: '2026-07-08T18:00',
    status: 'Scheduled',
    formatId: 'club-custom',
    lineup: createEmptyLineup(DEFAULT_MATCH_FORMATS[0])
  },
  {
    id: 'm6',
    team1: 'Team B',
    team2: 'Team C',
    date: '2026-07-11T14:00',
    status: 'Scheduled',
    formatId: 'club-custom',
    lineup: createEmptyLineup(DEFAULT_MATCH_FORMATS[0])
  }
];
