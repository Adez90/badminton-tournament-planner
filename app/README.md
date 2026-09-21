# Badminton Tournament Planner — app

React + TypeScript prototype UI. See [`../BLUEPRINT.md`](../BLUEPRINT.md) for
the domain model, the rules this is grounded in, and the roadmap.

## Run it locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically http://localhost:5173). Data is kept
in the browser (`localStorage`) so it survives a page refresh, but is local
to this machine/browser only.

Click **Load sample data** on first run to see a working example, or start
from the **1. Classes** tab and build up a real tournament:

1. **Classes** — add each class you're running (event type + skill level),
   with its average group-stage and playoff match lengths.
2. **Courts** — add your courts and, if any aren't available all day, set
   their opening hours.
3. **Participants** — add players and enter them into classes (singles:
   one player per entrant; doubles/mixed: two). This will later be replaced
   by importing your participant file directly.
4. **Schedule** — set the minimum rest time required between two matches
   for the same player, then generate the schedule.

## Project structure

```
src/
  domain/        pure TypeScript: types, group/bracket generation, the
                 scheduling engine — no React or browser APIs, so it can be
                 reused behind a server later without changes
  state/         a single hook (useTournamentStore) holding all app state
                 and persisting it to localStorage
  components/    one component per screen/step
```

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — type-check and produce a production build in `dist/`
- `npm run lint` — run oxlint
