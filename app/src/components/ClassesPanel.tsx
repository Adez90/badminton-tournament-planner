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
  const [groupSize, setGroupSize] = useState(4);
  const [advanceCount, setAdvanceCount] = useState(2);

  const orderedClasses = [...store.classes].sort((a, b) => a.priority - b.priority);

  return (
    <div className="panel">
      <h2>Classes</h2>
      <p className="hint">
        A class is one event type + skill level, e.g. "WD B". Set the average match
        length separately for group stage and playoff, and the preferred pool size
        (actual pools may be +/-1 to use up remainders).
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
            targetGroupSize: groupSize,
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
          <input type="number" min={5} value={avgGroup} onChange={(e) => setAvgGroup(Number(e.target.value))} />
        </label>
        <label>
          Playoff min
          <input type="number" min={5} value={avgPlayoff} onChange={(e) => setAvgPlayoff(Number(e.target.value))} />
        </label>
        <label>
          Pool size
          <input type="number" min={3} max={6} value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} />
        </label>
        <label>
          Advance/group
          <input type="number" min={1} max={4} value={advanceCount} onChange={(e) => setAdvanceCount(Number(e.target.value))} />
        </label>
        <button type="submit">Add class</button>
      </form>

      <div className="row form-row">
        <button type="button" className="secondary" onClick={() => store.applySinglesFirstPreference()}>
          Order: Singles → Doubles/Mixed
        </button>
        <button
          type="button"
          className="secondary"
          disabled={store.days.length < 2}
          onClick={() => store.applySplitAcrossDaysPreference()}
          title={store.days.length < 2 ? "Add a second tournament day first" : undefined}
        >
          Split: Singles day 1, Doubles/Mixed day 2
        </button>
        <button type="button" className="secondary" onClick={() => store.clearDayPreference()}>
          Clear day pins
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Class</th>
            <th>Entrants</th>
            <th>Pool size</th>
            <th>Avg group / playoff (min)</th>
            <th>Advance/group</th>
            <th>Day</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orderedClasses.map((c, i) => (
            <tr key={c.id}>
              <td className="order-cell">
                <button className="icon-btn" disabled={i === 0} onClick={() => store.moveClassPriority(c.id, -1)}>▲</button>
                <button className="icon-btn" disabled={i === orderedClasses.length - 1} onClick={() => store.moveClassPriority(c.id, 1)}>▼</button>
              </td>
              <td>{c.eventType} {c.skillClass}</td>
              <td>{c.entrants.length}</td>
              <td>{c.targetGroupSize}</td>
              <td>{c.avgGroupMatchMinutes} / {c.avgPlayoffMatchMinutes}</td>
              <td>{c.groupAdvanceCount}</td>
              <td>
                <select
                  value={c.dayId ?? ""}
                  onChange={(e) => store.updateClass(c.id, { dayId: e.target.value || undefined })}
                >
                  <option value="">Any</option>
                  {store.days.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="link-btn" onClick={() => store.removeClass(c.id)}>Remove</button>
              </td>
            </tr>
          ))}
          {store.classes.length === 0 && (
            <tr>
              <td colSpan={8} className="empty">No classes yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
