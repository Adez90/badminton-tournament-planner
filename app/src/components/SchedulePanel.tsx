import type { ScheduledMatch } from "../domain/types";
import type { TournamentStore } from "../state/useTournamentStore";
import { formatClock } from "../utils/time";

function classLabel(store: TournamentStore, classId: string): string {
  const c = store.classes.find((cl) => cl.id === classId);
  return c ? `${c.eventType} ${c.skillClass}` : classId;
}

function entrantLabel(store: TournamentStore, classId: string, entrantId: string): string {
  const c = store.classes.find((cl) => cl.id === classId);
  const entrant = c?.entrants.find((e) => e.id === entrantId);
  if (!entrant) return entrantId.includes("slot") ? "TBD" : entrantId;
  return entrant.playerIds.map((id) => store.playersById.get(id)?.name ?? "?").join(" / ");
}

export function SchedulePanel({ store }: { store: TournamentStore }) {
  const canGenerate = store.classes.length > 0 && store.courts.length > 0;

  return (
    <div className="panel">
      <h2>Schedule</h2>

      <div className="row form-row">
        <label>
          Min rest between matches (min)
          <input
            type="number"
            min={0}
            value={store.settings.minRestMinutes}
            onChange={(e) => store.updateSettings({ minRestMinutes: Number(e.target.value) })}
          />
        </label>
        <button disabled={!canGenerate} onClick={() => store.generateSchedule()}>
          Generate schedule
        </button>
      </div>

      {!canGenerate && <p className="hint">Add at least one class (with entrants) and one court first.</p>}

      {store.schedule && (
        <>
          {store.days.map((day) => {
            const dayMatches = store.schedule!.scheduled.filter((sm) => sm.dayId === day.id);
            const scheduledByCourt = new Map<string, ScheduledMatch[]>();
            for (const sm of dayMatches) {
              const list = scheduledByCourt.get(sm.courtId) ?? [];
              list.push(sm);
              scheduledByCourt.set(sm.courtId, list);
            }
            for (const list of scheduledByCourt.values()) list.sort((a, b) => a.startMinutes - b.startMinutes);

            return (
              <div key={day.id} className="day-section">
                <h3>{day.label}</h3>
                <div className="court-grid">
                  {store.courts.map((court) => (
                    <div key={court.id} className="court-column">
                      <h4>{court.name}</h4>
                      <ul>
                        {(scheduledByCourt.get(court.id) ?? []).map((sm) => (
                          <li key={sm.match.id} className={`match-card ${sm.match.phase}`}>
                            <div className="time">
                              {formatClock(sm.startMinutes, day.startMinutes)}–{formatClock(sm.endMinutes, day.startMinutes)}
                            </div>
                            <div className="meta">
                              {classLabel(store, sm.match.classId)} · {sm.match.phase === "group" ? `Group ${sm.match.groupName}` : sm.match.round}
                            </div>
                            <div className="entrants">
                              {entrantLabel(store, sm.match.classId, sm.match.entrantAId)} vs{" "}
                              {entrantLabel(store, sm.match.classId, sm.match.entrantBId)}
                            </div>
                          </li>
                        ))}
                        {(scheduledByCourt.get(court.id) ?? []).length === 0 && <li className="empty">No matches</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {store.schedule.unscheduled.length > 0 && (
            <>
              <h3>Could not schedule ({store.schedule.unscheduled.length})</h3>
              <ul>
                {store.schedule.unscheduled.map((u) => (
                  <li key={u.match.id}>
                    {classLabel(store, u.match.classId)} · {u.match.phase === "group" ? `Group ${u.match.groupName}` : u.match.round} — {u.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
