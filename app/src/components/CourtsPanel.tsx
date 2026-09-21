import { useState } from "react";
import type { TournamentStore } from "../state/useTournamentStore";
import { formatClock, parseClockToMinutesFromDayStart } from "../utils/time";

export function CourtsPanel({ store }: { store: TournamentStore }) {
  const [name, setName] = useState("");

  return (
    <div className="panel">
      <h2>Courts</h2>
      <p className="hint">
        Add each court. If a court isn't available all day, or isn't available at all
        on one of the tournament days, adjust its hours per day below.
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
            {store.days.map((day) => (
              <th key={day.id} colSpan={2}>{day.label}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {store.courts.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              {store.days.map((day) => {
                const window = c.availableWindows.find((w) => w.dayId === day.id);
                return (
                  <td key={day.id} colSpan={2}>
                    <div className="row" style={{ gap: "0.3rem" }}>
                      <input
                        type="time"
                        value={formatClock(window?.startMinutes ?? 0, day.startMinutes)}
                        onChange={(e) =>
                          store.updateCourtWindow(c.id, day.id, {
                            startMinutes: parseClockToMinutesFromDayStart(e.target.value, day.startMinutes),
                          })
                        }
                      />
                      <input
                        type="time"
                        value={formatClock(window?.endMinutes ?? 8 * 60, day.startMinutes)}
                        onChange={(e) =>
                          store.updateCourtWindow(c.id, day.id, {
                            endMinutes: parseClockToMinutesFromDayStart(e.target.value, day.startMinutes),
                          })
                        }
                      />
                    </div>
                  </td>
                );
              })}
              <td>
                <button className="link-btn" onClick={() => store.removeCourt(c.id)}>Remove</button>
              </td>
            </tr>
          ))}
          {store.courts.length === 0 && (
            <tr>
              <td colSpan={2 + store.days.length * 2} className="empty">No courts yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
