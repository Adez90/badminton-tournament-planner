import { useState } from "react";
import type { EventType, SkillClass } from "../domain/types";
import type { TournamentStore } from "../state/useTournamentStore";

const EVENT_TYPES: EventType[] = ["MS", "WS", "MD", "WD", "XD"];
const SKILL_CLASSES: SkillClass[] = ["Elit", "A", "B", "C", "D"];

export function ClassesPanel({ store }: { store: TournamentStore }) {
  const [eventType, setEventType] = useState<EventType>("WD");
  const [skillClass, setSkillClass] = useState<SkillClass>("B");
  const [avgGroup, setAvgGroup] = useState(25);
  const [avgPlayoff, setAvgPlayoff] = useState(35);
  const [advanceCount, setAdvanceCount] = useState(2);

  return (
    <div className="panel">
      <h2>Classes</h2>
      <p className="hint">
        A class is one event type + skill level, e.g. "WD B". Set the average match
        length separately for group stage and playoff — playoffs often run longer.
      </p>

      <form
        className="row form-row"
        onSubmit={(e) => {
          e.preventDefault();
          store.addClass({
            eventType,
            skillClass,
            avgGroupMatchMinutes: avgGroup,
            avgPlayoffMatchMinutes: avgPlayoff,
            groupAdvanceCount: advanceCount,
          });
        }}
      >
        <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={skillClass} onChange={(e) => setSkillClass(e.target.value as SkillClass)}>
          {SKILL_CLASSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label>
          Group min
          <input
            type="number"
            min={5}
            value={avgGroup}
            onChange={(e) => setAvgGroup(Number(e.target.value))}
          />
        </label>
        <label>
          Playoff min
          <input
            type="number"
            min={5}
            value={avgPlayoff}
            onChange={(e) => setAvgPlayoff(Number(e.target.value))}
          />
        </label>
        <label>
          Advance/group
          <input
            type="number"
            min={1}
            max={4}
            value={advanceCount}
            onChange={(e) => setAdvanceCount(Number(e.target.value))}
          />
        </label>
        <button type="submit">Add class</button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Entrants</th>
            <th>Avg group / playoff (min)</th>
            <th>Advance per group</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {store.classes.map((c) => (
            <tr key={c.id}>
              <td>{c.eventType} {c.skillClass}</td>
              <td>{c.entrants.length}</td>
              <td>{c.avgGroupMatchMinutes} / {c.avgPlayoffMatchMinutes}</td>
              <td>{c.groupAdvanceCount}</td>
              <td>
                <button className="link-btn" onClick={() => store.removeClass(c.id)}>Remove</button>
              </td>
            </tr>
          ))}
          {store.classes.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">No classes yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
