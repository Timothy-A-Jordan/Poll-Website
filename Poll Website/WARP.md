# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- This is a minimal, framework-free frontend implemented with plain JavaScript and CSS under src/.
- There is no package.json, build system, linter config, or test runner configured in this repo.

Commands and development workflow
- Build: not applicable (no build tooling present).
- Lint/Format: not configured.
- Tests: not configured.
- Running locally: an HTML host file is required to mount the UI and load src/app.js and src/styles.css. The repository does not include an index.html; create or use a host HTML that defines the required elements (see Architecture) and includes:
  - <link rel="stylesheet" href="./src/styles.css"> in the <head>
  - <script src="./src/app.js" defer></script> before </body>

High-level architecture
- UI paradigm: DOM-driven, single-page script using an IIFE in src/app.js. All interactions are wired via element IDs queried at startup:
  - question, description, options-list, addOptionBtn, createPollBtn, pollsList
- State and persistence:
  - Polls: localStorage key quickpolls.polls.v1 stores an array of poll objects.
  - Votes: localStorage key quickpolls.votes.v1 stores a map { [pollId]: optionId } to prevent multiple votes per device.
  - Poll model: { id, question, description, options: [{ id, text, votes }], createdAt, endsAt }. Polls default to a 24-hour duration (endsAt = createdAt + 24h).
- Rendering and updates:
  - render(): Renders all polls into pollsList. While active, each option row shows a Vote button (disabled if already voted). After end, options render a progress bar and percentage.
  - tick(): Runs every 30s to update countdown text and re-render when a poll crosses from Active to Ended.
- Constraints and behaviors:
  - Options are user-defined via dynamic inputs; at least two are required, and a maximum of six are considered.
  - Option IDs are generated as o0, o1, ... by index; poll IDs are random prefixed strings (uid()).
  - Voting is blocked after endsAt and once a vote exists for that poll in quickpolls.votes.v1.

File structure
- src/app.js: All application logic — option input management, poll CRUD, rendering, voting, and countdown updates.
- src/styles.css: Theme and layout styles for cards, buttons, forms, and poll results.

Notes for future changes
- To run or demo the app, add a minimal index.html (or equivalent host) that includes the required element IDs listed above and loads the two src files. If you introduce tooling (e.g., Vite/Parcel) or tests, update this WARP.md with the relevant commands.
