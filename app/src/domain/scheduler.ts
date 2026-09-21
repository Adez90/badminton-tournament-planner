import type {
  Court,
  Match,
  ScheduledMatch,
  ScheduleResult,
  SchedulingSettings,
  TournamentClass,
  TournamentDay,
} from "./types";

// Days are placed on one shared "global minutes" timeline, DAY_STRIDE apart.
// That's far larger than any court's daily opening hours plus the rest-time
// buffer, so two windows on different days can never be mistaken for
// overlapping, and a single running cursor per court works across days
// without extra bookkeeping.
const DAY_STRIDE = 24 * 60;

interface DurationLookup {
  (match: Match): number;
}

function buildDurationLookup(classes: TournamentClass[]): DurationLookup {
  const byId = new Map(classes.map((c) => [c.id, c]));
  return (match: Match) => {
    const cls = byId.get(match.classId);
    if (!cls) return 30; // sane fallback, shouldn't happen with valid data
    return match.phase === "group" ? cls.avgGroupMatchMinutes : cls.avgPlayoffMatchMinutes;
  };
}

/** True if [aStart,aEnd) and [bStart,bEnd) overlap, with a buffer applied. */
function overlapsWithBuffer(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  buffer: number,
): boolean {
  return aStart < bEnd + buffer && bStart < aEnd + buffer;
}

interface GlobalWindow {
  dayId: string;
  dayIndex: number;
  /** Global (cross-day) minutes, i.e. dayIndex * DAY_STRIDE + local minutes. */
  globalStart: number;
  globalEnd: number;
}

function toGlobalWindows(court: Court, dayIndexById: Map<string, number>): GlobalWindow[] {
  return court.availableWindows
    .filter((w) => dayIndexById.has(w.dayId))
    .map((w) => {
      const dayIndex = dayIndexById.get(w.dayId)!;
      return {
        dayId: w.dayId,
        dayIndex,
        globalStart: dayIndex * DAY_STRIDE + w.startMinutes,
        globalEnd: dayIndex * DAY_STRIDE + w.endMinutes,
      };
    });
}

/**
 * Greedy scheduler: processes matches in the given order, and for each one
 * finds the earliest court + day + time slot where the court is available
 * and no player in the match is already booked within the rest-time
 * buffer. A class pinned to a specific day (TournamentClass.dayId) only
 * considers that day's windows.
 *
 * This is intentionally simple (not globally optimal) so it's easy to
 * reason about and to later let an organizer manually override a slot.
 */
export function scheduleMatches(
  matches: Match[],
  courts: Court[],
  classes: TournamentClass[],
  days: TournamentDay[],
  settings: SchedulingSettings,
): ScheduleResult {
  const getDuration = buildDurationLookup(classes);
  const classById = new Map(classes.map((c) => [c.id, c]));
  const dayIndexById = new Map(days.map((d, i) => [d.id, i]));
  const scheduled: ScheduledMatch[] = [];
  const unscheduled: ScheduleResult["unscheduled"] = [];

  // Track busy intervals per player (in global minutes) as scheduling
  // proceeds. The cursor is keyed per (court, day) — not just per court —
  // because a court's days are independent resource pools: once a class
  // pinned to day 2 advances a court's cursor into day 2's minute range,
  // a later day-1-pinned match on that same court must still be able to
  // find day-1 time, not get blocked by the day-2 cursor value.
  const playerBusy = new Map<string, { start: number; end: number }[]>();
  const courtDayCursor = new Map<string, number>();
  const courtWindows = new Map<string, GlobalWindow[]>(
    courts.map((c) => [c.id, toGlobalWindows(c, dayIndexById)]),
  );

  for (const match of matches) {
    const duration = getDuration(match);
    const pinnedDayId = classById.get(match.classId)?.dayId;

    const attempts: { courtId: string; dayId: string; start: number; end: number }[] = [];
    for (const court of courts) {
      const windows = courtWindows.get(court.id) ?? [];
      for (const window of windows) {
        if (pinnedDayId && window.dayId !== pinnedDayId) continue;
        const cursorKey = `${court.id}|${window.dayId}`;
        let candidateStart = Math.max(window.globalStart, courtDayCursor.get(cursorKey) ?? 0);
        while (candidateStart + duration <= window.globalEnd) {
          const candidateEnd = candidateStart + duration;
          const conflict = match.playerIds.some((playerId) => {
            const busy = playerBusy.get(playerId) ?? [];
            return busy.some((b) =>
              overlapsWithBuffer(candidateStart, candidateEnd, b.start, b.end, settings.minRestMinutes),
            );
          });
          if (!conflict) {
            attempts.push({ courtId: court.id, dayId: window.dayId, start: candidateStart, end: candidateEnd });
          }
          candidateStart += duration;
        }
      }
    }

    if (attempts.length > 0) {
      attempts.sort((a, b) => a.start - b.start);
      const chosen = attempts[0];
      const dayIndex = dayIndexById.get(chosen.dayId)!;
      const localStart = chosen.start - dayIndex * DAY_STRIDE;
      const localEnd = chosen.end - dayIndex * DAY_STRIDE;
      scheduled.push({ match, courtId: chosen.courtId, dayId: chosen.dayId, startMinutes: localStart, endMinutes: localEnd });
      courtDayCursor.set(`${chosen.courtId}|${chosen.dayId}`, chosen.end);
      for (const playerId of match.playerIds) {
        const busy = playerBusy.get(playerId) ?? [];
        busy.push({ start: chosen.start, end: chosen.end });
        playerBusy.set(playerId, busy);
      }
    } else {
      unscheduled.push({
        match,
        reason:
          match.playerIds.length === 0
            ? "Playoff slot not yet resolvable (waiting on group results) or no court time left"
            : pinnedDayId
              ? "No court/time slot available on this class's pinned day without violating rest time or court hours"
              : "No court/time slot available without violating rest time or court hours",
      });
    }
  }

  return { scheduled, unscheduled };
}
