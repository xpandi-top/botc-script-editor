# BOTC Storyteller Companion - Design Document

## Project Overview

**Purpose**: A companion tool for offline Blood on the Clocktower storytelling.

**Platform**: Cross-platform (iOS, Android, Web)

---

## Core Concepts

### 1. Game
- Each game has one script
- Contains multiple players
- Contains multiple Day/Night phases

### 2. Player Types
- **Normal Player**: Standard game role
- **Traveler**: Special roles that don't count toward team totals

### 3. Player Status
| Status Type | Visibility | Examples |
|------------|------------|-----------|
| Public | All players | Dead, Alive |
| ST-only | Storyteller only | Drunk, Poisoned, Protected, Evil, Good |

### 4. Character Abilities
| Type | Function |
|------|----------|
| Information | Know character/team, ask ST, inform others |
| Functional | Change character, status, Mad others |

### 5. Voting Rules
- Dead players get one final vote
- Alive players vote each nomination
- Special rules can override

---

## UI Layout Specification

### Responsive Breakpoints
| Mode | Layout |
|-----|--------|
| Portrait | Stacked: DayInfo → Phase → Nominate → History |
| Landscape | Side-by-side: Left=Controls+Info, Right=Nominate |

### Screen Zones (Portrait)

```
┌─────────────────────────────────┐
│         Upper Zone (1/6)         │
│  PlayerCount | Script | BGM    │
├─────────────────────────────────┤
│                                 │
│         Main Zone (5/6)         │
│                                 │
│    Players Circle (Arena)       │
│                                 │
│    Day Info + Phase Control     │
│                                 │
│       Nominate Sheet            │
│                                 │
│      Nomination History         │
│                                 │
└─────────────────────────────────┘
```

---

## Component Specifications

### 1. Header Bar (Upper Zone ~1/6 height)

#### Left Section: Status Display
| Element | Action | Popup |
|--------|--------|-------|
| PlayerCount | Click | Shows breakdown: Townsfolk/Outsider/Minion/Demon |
| Script Name | Click | Script selector dropdown |
| Script Characters | Click | Character list sidebar |
| Night Order | Click | Night order sidebar |

#### Center Section: Media Player
- Current track name
- Play/Pause toggle
- [+] icon for adding local files
- Loop mode indicator

#### Right Section: Actions
| Button | Function |
|--------|----------|
| New Game | Opens modal |
| Edit Players | Opens modal |
| End Game | Opens modal |
| Show/Hide Log | Toggle sidebar |

### 2. Arena (Main Zone ~5/6 height)

#### Layout
- Circular table with player seats around perimeter
- Center displays: Day number, Current phase, Countdown timer
- Rectangle layout: Height = 3/4 of visible screen
- Pointer from table center to selected player card

#### Player Card
- Seat number + Name (same row)
- Status tags as chips
- Click to edit tags
- Selected state shows full tag editor

### 3. Phase Controls

| Phase | Countdown | Alarm | Actions |
|-------|-----------|------|---------|
| Night | None | None | Play/Pause music, ST controls only |
| Private | Yes | End alarm | Start conversation |
| Public-Free | Yes | End alarm | Enable nomination |
| Public-Turn | Per player | Announce | Next speaker |
| Nomination | Yes | Result | Nominate button |

### 4. Nomination Sheet (Compact)

#### Elements
- Toggle: Nomination / Exile (auto-change for travelers)
- Nominator selector (dropdown or click card)
- Nominee selector (dropdown or click card)
- Vote threshold display
- Vote buttons (Yes/No)
- Vote override dropdown
- Note text field
- Compact Record / Clear buttons

### 5. Right Sidebar (Single visible at a time)

| Sidebar | Purpose |
|--------|---------|
| Log | Event history |
| Export | Data export |
| Settings | All settings consolidated |

### 6. Log Viewer

#### Filters
- Phase: Multi-select dropdown
- Day: Current day default
- Visibility: ST-only toggle

#### Structure
```
Day 1 (expandable)
├── Night
│   └── Events
├── Private
│   └── Events
├── Public
│   └── Events
└── Nomination
    └── Events
```

#### Event Types
```
[Tag] Player X add/remove tag
[Ability] Player X claims character → targets
[Nominate] #X nominates #Y → pass/fail → votes/threshold → voters
[Exile] #X exiles #Y → votes/threshold → voters
```

---

## Modal Specifications

### 1. New Game Modal

#### Sections
| Section | Elements |
|---------|----------|
| Setup | Player count (5-15), Traveler count (0-5), Script dropdown |
| Players | Grid input, name pool, Random/Reset buttons |
| Characters | Calculated vs Actual vs Perceived counts, Random/Reset |
| Per Seat | Character selector, User override dropdown, Note field |
| Travelers | Note only field |
| Options | Checkboxes: duplicates, empty chars, same names |
| Notes | Freeform text |

### 2. End Game Modal

| Field | Type |
|------|------|
| Winner | Select: Evil/Good/ST |
| Evil Team | Multi-select seats |
| Good Team | Multi-select seats |
| MVP | Select player |
| Balanced | Rating 1-5 |
| Fun Evil | Rating 1-5 |
| Fun Good | Rating 1-5 |
| Replay | Rating 1-5 |
| Notes | Freeform text |

### 3. Export Modal

| Option | Default |
|--------|---------|
| Include Seats | Yes |
| Include Votes | Yes |
| Include Skills | Yes |
| Include Events | Yes |
| Include ST Notes | No |
| Day Filter | All or selected |

---

## Settings Specification

### 1. Countdown Settings
| Field | Default |
|-------|---------|
| Private | 5 min |
| Public-Free | 5 min |
| Public-Turn | 30 sec/person |
| Nomination Accept | 2 min |

### 2. Alarm Settings
| Field | Type |
|------|------|
| Sound | Select dropdown + local file |
| Enable | Toggle |

### 3. Announcement Settings
| Field | Type |
|------|------|
| Phase Change | Toggle |
| Last 10 Seconds | Toggle + voice |

### 4. Tag Settings
| Section | Tags |
|---------|------|
| Default | Dead, Executed, Traveler, No vote |
| ST-only | Drunk, Poisoned, Protected |

---

## Data Structures

### Game State
typescript
interface GameState {
  id: string
  script: EditableScript
  players: Player[]
  days: Day[]
  currentDay: number
  startTime: Date
  meta: GameMeta
}

interface Player {
  seat: number
  name: string
  characterId: string | null
  userCharacterId: string | null
  team: 'good' | 'evil' | null
  alive: boolean
  isTraveler: boolean
  hasNoVote: boolean
  isExecuted: boolean
  customTags: string[]
  stTags: STTag[]
  note: string
}
```

### Log Event
typescript
interface LogEvent {
  id: string
  day: number
  phase: 'night' | 'private' | 'public' | 'nomination'
  timestamp: Date
  visibility: 'public' | 'st-only'
  type: 'tag' | 'ability' | 'nominate' | 'vote' | 'exile'
  actor: number | null
  target: number | null
  data: Record<string, unknown>
}
```

---

## File Structure Target

| File | Target Lines | Current |
|------|------------|---------|
| useStoryteller.ts | ~2000 | ~1500 |
| Arena/index.ts | ~300 | ~200 |
| Arena/ArenaSeat.ts | ~150 | ~100 |
| Arena/ArenaCenter*.ts | ~200 | ~150 |
| Modals/*.ts | ~50 each | ~80 each |
| RightConsole/*.ts | ~80 each | ~50 each |
| Total | ~4000 | ~3500 |

---

## Priority Implementation Order

### Phase 1: Critical Fixes
1. Default tags correction (Dead, Executed, Traveler, No vote)
2. "Skill" → "Ability" text change
3. Compact nominate buttons

### Phase 2: Layout Improvements
1. Header zone (1/6 height)
2. Arena height = 3/4 screen
3. Single sidebar visibility

### Phase 3: Feature Improvements
1. Media player redesign
2. New Game modal enhancements
3. End Game survey improvements
4. Log viewer improvements

### Phase 4: Polish
1. Add ST-only tag section
2. Night phase card enhancements
3. Animation polish
4. Performance optimization

---

## Open Questions

1. Should night order sidebar show on left or right?
2. How to handle traveler character assignment - separate from normal pool?
3. Export format preference - JSON sufficient?
4. Should sounds be hosted or local only?