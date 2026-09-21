import { generatePlayoffPlaceholderMatches, makeGroups, roundRobinMatches } from "./groups";
import { scheduleMatches } from "./scheduler";
import type { Court, Match, ScheduleResult, SchedulingSettings, TournamentClass, TournamentDay } from "./types";

/** Round-robin interleave: one match from each bucket in turn, so several
 * groups/classes running "at once" get spread across the match list rather
 * than one being fully drained before the next starts. */
function interleave(buckets: Match[][]): Match[] {
  const result: Match[] = [];
  let remaining = buckets.map((b) => [...b]);
  while (remaining.some((b) => b.length > 0)) {
    for (const bucket of remaining) {
      const next = bucket.shift();
      if (next) result.push(next);
    }
    remaining = remaining.filter((b) => b.length > 0);
  }
  return result;
}

/**
 * Orders all matches as a "wave"/pipeline across classes instead of
 * interleaving every class at once for the whole day. Classes run in
 * priority order; a class's playoff is paired with the *next* class's
 * group stage (both compete for courts as they free up), while a class's
 * own group stage isn't started until the previous class's playoff is
 * underway. Concretely, for classes C0, C1, C2 in priority order:
 *
 *   groups(C0)
 *   playoff(C0) + groups(C1)   <- interleaved together
 *   playoff(C1) + groups(C2)   <- interleaved together
 *   playoff(C2)
 *
 * This keeps a handful of classes "in flight" rather than scattering every
 * class thinly across the whole day, which is both easier to run (fewer
 * concurrent groups to referee) and keeps a given player's matches from
 * being dragged out over the whole schedule, since their class's matches
 * stay clustered together in the match order (and the scheduler places
 * matches at the earliest available slot in that order).
 */
export function generateAllMatches(classes: TournamentClass[]): Match[] {
  const sorted = [...classes].sort((a, b) => a.priority - b.priority);
  const perClass = sorted.map((cls) => {
    const groups = makeGroups(cls.entrants, cls.targetGroupSize);
    const groupMatches = interleave(groups.map((g) => roundRobinMatches(cls.id, g.name, g.entrants)));
    const playoffMatches = generatePlayoffPlaceholderMatches(cls, groups.length);
    return { groupMatches, playoffMatches };
  });

  if (perClass.length === 0) return [];

  const result: Match[] = [...perClass[0].groupMatches];
  for (let i = 0; i < perClass.length; i++) {
    const playoff = perClass[i].playoffMatches;
    const nextGroups = i + 1 < perClass.length ? perClass[i + 1].groupMatches : [];
    if (nextGroups.length > 0) {
      result.push(...interleave([playoff, nextGroups]));
    } else {
      result.push(...playoff);
    }
  }
  return result;
}

export function buildSchedule(
  classes: TournamentClass[],
  courts: Court[],
  days: TournamentDay[],
  settings: SchedulingSettings,
): ScheduleResult {
  const matches = generateAllMatches(classes);
  return scheduleMatches(matches, courts, classes, days, settings);
}
