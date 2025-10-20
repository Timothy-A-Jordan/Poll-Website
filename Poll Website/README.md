# QuickPolls (frontend prototype)

A simple static front-end to create polls, vote (per-device), and see results after 24 hours.

How to run
- Open index.html in your browser directly, or
- Serve the folder with any static file server (e.g., `python -m http.server`), then visit http://localhost:8000

Notes
- Data is stored in your browser's localStorage, so it resets per browser/device.
- Polls end automatically 24 hours after creation. Before ending, users can vote once per poll per device.

Project structure
- index.html — markup
- src/styles.css — styles
- src/app.js — behavior
