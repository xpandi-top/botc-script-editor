# Storyteller Helper Refactor Roadmap

## Core Vision
Refactor the Storyteller Helper into a professional, modular, and maintainable automation tool. This includes a complete UI/UX overhaul, advanced game setup, and a dedicated Night Phase automation layer.

---

## Technical Constraints & Standards
- **File Size:** Component files should aim for ~200 lines. Extract sub-components aggressively.
- **Top Alignment:** All side panels and the main arena must align at the top with a shared height of **83.33vh (5/6 screen)**.
- **Maintainability:** Use shared hooks for game logic and reusable UI components.
- **ST Privacy:** Actual roles and ST-only tags are strictly hidden unless "ST Info" or "Night Mode" is active.

---

## Phase 1: Foundation & UI Normalization
*Foundation for a consistent professional look.*
- [ ] **Global CSS Variables:** Define standard `--btn-padding`, `--font-size-sm/md/lg`, and `--panel-height`.
- [ ] **Header Reduction:** Decrease height of main page header and language dropdown across all tabs.
- [ ] **Critical UI Fixes:**
    - [ ] **Containment:** Fix CSS to ensure "Ability" and "Add Tag" buttons stay inside player cards.
    - [ ] **Audio Engine:** Clicking "Stop" on any timer must kill the active Alarm/Alert sound.
- [ ] **Mathematics:** Recalculate pointer hand vector from Absolute Table Center to Absolute Card Center.

## Phase 2: Architecture & Visualization
*The responsive skeleton and active feedback.*
- [ ] **Three-Panel Grid:** Implement `[Left Info/ST Hub] [Center Arena] [Right Console]`.
- [ ] **Independent Scrolling:** Enable `overflow-y: auto` for side panels.
- [ ] **Responsive Orientation:**
    - **Landscape:** Side-by-side panels.
    - **Portrait:** Vertical stack (Info -> Controls -> Arena -> Sheet).
- [ ] **Ultra-Compact View:** Toggle button for "Single Card Mode" with a seat-selector dropdown.
- [ ] **Active Player Highlight:** "Heartbeat" background pulse for the current speaker or voter.

## Phase 3: Advanced Setup & Logic
*Highly detailed game initialization.*
- [ ] **New Game Modal (3-Tab System):**
    - **Tab 1: Config:** Rules toggles (duplicates, empty, same name), 9/0 default counts, and "Special Note".
    - **Tab 2: Players:** Grid assignment shared with Edit Players; includes [Random Assign], [Reset], and Hidable Name Pool.
    - **Tab 3: Characters:** Visual icons + names; dual-field (Actual vs User); Auto-team tagging logic (Minion/Demon = Evil).
- [ ] **Triple-Distribution Tracker:** Display [Calculated] [Actual] [User-Perceived] stats for role teams.
- [ ] **Demon Bluffs:** Section to select 3 unused characters to show the Demon.
- [ ] **Undo System:** Implement 1-step global state revert.

## Phase 4: Mechanics & Console Tools
*Smart storytelling automation.*
- [ ] **Information Panel (Hidable):**
    - Stats: Alive/Total and Smart Thresholds.
    - Tracker Lists: `Nominated Today`, `Nomination Today`, `Travelers`, `Dead`, `Tagged`.
- [ ] **Smart Nomination Sheet:**
    - **Nomination vs. Exile:** Toggle modes (Auto-Exile for travelers).
    - **Exile Threshold:** Set strictly to $\ge 50\%$ total headcount.
    - **Smart Voting:** Auto-skip to next voter; skip "No Vote" players.
    - **Vote Adjustment:** Add `[+] / [-]` buttons to tweak final counts.
- [ ] **Sidebar Reorganization:** Left-aligned sidebar in the right popup with [Log], [Export], [Settings].
- [ ] **Checklist Export:** Checklist to choose categories for JSON download.

## Phase 5: Post-Game & Survey
*Clean game wrap-up and data persistence.*
- [ ] **Chinese Translation Fix:** Simplified labels: **选择邪恶阵营玩家** and **选择善良阵营玩家**.
- [ ] **The "Game Over" Lock:** 
    - "Ended" status disables new day creation.
    - Navigation: Allow moving backward/forward through existing days only.
- [ ] **Survey Management:** Save survey data and final game status with a dedicated [Save] button.

## Phase 6: Night Phase Automation (Capstone)
*The final layer of ST tools.*
- [ ] **ST Info Layer:** Toggle to reveal Actual Characters and ST Tags on cards.
- [ ] **Ability Sheet (Interaction Popup):**
    - Triggered by clicking User Character name.
    - Manage Madness, Role Changes, and Tag durations.
- [ ] **Visual Tag Overhaul:** Detailed format `[Status][Target][Night][M/A][Source]`.
- [ ] **ST Hub (Left Drawer):**
    - Edit Storyteller Name and Note.
    - Reference: Icons and abilities for selected Fabled/Loric characters.
- [ ] **Checkpoint System:** "Informed" buttons that auto-log interactions.
