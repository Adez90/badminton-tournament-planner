import { useState } from "react";
import type { TournamentStore } from "../state/useTournamentStore";
import { formatClock, parseClockToMinutesFromDayStart } from "../utils/time";

export function DaysPanel({ store }: { store: TournamentStore }) {
  const [label, setLabel] = useState("");

  return (
    <div className="panel">
      <h2>Tournament days</h2>
      <p className="hint">
        Most tournaments run over a weekend. Add a day for each day of play — courts
        and classes are then scheduled per day, and a class can optionally be pinned
        to one specific day (set that up on the Classes tab).
      </p>

      <form
        className="row form-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          store.addDay(label.trim());
          setLabel("");
        }}
      >
        <input placeholder="e.g. Sunday" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="submit">Add day</button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Starts at</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {store.days.map((day) => (
            <tr key={day.id}>
              <td>
                <input
                  value={day.label}
                  onChange={(e) => store.updateDay(day.id, { label: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="time"
                  value={formatClock(0, day.startMinutes)}
                  onChange={(e) =>
                    store.updateDay(day.id, { startMinutes: parseClockToMinutesFromDayStart(e.target.value, 0) })
                  }
                />
              </td>
              <td>
                {store.days.length > 1 && (
                  <button className="link-btn" onClick={() => store.removeDay(day.id)}>Remove</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
