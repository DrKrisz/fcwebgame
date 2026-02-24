# fcwebgame

THE FOOTBALL GAME is a browser-based football career simulator where you guide a player from youth academy prospect to club legend (or early retirement).

## Features

- Create a player profile (name, position, nationality).
- Pick from randomized youth academies with different stat bonuses.
- Progress season by season through choices, events, contracts, transfers, and injuries.
- Track career milestones: goals, assists, earnings, trophies, Ballon d'Or history, and retirement summary.
- Use quick actions like marketplace access, boosters, restart, and fast retire.

## Tech Stack

- Plain HTML, CSS, and JavaScript (ES modules)
- No build step, no external framework required

## Run Locally

Because the game uses JavaScript modules, run it through a local server (not by double-clicking `index.html`).

### Option 1: Python (quickest)

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

### Option 2: VS Code Live Server

Open the folder in VS Code and launch with Live Server if you prefer extension-based hosting.

## How to Play

1. Enter your player details on the intro screen.
2. Select an academy (or reroll/randomize).
3. Click **BEGIN YOUR JOURNEY**.
4. Make seasonal choices and respond to events.
5. Manage fitness, performance, contract value, and transfers.
6. Continue until retirement and review your career legacy.

## Project Structure

```text
index.html
README.md
scripts/
	actions.js      # Button/action routing
	data.js         # Clubs, tiers, academy pools, static data
	events.js       # Career event generation and outcomes
	game.js         # Game init/start logic and core setup
	main.js         # App bootstrap and global click handling
	retire.js       # Retirement flow and summary logic
	season.js       # Season progression systems
	state.js        # Central runtime state
	transfers.js    # Transfer/market systems
	ui.js           # Rendering/UI updates
	utils.js        # Shared helpers and calculations
styles/
	base.css
	components.css
	layout.css
```

## Notes

- This is a frontend-only game state runtime (no backend/database).
- Refreshing or restarting resets active session state unless you add persistence.