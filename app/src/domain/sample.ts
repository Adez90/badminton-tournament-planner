import type { Court, Entrant, Player, TournamentClass } from "./types";

function id(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

/** Small demo dataset so the schedule view can be tried without typing
 * in real participants first. Loaded on demand via a "Load sample data"
 * button, never automatically. */
export function buildSampleData(): { players: Player[]; classes: TournamentClass[]; courts: Court[] } {
  const names = [
    "Anna Berg", "Erik Lund", "Maja Sten", "Oskar Nyström", "Klara Holm",
    "Viktor Ek", "Elin Dahl", "Filip Sund", "Nora Vik", "Axel Berg",
    "Ida Falk", "Leo Ström", "Wilma Hed", "Hugo Lind", "Alva Ros",
    "Liam Näs", "Signe Wall", "Noah Bark", "Freja Ahl", "Elias Ram",
  ];
  const players: Player[] = names.map((name, i) => ({ id: id("p", i), name }));

  const entrantOf = (idx: number, seed?: number): Entrant => ({
    id: id("e", idx),
    playerIds: [players[idx].id],
    seed,
  });

  const wsA: TournamentClass = {
    id: "ws-a",
    eventType: "WS",
    skillClass: "A",
    avgGroupMatchMinutes: 25,
    avgPlayoffMatchMinutes: 35,
    groupAdvanceCount: 2,
    entrants: [entrantOf(0, 1), entrantOf(2, 2), entrantOf(4), entrantOf(6), entrantOf(8), entrantOf(10)],
  };

  const msB: TournamentClass = {
    id: "ms-b",
    eventType: "MS",
    skillClass: "B",
    avgGroupMatchMinutes: 22,
    avgPlayoffMatchMinutes: 30,
    groupAdvanceCount: 2,
    entrants: [entrantOf(1, 1), entrantOf(3), entrantOf(5), entrantOf(7), entrantOf(9)],
  };

  const xdC: TournamentClass = {
    id: "xd-c",
    eventType: "XD",
    skillClass: "C",
    avgGroupMatchMinutes: 28,
    avgPlayoffMatchMinutes: 38,
    groupAdvanceCount: 1,
    entrants: [
      { id: "e-xd-1", playerIds: [players[0].id, players[1].id], seed: 1 },
      { id: "e-xd-2", playerIds: [players[2].id, players[3].id] },
      { id: "e-xd-3", playerIds: [players[4].id, players[5].id] },
      { id: "e-xd-4", playerIds: [players[6].id, players[7].id] },
    ],
  };

  const courts: Court[] = [
    { id: "court-1", name: "Court 1", availableWindows: [{ startMinutes: 0, endMinutes: 480 }] },
    { id: "court-2", name: "Court 2", availableWindows: [{ startMinutes: 0, endMinutes: 480 }] },
    { id: "court-3", name: "Court 3", availableWindows: [{ startMinutes: 60, endMinutes: 420 }] },
  ];

  return { players, classes: [wsA, msB, xdC], courts };
}
