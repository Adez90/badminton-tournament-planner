# Badminton Tournament Planner — Blueprint

## 1. Problem

Organizing a Swedish badminton club/regional tournament today is manual: someone
sits with a spreadsheet, the participant list, and the Swedish Badminton
Federation's (Svenska Badmintonförbundet, "SBF") rules, and hand-builds a
court schedule. There is no dedicated tool. This app should take:

- a participant list (per class),
- rules for how each class is played (group stage + playoff),
- how long matches take on average (group stage vs. playoff, per class),
- how many courts exist and when each is available,

...and produce a reasonable, conflict-free court schedule.

## 2. Domain model, grounded in SBF rules

Sources: SBF "Sektion E – Tävlingsbestämmelser" (competition regulations) and
the SBF seeding page. Key rules that shape the data model:

- **Event types** (standard badminton, used by SBF too): `MS` (men's singles),
  `WS` (women's singles), `MD` (men's doubles), `WD` (women's doubles),
  `XD` (mixed doubles).
- **Skill classes**: senior classes are `Elit`, `A`, `B`, `C`, `D`/Motion.
  A tournament class is the combination of event type + skill class, e.g.
  `WD B`, `XD C`. Youth has its own age/ranking classes (e.g. U11, U13...).
  A player's class can differ between singles, doubles and mixed.
- **Group (pool) play**: a class is normally split into pools of 4
  players/pairs playing round robin; pools of 3 or 5 are used to balance
  numbers when 4 doesn't divide evenly. Typically the top 1–2 per group
  advance to the playoff bracket (configurable — some tournaments only take
  the winner, others take top 2).
- **Playoff**: single-elimination bracket seeded from group results/ranking.
- **Seeding**: for senior/veteran national events, seeding follows the
  Swedish ranking ("Sverigeranking"); no seeding is used in some entry-level
  youth classes. For a club tournament this is a configurable option, not a
  hard requirement.
- **Draw publication**: official events publish the draw ≥10 days ahead —
  not directly relevant to scheduling logic, but confirms the draw/schedule
  is a distinct, reviewable artifact produced before play starts.
- **Player rest time**: a player is entitled to a minimum break between two
  matches (officially 15 minutes at sanctioned events). This is the single
  most important scheduling constraint: **the same person can play doubles,
  mixed, and singles in the same tournament**, so the scheduler must track
  per-*player* (not per-pair) availability and enforce a minimum gap between
  any two matches involving that player.
- **Match duration**: not fixed by rule — this is exactly the gap the app
  fills. The organizer estimates it per class and per phase (group vs.
  playoff matches tend to run longer/shorter and get treated differently),
  and the app uses that estimate to size timeslots.

### Core entities

```
Tournament
 ├─ TournamentDay[]   { id, label, startMinutes }         -- e.g. Saturday, Sunday
 ├─ Player            { id, name, club, (per-event class memberships) }
 ├─ Pairing           (a Team for doubles/mixed = 2 Players; singles = 1 Player)
 ├─ TournamentClass   { id, eventType: MS|WS|MD|WD|XD, skillClass: Elit|A|B|C|D|..,
 │                       avgGroupMatchMinutes, avgPlayoffMatchMinutes,
 │                       targetGroupSize (preferred pool size, +/-1 to use up remainders),
 │                       groupAdvanceCount (how many per group go to playoff),
 │                       priority (wave/pipeline scheduling order, see below),
 │                       dayId? (optional: pin every match in this class to one day) }
 │    ├─ Group[]       { entrants: Pairing[], round-robin Match[] }
 │    └─ PlayoffBracket { seeded single-elim Match[] }
 ├─ Court             { id, name, availableWindows: CourtWindow[] }  -- one window per day
 └─ Schedule          { ScheduledMatch[] }  — Match assigned to a Court + Day + time slot
```

A `Match` always belongs to exactly one `TournamentClass` and one phase
(`group` or `playoff`), which is what selects the average duration used to
size its slot.

### Multi-day tournaments

Most tournaments run over a weekend, so a `Tournament` has one or more
`TournamentDay`s, and each `Court`'s availability is a separate window per
day (a court can be open different hours, or not at all, on a given day).
Internally the scheduler places everything on one shared timeline where
each day is a fixed 24h-wide slot — far more than any court's real hours
plus the rest-time buffer — so a match can never accidentally be treated as
overlapping one from a different day, and a single running "next free time"
cursor per (court, day) is enough bookkeeping.

A `TournamentClass` can optionally be **pinned** to one day (`dayId`). This
is what powers "singles on day 1, doubles/mixed on day 2": pinned classes
only ever get offered that day's court windows.

### Ordering classes: the wave/pipeline strategy

Two related but different preferences came up:

1. *Which classes run before which, when everything's on one timeline*
   ("singles first, then doubles") — this is `TournamentClass.priority`,
   a simple ordering the organizer can reshuffle (up/down in the UI, or a
   one-click "Singles → Doubles/Mixed" preset).
2. *Not spreading every class thinly across the whole day* — running one
   category's group stage to completion, then starting its playoff
   alongside the next category's group stage, rather than dumping all
   categories onto the courts interleaved from minute one.

(2) is solved by how matches are ordered before handing them to the
scheduler (`domain/tournament.ts: generateAllMatches`). For classes
`C0, C1, C2, ...` in priority order, the match list is built as:

```
groups(C0)
playoff(C0) + groups(C1)   <- interleaved, sharing courts as they free up
playoff(C1) + groups(C2)   <- interleaved
playoff(C2)
```

Because the greedy scheduler places matches at the earliest free slot *in
list order*, this naturally keeps at most two classes "in flight" at a
time instead of scattering every class across the whole day — closer to
how a tournament is actually run, and it also keeps an individual player's
matches clustered in time (see below) since their class stays active for a
bounded stretch rather than being sprinkled throughout the day.

Day-pinning and priority ordering compose: if `C0`/`C1` are pinned to day 1
and `C2` to day 2, the pipeline's "run playoff(C1) alongside groups(C2)"
step simply can't co-locate them in time (they're on different days), so it
degrades gracefully to "day 1 finishes its own pipeline, day 2 runs its
own" — exactly the "singles day 1, doubles day 2" preference.

### Not dragging a player's day out

There's no explicit "minimize this player's span" optimization yet — v1's
answer is structural: the wave/pipeline ordering above keeps a class's
matches (and therefore a player's matches, since players are usually in
1–3 classes) clustered together in the schedule rather than dispersed
across the full day by naive interleaving. A true per-player span
minimization (e.g. as a secondary sort key when several slots tie, or a
post-pass that compacts gaps) is a reasonable v2 refinement once we can
see this heuristic's results against a real participant list.

## 3. Scheduling algorithm (v1, deliberately simple)

1. **Generate matches**
   - For each class: build round-robin groups from entrants (pool sizing
     around the class's configured `targetGroupSize`, +/-1 to use up
     remainders), then a seeded single-elimination bracket fed by each
     group's advancers (bracket matches are generated round-by-round as
     results come in — v1 can pre-generate the bracket "shape" and fill it
     in as a later pass once group play has a UI for entering results).
2. **Order matches** — the wave/pipeline strategy described above: classes
   in priority order, each class's playoff paired with the next class's
   group stage, day pins respected. Every match instance carries its
   participants (players), so the engine can check per-player conflicts
   across *classes* too (e.g. the same person's WD B match and XD C match
   must not overlap and must respect the minimum rest gap).
3. **Assign to courts (greedy, earliest-available-court, day-aware)**
   - For each match in order: find the earliest time slot, on any day the
     match's class is allowed to run on, on any court whose availability
     window can fit `avg duration for that match's phase`, such that none
     of the match's players are already scheduled within
     `[start - restGap, end + restGap]` on any other court (that gap check
     is scoped so matches on different days never falsely conflict).
   - Place it; advance that (court, day)'s cursor.
4. **Output**: a per-court timeline and a per-player itinerary, both derived
   from the same schedule data so they can never disagree.

This greedy approach won't be provably optimal, but it's transparent,
fast, and easy for an organizer to manually nudge afterward (v2: allow
drag-and-drop edits on top of the generated schedule, with live conflict
warnings using the same conflict-check function the generator uses).

## 4. Non-goals for v1

- No live/real-time score entry or umpiring features.
- No automatic playoff re-seeding mid-event (bracket is generated once
  group advancers are known; re-runs are manual for now).
- No accounts/multi-user sync — single organizer, single machine.

## 5. Tech stack decision

**Local-first web app**: React + TypeScript (Vite), running on the
organizer's own PC/Mac via `npm run dev` and opened in a browser. Data is
kept in the browser (and can be exported/imported as JSON) — no server
required today.

Why this over a native desktop shell (Electron) or a script:

- It runs identically on Windows and Mac (the "portable PC or Mac"
  requirement) with zero packaging work right now.
- The scheduling logic is written as **plain TypeScript with no DOM/browser
  dependency** (`app/src/domain/*`), so when hosting is needed later, the
  same module drops straight into a Node backend behind an API — no
  rewrite, just a new thin server wrapping the existing engine.
- If a "real" installable app is wanted later, the same React UI can be
  wrapped in Electron/Tauri with almost no changes, since it's already a
  self-contained web app with local storage.

## 6. Repo layout

```
/BLUEPRINT.md        this document
/app                  the React + TypeScript application
  /src
    /domain           pure TS: types, group/bracket generation, pipeline
                       ordering, and the scheduling engine (no React imports)
    /state             app state (days, classes, courts, players) + localStorage
    /components        UI screens (Days, Classes, Courts, Participants, Schedule)
```

## 7. Open questions for you

- **Participant file format**: once you share it, we'll add an importer
  that maps it into `Player` + class-membership records (this is the only
  piece we're intentionally deferring).
- **Multiple tournaments**: do you need to keep history of past
  tournaments in the app, or is it always "plan one event at a time"?
- **Player-span minimization**: worth a dedicated optimization pass once
  we can test the pipeline heuristic against a real participant list, or
  is "classes stay clustered" good enough in practice?

## 8. Roadmap after this v1 UX

1. Wire up real participant file import.
2. Manual schedule adjustment (drag-and-drop) with conflict highlighting.
3. Export schedule (PDF/print view, per-player itinerary printouts).
4. Persist tournaments to disk (JSON file) instead of just browser storage.
5. Optional: add a small backend so the same engine can run hosted.
6. Revisit player-span minimization as an explicit optimization once the
   pipeline heuristic has been tried against a real tournament.
