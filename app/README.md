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

Click **Load sample data** on first run to see a working example (a
two-day tournament with singles pinned to day 1 and doubles/mixed to day
2), or start from the **1. Days** tab and build up a real tournament:

1. **Days** — add one entry per day of the tournament (most run over a
   weekend) and each day's start time.
2. **Classes** — add each class you're running (event type + skill level),
   with its average group-stage/playoff match lengths, preferred pool
   size, and how many advance per group. Reorder classes (this drives the
   wave/pipeline scheduling order — see `../BLUEPRINT.md`) and optionally
   pin a class to one day. Two one-click presets cover the common cases:
   "Singles → Doubles/Mixed" ordering, or "Split: Singles day 1,
   Doubles/Mixed day 2".
3. **Courts** — add your courts and set their opening hours per day (a
   court can have different hours, or be closed, on a given day).
4. **Participants** — add players and enter them into classes (singles:
   one player per entrant; doubles/mixed: two). This will later be replaced
   by importing your participant file directly.
5. **Schedule** — set the minimum rest time required between two matches
   for the same player, then generate the schedule (shown per day, per
   court).

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
