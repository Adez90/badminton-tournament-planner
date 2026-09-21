import { useEffect, useMemo, useState } from "react";
import { buildSchedule } from "../domain/tournament";
import type {
  Court,
  Entrant,
  Player,
  ScheduleResult,
  SchedulingSettings,
  TournamentClass,
} from "../domain/types";

const STORAGE_KEY = "badminton-planner-state-v1";

interface PersistedState {
  players: Player[];
  classes: TournamentClass[];
  courts: Court[];
  settings: SchedulingSettings;
}

function loadInitial(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {
    // ignore corrupt/blocked storage and fall back to empty state
  }
  return {
    players: [],
    classes: [],
    courts: [],
    settings: { minRestMinutes: 15, dayStartMinutes: 9 * 60 },
  };
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTournamentStore() {
  const [state, setState] = useState<PersistedState>(loadInitial);
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // best-effort only; local persistence is a convenience, not a guarantee
    }
  }, [state]);

  const playersById = useMemo(() => new Map(state.players.map((p) => [p.id, p])), [state.players]);

  function loadSample(data: { players: Player[]; classes: TournamentClass[]; courts: Court[] }) {
    setState((s) => ({ ...s, players: data.players, classes: data.classes, courts: data.courts }));
    setSchedule(null);
  }

  function addPlayer(name: string, club?: string): Player {
    const player: Player = { id: newId("player"), name, club };
    setState((s) => ({ ...s, players: [...s.players, player] }));
    return player;
  }

  function addClass(cls: Omit<TournamentClass, "id" | "entrants">) {
    const newClass: TournamentClass = { ...cls, id: newId("class"), entrants: [] };
    setState((s) => ({ ...s, classes: [...s.classes, newClass] }));
  }

  function updateClass(id: string, patch: Partial<TournamentClass>) {
    setState((s) => ({
      ...s,
      classes: s.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function removeClass(id: string) {
    setState((s) => ({ ...s, classes: s.classes.filter((c) => c.id !== id) }));
  }

  function addEntrantToClass(classId: string, playerIds: string[]) {
    const entrant: Entrant = { id: newId("entrant"), playerIds };
    setState((s) => ({
      ...s,
      classes: s.classes.map((c) =>
        c.id === classId ? { ...c, entrants: [...c.entrants, entrant] } : c,
      ),
    }));
  }

  function removeEntrantFromClass(classId: string, entrantId: string) {
    setState((s) => ({
      ...s,
      classes: s.classes.map((c) =>
        c.id === classId ? { ...c, entrants: c.entrants.filter((e) => e.id !== entrantId) } : c,
      ),
    }));
  }

  function addCourt(name: string) {
    const court: Court = {
      id: newId("court"),
      name,
      availableWindows: [{ startMinutes: 0, endMinutes: 8 * 60 }],
    };
    setState((s) => ({ ...s, courts: [...s.courts, court] }));
  }

  function updateCourt(id: string, patch: Partial<Court>) {
    setState((s) => ({
      ...s,
      courts: s.courts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function removeCourt(id: string) {
    setState((s) => ({ ...s, courts: s.courts.filter((c) => c.id !== id) }));
  }

  function updateSettings(patch: Partial<SchedulingSettings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }

  function generateSchedule() {
    const result = buildSchedule(state.classes, state.courts, state.settings);
    setSchedule(result);
  }

  return {
    players: state.players,
    playersById,
    classes: state.classes,
    courts: state.courts,
    settings: state.settings,
    schedule,
    loadSample,
    addPlayer,
    addClass,
    updateClass,
    removeClass,
    addEntrantToClass,
    removeEntrantFromClass,
    addCourt,
    updateCourt,
    removeCourt,
    updateSettings,
    generateSchedule,
  };
}

export type TournamentStore = ReturnType<typeof useTournamentStore>;
