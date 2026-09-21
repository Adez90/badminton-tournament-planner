// Pure domain types — no React/DOM imports. This module (plus scheduler.ts
// and groups.ts) is meant to be reusable as-is behind a future backend.

export type EventType = "MS" | "WS" | "MD" | "WD" | "XD";

// Senior skill classes used by Svenska Badmintonförbundet. Youth classes
// (U11, U13, ...) reuse the same shape with a different label.
export type SkillClass = "Elit" | "A" | "B" | "C" | "D";

export interface Player {
  id: string;
  name: string;
  club?: string;
}

/** A singles player or a doubles/mixed pair entered into one class. */
export interface Entrant {
  id: string;
  /** 1 player for singles, 2 for doubles/mixed. */
  playerIds: string[];
  /** Seed number, lower = stronger. Undefined = unseeded. */
  seed?: number;
}

export interface TournamentClass {
  id: string;
  eventType: EventType;
  skillClass: SkillClass;
  /** Average minutes for one group-stage match in this class. */
  avgGroupMatchMinutes: number;
  /** Average minutes for one playoff match in this class (often longer). */
  avgPlayoffMatchMinutes: number;
  /** How many entrants advance from each group to the playoff bracket. */
  groupAdvanceCount: number;
  entrants: Entrant[];
}

export type MatchPhase = "group" | "playoff";

export interface Match {
  id: string;
  classId: string;
  phase: MatchPhase;
  /** Round-robin group label ("A", "B", ...) when phase === "group". */
  groupName?: string;
  /** Bracket round label ("R16", "QF", "SF", "F", ...) when phase === "playoff". */
  round?: string;
  entrantAId: string;
  entrantBId: string;
  /** All player ids involved, flattened, for conflict checking. */
  playerIds: string[];
}

export interface TimeWindow {
  /** Minutes from tournament day start, e.g. 09:00 -> 0 if day starts 09:00. */
  startMinutes: number;
  endMinutes: number;
}

export interface Court {
  id: string;
  name: string;
  availableWindows: TimeWindow[];
}

export interface ScheduledMatch {
  match: Match;
  courtId: string;
  startMinutes: number;
  endMinutes: number;
}

export interface SchedulingSettings {
  /** Minimum rest minutes required between two matches for the same player. */
  minRestMinutes: number;
  /** Minutes-since-midnight the tournament day starts, for display only. */
  dayStartMinutes: number;
}

export interface UnscheduledMatch {
  match: Match;
  reason: string;
}

export interface ScheduleResult {
  scheduled: ScheduledMatch[];
  unscheduled: UnscheduledMatch[];
}
