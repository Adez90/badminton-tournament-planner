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
 ├─ Player            { id, name, club, (per-event class memberships) }
 ├─ Pairing           (a Team for doubles/mixed = 2 Players; singles = 1 Player)
 ├─ TournamentClass   { id, eventType: MS|WS|MD|WD|XD, skillClass: Elit|A|B|C|D|..,
 │                       avgGroupMatchMinutes, avgPlayoffMatchMinutes,
 │                       groupAdvanceCount (how many per group go to playoff) }
 │    ├─ Group[]       { entrants: Pairing[], round-robin Match[] }
 │    └─ PlayoffBracket { seeded single-elim Match[] }
 ├─ Court             { id, name, availableWindows: {start, end}[] }
 └─ Schedule          { ScheduledMatch[] }  — Match assigned to a Court + time slot
```

A `Match` always belongs to exactly one `TournamentClass` and one phase
(`group` or `playoff`), which is what selects the average duration used to
size its slot.

## 3. Scheduling algorithm (v1, deliberately simple)

1. **Generate matches**
   - For each class: build round-robin groups from entrants (pool sizing
     4, with 3/5 fallback), then a seeded single-elimination bracket fed by
     each group's advancers (bracket matches are generated round-by-round as
     results come in — v1 can pre-generate the bracket "shape" and fill it
     in as a later pass once group play has a UI for entering results).
2. **Order matches**
   - Group-stage matches first, ordered to spread a class's own groups
     across courts.
   - Every match instance carries its participants (players), so the engine
     can check per-player conflicts across *classes* too (e.g. the same
     person's WD B match and XD C match must not overlap and must respect
     the minimum rest gap).
3. **Assign to courts (greedy, earliest-available-court)**
   - For each match in order: find the earliest time slot, on any court
     whose availability window can fit `avg duration for that match's
     phase`, such that none of the match's players are already scheduled
     within `[start - restGap, end + restGap]` on any other court.
   - Place it; advance that court's cursor.
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
    /domain           pure TS: types + scheduling engine (no React imports)
    /components        UI screens (Classes, Courts, Participants, Schedule)
    /data              sample/mock data for development
```

## 7. Open questions for you

- **Participant file format**: once you share it, we'll add an importer
  that maps it into `Player` + class-membership records (this is the only
  piece we're intentionally deferring).
- **Group advancement**: should this be fixed per class (e.g. "top 2
  always") or configurable per tournament?
- **Multiple tournaments**: do you need to keep history of past
  tournaments in the app, or is it always "plan one event at a time"?

## 8. Roadmap after this v1 UX

1. Wire up real participant file import.
2. Manual schedule adjustment (drag-and-drop) with conflict highlighting.
3. Export schedule (PDF/print view, per-player itinerary printouts).
4. Persist tournaments to disk (JSON file) instead of just browser storage.
5. Optional: add a small backend so the same engine can run hosted.
