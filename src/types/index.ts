export interface Team {
  id: string;
  name: string;
  shortName?: string;
  founded?: number;
  stadium?: string;
  manager?: string;
  status: string; // 'Active' | 'Inactive'
  players: number;
  logoUrl?: string;
  tournaments: string[];
  description?: string;
  trophies: number;
  district: string;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  position: 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper' | string;
  nationality?: string;
  district?: string;
  dob?: string;
  age?: number;
  photoUrl?: string;
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  number?: number | string;
  bio?: string;
  cleanSheets: number;
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  status: 'scheduled' | 'live' | 'finished' | string;
  currentMinute: number;
  competition: string;
  date: string;
  time: string;
  managerA?: string;
  managerB?: string;
  round?: string;
  matchNumber?: string;
  events?: MatchEvent[]; // Assuming matches have events
}

export interface MatchEvent {
  id?: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | string;
  minute: number;
  player: string;
  team: string;
  assist?: string;
}

export interface Tournament {
  id: string;
  name: string;
  season?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  logoUrl?: string;
  teams?: string[];
}

export interface Lineup {
  id: string;
  matchId: string;
  teamName: string;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  formation: string;
}

export interface LineupPlayer {
  playerId: string;
  name: string;
  number?: string | number;
  position: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'superadmin' | 'tournament_admin' | 'team_manager' | 'referee' | 'user';
  displayName?: string;
  photoURL?: string;
  assignedTournaments?: string[]; // For tournament_admin
  assignedTeams?: string[]; // For team_manager
  createdAt?: any;
}
