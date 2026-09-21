import { useEffect, useMemo, useState } from "react";
import { buildSchedule } from "../domain/tournament";
import type {
  Court,
  CourtWindow,
  Entrant,
  Player,
  ScheduleResult,
  SchedulingSettings,
  TournamentClass,
  TournamentDay,
} from "../domain/types";

const STORAGE_KEY = "badminton-planner-state-v2";
const SINGLES_EVENT_TYPES = new Set(["MS", "WS"]);

interface PersistedState {
  players: Player[];
  classes: TournamentClass[];
  courts: Court[];
  days: TournamentDay[];
  settings: SchedulingSettings;
}

function defaultDay(id: string, label: string): TournamentDay {
  return { id, label, startMinutes: 9 * 60 };
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
    days: [defaultDay("day-1", "Day 1")],
    settings: { minRestMinutes: 15 },
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

  function loadSample(data: { players: Player[]; classes: TournamentClass[]; courts: Court[]; days: TournamentDay[] }) {
    setState((s) => ({ ...s, players: data.players, classes: data.classes, courts: data.courts, days: data.days }));
    setSchedule(null);
  }

  function addPlayer(name: string, club?: string): Player {
    const player: Player = { id: newId("player"), name, club };
    setState((s) => ({ ...s, players: [...s.players, player] }));
    return player;
  }

  function addClass(cls: Pick<TournamentClass, "eventType" | "skillClass" | "avgGroupMatchMinutes" | "avgPlayoffMatchMinutes" | "targetGroupSize" | "groupAdvanceCount">) {
    setState((s) => {
      const newClass: TournamentClass = { ...cls, id: newId("class"), entrants: [], priority: s.classes.length };
      return { ...s, classes: [...s.classes, newClass] };
    });
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

  /** Moves a class earlier/later in the wave/pipeline scheduling order. */
  function moveClassPriority(id: string, direction: -1 | 1) {
    setState((s) => {
      const ordered = [...s.classes].sort((a, b) => a.priority - b.priority);
      const index = ordered.findIndex((c) => c.id === id);
      const swapWith = index + direction;
      if (index < 0 || swapWith < 0 || swapWith >= ordered.length) return s;
      [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
      const reNumbered = ordered.map((c, i) => ({ ...c, priority: i }));
      return { ...s, classes: reNumbered };
    });
  }

  /** Quick preference: order all singles classes before doubles/mixed ones. */
  function applySinglesFirstPreference() {
    setState((s) => {
      const singles = s.classes.filter((c) => SINGLES_EVENT_TYPES.has(c.eventType));
      const rest = s.classes.filter((c) => !SINGLES_EVENT_TYPES.has(c.eventType));
      const reNumbered = [...singles, ...rest].map((c, i) => ({ ...c, priority: i, dayId: undefined }));
      return { ...s, classes: reNumbered };
    });
  }

  /** Quick preference: pin singles to the first day, doubles/mixed to the second. */
  function applySplitAcrossDaysPreference() {
    setState((s) => {
      if (s.days.length < 2) return s;
      const [firstDay, secondDay] = s.days;
      const singles = s.classes.filter((c) => SINGLES_EVENT_TYPES.has(c.eventType));
      const rest = s.classes.filter((c) => !SINGLES_EVENT_TYPES.has(c.eventType));
      const reNumbered = [
        ...singles.map((c) => ({ ...c, dayId: firstDay.id })),
        ...rest.map((c) => ({ ...c, dayId: secondDay.id })),
      ].map((c, i) => ({ ...c, priority: i }));
      return { ...s, classes: reNumbered };
    });
  }

  function clearDayPreference() {
    setState((s) => ({ ...s, classes: s.classes.map((c) => ({ ...c, dayId: undefined })) }));
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
    setState((s) => {
      const windows: CourtWindow[] = s.days.map((d) => ({ dayId: d.id, startMinutes: 0, endMinutes: 8 * 60 }));
      const court: Court = { id: newId("court"), name, availableWindows: windows };
      return { ...s, courts: [...s.courts, court] };
    });
  }

  function updateCourtWindow(courtId: string, dayId: string, patch: Partial<CourtWindow>) {
    setState((s) => ({
      ...s,
      courts: s.courts.map((c) => {
        if (c.id !== courtId) return c;
        const hasWindow = c.availableWindows.some((w) => w.dayId === dayId);
        const availableWindows = hasWindow
          ? c.availableWindows.map((w) => (w.dayId === dayId ? { ...w, ...patch } : w))
          : [...c.availableWindows, { dayId, startMinutes: 0, endMinutes: 8 * 60, ...patch }];
        return { ...c, availableWindows };
      }),
    }));
  }

  function removeCourt(id: string) {
    setState((s) => ({ ...s, courts: s.courts.filter((c) => c.id !== id) }));
  }

  function addDay(label: string) {
    setState((s) => {
      const day = defaultDay(newId("day"), label);
      return {
        ...s,
        days: [...s.days, day],
        // New courts default to being open on every day; extend existing
        // courts with a same default window on the new day too.
        courts: s.courts.map((c) => ({
          ...c,
          availableWindows: [...c.availableWindows, { dayId: day.id, startMinutes: 0, endMinutes: 8 * 60 }],
        })),
      };
    });
  }

  function updateDay(id: string, patch: Partial<TournamentDay>) {
    setState((s) => ({ ...s, days: s.days.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  }

  function removeDay(id: string) {
    setState((s) => {
      if (s.days.length <= 1) return s; // always keep at least one day
      return {
        ...s,
        days: s.days.filter((d) => d.id !== id),
        courts: s.courts.map((c) => ({ ...c, availableWindows: c.availableWindows.filter((w) => w.dayId !== id) })),
        classes: s.classes.map((c) => (c.dayId === id ? { ...c, dayId: undefined } : c)),
      };
    });
  }

  function updateSettings(patch: Partial<SchedulingSettings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }

  function generateSchedule() {
    const result = buildSchedule(state.classes, state.courts, state.days, state.settings);
    setSchedule(result);
  }

  return {
    players: state.players,
    playersById,
    classes: state.classes,
    courts: state.courts,
    days: state.days,
    settings: state.settings,
    schedule,
    loadSample,
    addPlayer,
    addClass,
    updateClass,
    removeClass,
    moveClassPriority,
    applySinglesFirstPreference,
    applySplitAcrossDaysPreference,
    clearDayPreference,
    addEntrantToClass,
    removeEntrantFromClass,
    addCourt,
    updateCourtWindow,
    removeCourt,
    addDay,
    updateDay,
    removeDay,
    updateSettings,
    generateSchedule,
  };
}

export type TournamentStore = ReturnType<typeof useTournamentStore>;
