# BOTC Companion — Test Plan

Covers all tabs and major user flows. Tests are grouped by tab, then by use case and edge case. Run on both desktop (≥ 1280 px) and mobile (375 px / 390 px).

---

## 0. Global / Cross-Tab

### 0-1 Theme Toggle
| # | Action | Expected |
|---|--------|----------|
| G-01 | Toggle dark ↔ light via Settings | All tabs re-render correctly; no white-on-white or black-on-black text |
| G-02 | Refresh page | Theme persists |
| G-03 | Open on mobile (375 px) | Header collapses; bottom nav visible; no horizontal scroll |

### 0-2 Language Toggle (EN ↔ ZH)
| # | Action | Expected |
|---|--------|----------|
| G-04 | Switch language | All labels, tooltips, ability text update immediately |
| G-05 | Switch mid-game | Game state unaffected; only UI strings change |

### 0-3 Header Icons
| # | Action | Expected |
|---|--------|----------|
| G-06 | Click 🐛 Feedback | Opens Google Form in new tab |
| G-07 | Click ℹ Info | Shows/hides tab description panel |
| G-08 | Info icon stays right-aligned at all viewport widths | No overlap with tabs or title |

---

## 1. Scripts Tab

### 1-1 Core Browsing
| # | Action | Expected |
|---|--------|----------|
| S-01 | Open Scripts tab | Official / Community / DIY sections visible; at least one script listed |
| S-02 | Click a script | Character list and PDF preview render |
| S-03 | Toggle Official / Community sections | Accordion collapses / expands |
| S-04 | Search by name | Filtered results; case-insensitive |

### 1-2 Script Selection
| # | Action | Expected |
|---|--------|----------|
| S-05 | Select script → go to Storyteller | Storyteller picks up the selected script |
| S-06 | Select script → go to Print Studio | Print Studio reflects script |

### 1-3 Custom Script Upload
| # | Action | Expected |
|---|--------|----------|
| S-07 | Upload valid JSON script | Appears in DIY section with correct characters |
| S-08 | Upload malformed JSON | Error message; no crash |
| S-09 | Upload script with custom character (name + ability fields) | Custom character displayed in list |
| S-10 | Upload duplicate script | Slug de-duplicated; both entries visible |

### 1-4 Script Editing
| # | Action | Expected |
|---|--------|----------|
| S-11 | Toggle Edit Mode → add character | Character appears in live preview |
| S-12 | Remove character | Removed immediately from list |
| S-13 | Export edited script as JSON | Downloaded file matches current state |
| S-14 | Export to PDF | PDF renders with correct characters; images load |

### Edge Cases
| # | Scenario | Expected |
|---|----------|----------|
| S-E1 | Script with 0 characters | Empty state message; no crash |
| S-E2 | Script with 40+ characters | Long list scrolls; no layout break |
| S-E3 | Character with no icon | Placeholder shown; no broken image |
| S-E4 | Offline (no network) | Cached assets render; no blank screen |

---

## 2. Characters Tab

### 2-1 Browsing
| # | Action | Expected |
|---|--------|----------|
| C-01 | Open Characters tab | All characters listed |
| C-02 | Filter by team (Townsfolk / Outsider / Minion / Demon / Traveler) | Filtered correctly |
| C-03 | Filter by edition | Shows only matching edition |
| C-04 | Search by name | Matching characters highlighted; others dimmed |
| C-05 | Search non-existent name | Empty result; no crash |

### 2-2 Character Detail
| # | Action | Expected |
|---|--------|----------|
| C-06 | Click character card | Ability text expands / detail dialog opens |
| C-07 | Ability text in ZH | Chinese ability text shown if available |
| C-08 | Character icon loads | Image renders at correct size |

### Edge Cases
| # | Scenario | Expected |
|---|----------|----------|
| C-E1 | All filters active simultaneously | Intersection logic; may result in empty set |
| C-E2 | Character with jinx | Jinx shown in detail view |
| C-E3 | Custom character from uploaded script | Appears alongside official characters |

---

## 3. Storyteller Tab

### 3-1 New Game Setup
| # | Action | Expected |
|---|--------|----------|
| ST-01 | Open New Game modal | Modal opens; player count defaults to 9 |
| ST-02 | Change player count (5–15) | Seat rows update; distribution recalculates |
| ST-03 | Add traveler (0–5) | Traveler rows appended |
| ST-04 | Select script | Character picker reflects script; previous assignments kept |
| ST-05 | Random assign characters | All seats filled from correct distribution |
| ST-06 | Random assign with custom pool | Only pool characters assigned |
| ST-07 | Manually assign characters | Assignment saved per seat |
| ST-08 | Set demon bluffs (3 slots) | Saved; shown in skill overlay |
| ST-09 | Enter player names via quick-fill (comma-separated) | Seats populated in order |
| ST-10 | Enter player names individually | Individual fields editable |
| ST-11 | Click Start New Game | Modal closes; arena shows correct seats and names |

### 3-2 Phase Control
| # | Action | Expected |
|---|--------|----------|
| ST-12 | Switch Night → Private → Public → Nomination | Phase banner and background atmosphere change |
| ST-13 | Start night BGM | Audio plays; play/pause/stop work |
| ST-14 | Start timer | Counts down; alarm fires at 0 |
| ST-15 | Pause / resume timer | Correct remaining time |
| ST-16 | Edit timer inline | New value applied on Enter / blur |

### 3-3 Player Seat Interaction
| # | Action | Expected |
|---|--------|----------|
| ST-17 | Click seat (desktop circle) | Player modal opens |
| ST-18 | Click seat (mobile grid) | Player modal opens |
| ST-19 | Change actual character | Seat updates; badge reflects new team/type |
| ST-20 | Add ST tag | Tag visible on seat with 📝 badge |
| ST-21 | Remove ST tag | Tag removed |
| ST-22 | Mark player dead | Seat shows † indicator |
| ST-23 | Toggle has-no-vote | Seat shows ⊘ |
| ST-24 | Record night skill (Know type) | Skill logged in event log |
| ST-25 | Record skill — Characters result | Character picker grouped by team; bluffs amber; not-in-play dimmed |
| ST-26 | Record skill — Demon Bluffs result | 3 bluff chips shown; auto-logged |
| ST-27 | Record skill — Change Team | teamTag updates; G/E badge changes immediately |
| ST-28 | Open ability info ℹ | Full ability dialog for that character |

### 3-4 Nomination Phase
| # | Action | Expected |
|---|--------|----------|
| ST-29 | Enter Nomination phase | Nomination sheet button and Next Day button appear |
| ST-30 | Pick nominator + nominee | Vote sheet opens |
| ST-31 | Record votes | Count increments; required threshold shown |
| ST-32 | Mark vote passed | Nomination logged as PASS in green |
| ST-33 | Mark vote failed | Nomination logged as FAIL in red |
| ST-34 | Exile flow | Exile flag set; threshold = all seats / 2 |
| ST-35 | Delete nomination record | Removed from history |
| ST-36 | Click Next Day (ArrowForwardIos) | New day created; carries over seat states |

### 3-5 Script Panel
| # | Action | Expected |
|---|--------|----------|
| ST-37 | Open left script panel | Characters grouped by team |
| ST-38 | Toggle First Night / Other Nights tab | Correct ordered list |
| ST-39 | Click character in night list | Ability description expands |
| ST-40 | Toggle Show Abilities (📖) | All abilities show / hide |
| ST-41 | Change script in Edit Game modal | Script panel updates to new script |

### 3-6 Game Log
| # | Action | Expected |
|---|--------|----------|
| ST-42 | Open log (ViewTimeline icon) | All events listed chronologically |
| ST-43 | Filter by type (vote / skill / event) | Filtered entries only |
| ST-44 | Filter by visibility (public / ST-only) | Correct entries shown |
| ST-45 | Share public log | Share text contains only public entries |
| ST-46 | Share ST log | Share text includes ST-only and tagChange events |
| ST-47 | Edit log entry | Inline edit saves |
| ST-48 | Delete log entry | Entry removed |

### 3-7 Multi-Day
| # | Action | Expected |
|---|--------|----------|
| ST-49 | Advance multiple days | Day selector shows all days |
| ST-50 | Navigate back to Day 1 | Day 1 state restored |
| ST-51 | Undo action | Previous state restored |

### Edge Cases
| # | Scenario | Expected |
|---|----------|----------|
| ST-E1 | 15 players + 5 travelers (20 seats) | Arena circle and grid handle 20 seats |
| ST-E2 | Start game with no script selected | Falls back to first available script |
| ST-E3 | Character assigned to multiple seats (duplicate allowed) | Both seats show character |
| ST-E4 | Refresh page mid-game | State restored from localStorage |
| ST-E5 | Switch script with assignments already set | Assignments kept; script panel updates |
| ST-E6 | Enter nomination with 0 living players | No crash; empty eligible voter list |
| ST-E7 | Override vote count manually | Threshold comparison uses override value |

---

## 4. Analytics Tab

### 4-1 Records
| # | Action | Expected |
|---|--------|----------|
| A-01 | Save game record | Record appears in list |
| A-02 | Load record | Storyteller loads saved game state |
| A-03 | Delete record | Removed from list |
| A-04 | Filter records by script | Shows matching records only |

### 4-2 Stats
| # | Action | Expected |
|---|--------|----------|
| A-05 | View win-rate chart | Chart renders; good/evil split visible |
| A-06 | Character frequency | All assigned characters counted |
| A-07 | Demon bluff frequency | Bluff characters counted separately |
| A-08 | Filter by date range | Stats update dynamically |

### Edge Cases
| # | Scenario | Expected |
|---|----------|----------|
| A-E1 | 0 records | Empty state; no chart crash |
| A-E2 | Record with no demon bluffs | Analytics skips bluff section gracefully |

---

## 5. Print Studio Tab

### 5-1 Core
| # | Action | Expected |
|---|--------|----------|
| P-01 | Select script | Role cards render |
| P-02 | Toggle bilingual | Both EN + ZH text shown |
| P-03 | Change font size | Cards reflow |
| P-04 | Print / Save PDF | PDF matches preview; images included |

### Edge Cases
| # | Scenario | Expected |
|---|----------|----------|
| P-E1 | Script with 0 characters | Empty print area; no crash |
| P-E2 | Print on mobile | Print dialog opens; layout passable |

---

## 6. Settings Tab

| # | Action | Expected |
|---|--------|----------|
| ST-G1 | Change font | App-wide font updates |
| ST-G2 | Change theme | Persists on reload |
| ST-G3 | Reset settings | Defaults restored |

---

## Regression Checklist (run after each release)

- [ ] New Game → Start → play through Night + Day + Nomination + Next Day
- [ ] Edit Game mid-session: change script, player names, assignments
- [ ] Upload custom script → verify in Scripts tab and Storyteller
- [ ] Print a script to PDF
- [ ] Save game record → reload page → load record
- [ ] Switch EN ↔ ZH and verify no broken strings
- [ ] Test on mobile 375 px (portrait and landscape)
- [ ] Test on tablet 768 px portrait
