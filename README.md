# fcwebgame

THE FOOTBALL GAME is a browser-based football career simulator where you guide a player from youth academy prospect to club legend (or early retirement).

[Play the published version](https://drkrisz.github.io/fcwebgame/)

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

## Tests

Node.js 22 or newer is needed only for the tests. There are no npm dependencies to install:

```bash
npm test
```

The tests cover position-weighted ratings, rating bounds, salary and contract
boundaries, release clauses, and market value during bans and recovery.
They import the real calculation modules and reset shared game state after each
test. They do not exercise browser rendering or simulate a complete career.

## Development history

Changes recorded under DrKrisz include
[season choices, contracts and national teams](https://github.com/DrKrisz/fcwebgame/commit/fff1d70e304d13907bf3764bc85ae6b0eb3a886d)
and [career log export and retirement charts](https://github.com/DrKrisz/fcwebgame/commit/34f9c4db282af87b882a6470ce9b2e658f7aba9c).
These are concrete starting points for discussing the game's implementation.

## Design and limitations

The application routes delegated `data-action` clicks through `main.js` and
`actions.js`, updates the shared `state` object, and renders through `ui.js`.
Calculation helpers can be tested without a browser. Several gameplay modules
also call UI functions, so the boundary between rules and presentation is partial.

- Outcomes use `Math.random()`; repeated careers will differ.
- Clubs and game economy rules are maintained as static game data rather than live football data.
- Shared mutable state makes multi-step flows harder to test in isolation.
- The unit tests are a small regression suite, not full gameplay coverage.

## Notes

- This is a frontend-only game state runtime (no backend/database).
- Refreshing or restarting resets active session state unless you add persistence.
