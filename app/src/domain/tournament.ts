import { generatePlayoffPlaceholderMatches, makeGroups, roundRobinMatches } from "./groups";
import { scheduleMatches } from "./scheduler";
import type { Court, Match, ScheduleResult, SchedulingSettings, TournamentClass } from "./types";

/**
 * Interleaves matches round-by-round across classes/groups instead of
 * playing one class/group to completion before starting the next. This
 * keeps courts busy with a variety of classes rather than draining one
 * group's matches back-to-back, and roughly mirrors how club tournaments
 * are actually run.
 */
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

export function generateAllMatches(classes: TournamentClass[]): Match[] {
  const groupBuckets = classes.map((cls) => {
    const groups = makeGroups(cls.entrants);
    return groups.flatMap((g) => roundRobinMatches(cls.id, g.name, g.entrants));
  });
  const groupMatches = interleave(groupBuckets);

  const playoffMatches = classes.flatMap((cls) => {
    const groupCount = makeGroups(cls.entrants).length;
    return generatePlayoffPlaceholderMatches(cls, groupCount);
  });

  return [...groupMatches, ...playoffMatches];
}

export function buildSchedule(
  classes: TournamentClass[],
  courts: Court[],
  settings: SchedulingSettings,
): ScheduleResult {
  const matches = generateAllMatches(classes);
  return scheduleMatches(matches, courts, classes, settings);
}
