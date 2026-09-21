// Pure domain types — no React/DOM imports. This module (plus groups.ts,
// tournament.ts and scheduler.ts) is meant to be reusable as-is behind a
// future backend.

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
  /** Preferred number of entrants per group (pool). Actual pools may be
   * this size +/-1 to use up remainders (e.g. target 4 -> pools of 3/4/5). */
  targetGroupSize: number;
  /** How many entrants advance from each group to the playoff bracket. */
  groupAdvanceCount: number;
  entrants: Entrant[];
  /** Scheduling order relative to other classes — lower runs earlier.
   * Drives the wave/pipeline ordering (see tournament.ts). */
  priority: number;
  /** If set, every match in this class must fall on this tournament day.
   * Undefined = the pipeline may place it on whichever day has room. */
  dayId?: string;
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

/** One day of the tournament, e.g. Saturday / Sunday. */
export interface TournamentDay {
  id: string;
  label: string;
  /** Minutes since midnight this day's schedule starts, for display (e.g. 540 = 09:00). */
  startMinutes: number;
}

/** A court's opening window on one specific tournament day, in minutes
 * relative to that day's own startMinutes (0 = that day's start time). */
export interface CourtWindow {
  dayId: string;
  startMinutes: number;
  endMinutes: number;
}

export interface Court {
  id: string;
  name: string;
  availableWindows: CourtWindow[];
}

export interface ScheduledMatch {
  match: Match;
  courtId: string;
  dayId: string;
  /** Minutes relative to dayId's own startMinutes. */
  startMinutes: number;
  endMinutes: number;
}

export interface SchedulingSettings {
  /** Minimum rest minutes required between two matches for the same player. */
  minRestMinutes: number;
}

export interface UnscheduledMatch {
  match: Match;
  reason: string;
}

export interface ScheduleResult {
  scheduled: ScheduledMatch[];
  unscheduled: UnscheduledMatch[];
}
