import { useState } from "react";
import type { TournamentStore } from "../state/useTournamentStore";
import { formatClock, parseClockToMinutesFromDayStart } from "../utils/time";

export function CourtsPanel({ store }: { store: TournamentStore }) {
  const [name, setName] = useState("");
  const dayStart = store.settings.dayStartMinutes;

  return (
    <div className="panel">
      <h2>Courts</h2>
      <p className="hint">
        Add each court and, if it isn't available all day (e.g. shared with another
        activity), set its own opening hours.
      </p>

      <form
        className="row form-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          store.addCourt(name.trim());
          setName("");
        }}
      >
        <input placeholder="Court name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Add court</button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Court</th>
            <th>Available from</th>
            <th>Available until</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {store.courts.map((c) => {
            const window = c.availableWindows[0];
            return (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  <input
                    type="time"
                    value={formatClock(window.startMinutes, dayStart)}
                    onChange={(e) =>
                      store.updateCourt(c.id, {
                        availableWindows: [
                          { ...window, startMinutes: parseClockToMinutesFromDayStart(e.target.value, dayStart) },
                        ],
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={formatClock(window.endMinutes, dayStart)}
                    onChange={(e) =>
                      store.updateCourt(c.id, {
                        availableWindows: [
                          { ...window, endMinutes: parseClockToMinutesFromDayStart(e.target.value, dayStart) },
                        ],
                      })
                    }
                  />
                </td>
                <td>
                  <button className="link-btn" onClick={() => store.removeCourt(c.id)}>Remove</button>
                </td>
              </tr>
            );
          })}
          {store.courts.length === 0 && (
            <tr>
              <td colSpan={4} className="empty">No courts yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
