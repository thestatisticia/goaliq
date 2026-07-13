export interface Team {
  id: number;
  name: string;
  logo: string;
  winner?: boolean | null;
}

export interface Fixture {
  id: number;
  date: string;
  status: {
    short: string;
    long: string;
    elapsed: number | null;
  };
  venue: { name: string; city: string } | null;
}

export interface Match {
  fixture: Fixture;
  league: { id: number; name: string; season: number; round?: string };
  teams: { home: Team; away: Team };
  goals: {
    home: number | null;
    away: number | null;
    halfTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
}

export interface MatchStatistic {
  type: string;
  value: number | string | null;
}

export interface TeamMatchStatistics {
  team: Team;
  statistics: MatchStatistic[];
}

export interface SummaryRow {
  label: string;
  home: string;
  away: string;
}

export interface MatchDetail {
  match: Match;
  events: MatchEvent[];
  statistics: TeamMatchStatistics[];
  summary: SummaryRow[];
  referee?: string | null;
  source: "football-data" | "api-football" | "mixed";
  statsAvailable: boolean;
  summaryAvailable: boolean;
  derivedEvents?: boolean;
}

export interface StandingRow {
  rank: number;
  team: Team;
  points: number;
  all: { played: number; win: number; draw: number; lose: number };
  goalsDiff: number;
  goalsFor?: number;
  goalsAgainst?: number;
  form: string | null;
}

export interface StandingGroup {
  group: string;
  table: StandingRow[];
}

export interface MatchEvent {
  time: { elapsed: number; extra: number | null };
  team: Team;
  player: { name: string };
  type: string;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CopilotContext {
  matchId?: number;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;
  status?: string;
}
