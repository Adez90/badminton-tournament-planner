import type { Entrant, Match, TournamentClass } from "./types";

/**
 * Split entrants into pools around a target size, per SBF convention
 * (target 4, falling back to 3 or 5 to use up remainders) — except here
 * the target size is whatever the organizer configured for the class.
 * Seeded entrants (lower seed number = stronger) are distributed
 * round-robin across pools so the top seeds don't end up in the same group.
 */
export function makeGroups(
  entrants: Entrant[],
  targetGroupSize: number = 4,
): { name: string; entrants: Entrant[] }[] {
  const n = entrants.length;
  if (n === 0) return [];
  const size = Math.max(2, targetGroupSize);
  if (n <= size + 1) return [{ name: "A", entrants }];

  const groupCount = Math.max(1, Math.round(n / size));
  const sorted = [...entrants].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
  const groups: Entrant[][] = Array.from({ length: groupCount }, () => []);

  // Snake distribution: 0,1,2,...,k,k,...,2,1,0 so seed 1 and 2 land in
  // different groups, and strength is spread evenly.
  let groupIndex = 0;
  let direction = 1;
  for (const entrant of sorted) {
    groups[groupIndex].push(entrant);
    if (groupIndex + direction >= groupCount || groupIndex + direction < 0) {
      direction *= -1;
    } else {
      groupIndex += direction;
    }
  }

  return groups
    .filter((g) => g.length > 0)
    .map((g, i) => ({ name: String.fromCharCode(65 + i), entrants: g }));
}

/** All round-robin pairings within a single group. */
export function roundRobinMatches(
  classId: string,
  groupName: string,
  entrants: Entrant[],
): Match[] {
  const matches: Match[] = [];
  for (let i = 0; i < entrants.length; i++) {
    for (let j = i + 1; j < entrants.length; j++) {
      const a = entrants[i];
      const b = entrants[j];
      matches.push({
        id: `${classId}-${groupName}-${a.id}-vs-${b.id}`,
        classId,
        phase: "group",
        groupName,
        entrantAId: a.id,
        entrantBId: b.id,
        playerIds: [...a.playerIds, ...b.playerIds],
      });
    }
  }
  return matches;
}

/** Generates all group-stage matches for a class. */
export function generateGroupMatches(cls: TournamentClass): Match[] {
  const groups = makeGroups(cls.entrants, cls.targetGroupSize);
  return groups.flatMap((g) => roundRobinMatches(cls.id, g.name, g.entrants));
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Builds an empty seeded single-elimination bracket "shape" sized for the
 * number of advancers, with byes for slots that don't have an entrant yet.
 * Advancers aren't known until group play finishes, so slots are filled
 * with placeholder ids ("group-winner-A", etc.) that the UI resolves once
 * results are entered — v1 only needs the shape so courts/time can be
 * reserved for it.
 */
export function generatePlayoffPlaceholderMatches(
  cls: TournamentClass,
  groupCount: number,
): Match[] {
  const advancersTotal = groupCount * cls.groupAdvanceCount;
  if (advancersTotal < 2) return [];
  const bracketSize = nextPowerOfTwo(advancersTotal);
  const roundNames = roundLabelsFor(bracketSize);

  const matches: Match[] = [];
  let matchesInRound = bracketSize / 2;
  for (const round of roundNames) {
    for (let m = 0; m < matchesInRound; m++) {
      matches.push({
        id: `${cls.id}-playoff-${round}-${m}`,
        classId: cls.id,
        phase: "playoff",
        round,
        entrantAId: `${cls.id}-${round}-${m}-slotA`,
        entrantBId: `${cls.id}-${round}-${m}-slotB`,
        playerIds: [],
      });
    }
    matchesInRound = matchesInRound / 2;
  }
  return matches;
}

function roundLabelsFor(bracketSize: number): string[] {
  const labels: string[] = [];
  let size = bracketSize;
  while (size >= 2) {
    if (size === 2) labels.push("F");
    else if (size === 4) labels.push("SF");
    else if (size === 8) labels.push("QF");
    else labels.push(`R${size}`);
    size /= 2;
  }
  return labels;
}
