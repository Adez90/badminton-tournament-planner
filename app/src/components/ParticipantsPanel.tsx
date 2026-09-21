import { useState } from "react";
import type { TournamentStore } from "../state/useTournamentStore";

const SINGLES = new Set(["MS", "WS"]);

export function ParticipantsPanel({ store }: { store: TournamentStore }) {
  const [selectedClassId, setSelectedClassId] = useState<string>(store.classes[0]?.id ?? "");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");

  const selectedClass = store.classes.find((c) => c.id === selectedClassId);
  const isSingles = selectedClass ? SINGLES.has(selectedClass.eventType) : true;

  if (store.classes.length === 0) {
    return (
      <div className="panel">
        <h2>Participants</h2>
        <p className="hint">Add at least one class first, then come back here to add entrants to it.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Participants</h2>
      <p className="hint">
        Manual entry for now — once you share your participant file's format, this
        screen becomes an importer that fills classes automatically.
      </p>

      <div className="row form-row">
        <label>
          Class
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            {store.classes.map((c) => (
              <option key={c.id} value={c.id}>{c.eventType} {c.skillClass}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="row form-row">
        <input
          placeholder="New player name"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (!newPlayerName.trim()) return;
            store.addPlayer(newPlayerName.trim());
            setNewPlayerName("");
          }}
        >
          Add player to roster
        </button>
      </div>

      {selectedClass && (
        <form
          className="row form-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!playerAId) return;
            if (!isSingles && !playerBId) return;
            const ids = isSingles ? [playerAId] : [playerAId, playerBId];
            store.addEntrantToClass(selectedClass.id, ids);
            setPlayerAId("");
            setPlayerBId("");
          }}
        >
          <select value={playerAId} onChange={(e) => setPlayerAId(e.target.value)}>
            <option value="">Select player{isSingles ? "" : " A"}</option>
            {store.players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {!isSingles && (
            <select value={playerBId} onChange={(e) => setPlayerBId(e.target.value)}>
              <option value="">Select player B</option>
              {store.players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button type="submit">Add entrant to {selectedClass.eventType} {selectedClass.skillClass}</button>
        </form>
      )}

      {selectedClass && (
        <table className="table">
          <thead>
            <tr>
              <th>Entrant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {selectedClass.entrants.map((entrant) => (
              <tr key={entrant.id}>
                <td>
                  {entrant.playerIds
                    .map((id) => store.playersById.get(id)?.name ?? "?")
                    .join(" / ")}
                </td>
                <td>
                  <button
                    className="link-btn"
                    onClick={() => store.removeEntrantFromClass(selectedClass.id, entrant.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {selectedClass.entrants.length === 0 && (
              <tr>
                <td colSpan={2} className="empty">No entrants yet in this class.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
