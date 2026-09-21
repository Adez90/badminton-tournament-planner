import type {
  Court,
  Match,
  ScheduledMatch,
  ScheduleResult,
  SchedulingSettings,
  TournamentClass,
} from "./types";

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

/**
 * Greedy scheduler: processes matches in the given order, and for each one
 * finds the earliest court + time slot where the court is available and no
 * player in the match is already booked within the rest-time buffer.
 *
 * This is intentionally simple (not globally optimal) so it's easy to
 * reason about and to later let an organizer manually override a slot.
 */
export function scheduleMatches(
  matches: Match[],
  courts: Court[],
  classes: TournamentClass[],
  settings: SchedulingSettings,
): ScheduleResult {
  const getDuration = buildDurationLookup(classes);
  const scheduled: ScheduledMatch[] = [];
  const unscheduled: ScheduleResult["unscheduled"] = [];

  // Track busy intervals per player and per court as scheduling proceeds.
  const playerBusy = new Map<string, { start: number; end: number }[]>();
  // Cursor per court: next minute from which we should try to place a match.
  const courtCursor = new Map<string, number>(courts.map((c) => [c.id, 0]));

  for (const match of matches) {
    const duration = getDuration(match);
    let placed = false;

    // Try each court, starting from that court's own cursor, and advance
    // in duration-sized steps until a free window is found or windows run out.
    const attempts: { courtId: string; start: number; end: number }[] = [];
    for (const court of courts) {
      const windows = court.availableWindows;
      for (const window of windows) {
        let candidateStart = Math.max(window.startMinutes, courtCursor.get(court.id) ?? 0);
        while (candidateStart + duration <= window.endMinutes) {
          const candidateEnd = candidateStart + duration;
          const conflict = match.playerIds.some((playerId) => {
            const busy = playerBusy.get(playerId) ?? [];
            return busy.some((b) =>
              overlapsWithBuffer(candidateStart, candidateEnd, b.start, b.end, settings.minRestMinutes),
            );
          });
          if (!conflict) {
            attempts.push({ courtId: court.id, start: candidateStart, end: candidateEnd });
          }
          candidateStart += duration;
        }
      }
    }

    if (attempts.length > 0) {
      attempts.sort((a, b) => a.start - b.start);
      const chosen = attempts[0];
      scheduled.push({ match, courtId: chosen.courtId, startMinutes: chosen.start, endMinutes: chosen.end });
      courtCursor.set(chosen.courtId, chosen.end);
      for (const playerId of match.playerIds) {
        const busy = playerBusy.get(playerId) ?? [];
        busy.push({ start: chosen.start, end: chosen.end });
        playerBusy.set(playerId, busy);
      }
      placed = true;
    }

    if (!placed) {
      unscheduled.push({
        match,
        reason:
          match.playerIds.length === 0
            ? "Playoff slot not yet resolvable (waiting on group results) or no court time left"
            : "No court/time slot available without violating rest time or court hours",
      });
    }
  }

  return { scheduled, unscheduled };
}
