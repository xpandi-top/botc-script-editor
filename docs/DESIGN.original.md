# BOTC Storyteller Companion - Design Document

## Project Overview

**Purpose**: A companion tool for offline Blood on the Clocktower storytelling.

**Platform**: Cross-platform (iOS, Android, Web)

**Tech Stack**: React 19 + TypeScript 5.8 + Vite 6 + MUI 9

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

## Architecture

### State Management
- **Script viewer**: local `useState` in `App.tsx`
- **Game state**: `src/hooks/useStoryteller.ts` - persisted to localStorage key `BOTC_ST_STORAGE`
- **Sub-hooks**: `useGameLifecycle`, `useGameActions`, `useUIState`, `useAudioState`

### Data Loading
`src/catalog.ts` uses Vite `import.meta.glob()` to eagerly load:
- `/assets/characters/*.json` - character definitions
- `/assets/scripts/*.json` - script definitions
- `/assets/icons/*` - character icon images
- `/assets/locales/{en,zh}.json` - UI strings + character abilities

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
│         Upper Zone (1/6)        │
│  PlayerCount | Script | BGM     │
├─────────────────────────────────┤
│                                 │
│         Main Zone (5/6)         │
│                                 │
│    Players Grid (1 or 2 columns)│
│                                 │
│    Day Info + Phase Control     │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

---

## Component Specifications

### 1. CompactToolbar (Upper Zone ~1/6 height)

#### Left Section: Status Display
| Element | Action | Popup |
|--------|--------|-------|
| PlayerCount | Click | Shows breakdown: Townsfolk/Outsider/Minion/Demon |
| Script Name | Click | Script selector dropdown |
| Night Order | Click | Night order sidebar |

#### Center Section: Media Player
- Current track name
- Play/Pause toggle
- [+] icon for adding local files
- Volume slider

#### Right Section: Actions
| Button | Function |
|--------|----------|
| New Game | Opens modal |
| Edit Players | Opens modal |
| End Game | Opens modal |
| Undo | Undo last action |
| Menu | Toggle right panel |

### 2. Arena (Main Zone ~5/6 height)

#### Layout
- Circular table with player seats around perimeter
- Center displays: Day number, Current phase, Countdown timer
- Grid layout option via toggle (landscape: seats left, portrait: seats above)

#### Player Card
- Seat number + Name (same row)
- Status tags as chips (with character icons)
- Click to edit tags
- Selected state shows full tag editor

### 3. Phase Controls (ArenaCenterContent)

| Phase | Countdown | Alarm | Actions |
|-------|-----------|------|---------|
| Night | None | None | Play/Pause music, Show Character, Wake Order, Edit |
| Private | Yes | End alarm | Start conversation |
| Public | Yes | End alarm | Free/RoundRobin mode, Enable nomination |
| Nomination | Yes | Result | Nominate button, Next Day |

### 4. Nomination Sheet (ArenaCenterNominationSheet)

#### Elements
- Toggle: Nominator / Nominee / Vote timer
- Nominator selector (dropdown or click card)
- Nominee selector (dropdown or click card)
- Vote threshold display
- Vote buttons (Yes/No)
- Vote override dropdown
- Note text field
- Record / Clear buttons
- History with filters (All/Exile/Nomination)

### 5. Right Console (Single visible at a time)

| Sidebar | Purpose |
|--------|---------|
| Player | Selected player details, tags |
| Day | Day history |
| Game | Script, restart, export |
| Records | Saved games |
| Tags | Tag management |
| Settings | All settings consolidated |

### 6. Log Viewer

#### Filters
- Type: Vote / Skill / Event
- Visibility: Public / ST-only / All
- Day: Current day default

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
| Include Events | No |
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
| Nomination Actor | 60 sec |
| Nomination Target | 60 sec |

### 2. Alarm Settings
| Field | Type |
|------|------|
| Sound | Select dropdown + local file |
| Enable | Toggle |

### 3. Tag Settings
| Section | Tags |
|---------|------|
| Default | Dead, Executed, Traveler, No vote |
| Character Tags | 💀characterId format |

---

## Data Structures

### Game State
```typescript
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
  customTags: string[]  // Character tags: "💀charId"
  stTags: STTag[]
  note: string
}
```

### Log Event
```typescript
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

## File Structure

```
src/
├── main.tsx                    # React root, MUI theme injection
├── App.tsx                     # Tab router (scripts | characters | settings | storyteller)
├── catalog.ts                  # All data loading + character utility functions
├── types.ts                    # Core types
├── theme/index.ts              # MUI theme config
├── hooks/
│   ├── useStoryteller.ts       # Main game state hook
│   ├── useGameLifecycle.ts     # Phase transitions
│   ├── useGameActions.ts       # Votes/skills/events
│   ├── useUIState.ts           # UI state management
│   ├── useAudioState.ts        # Audio player state
│   ├── useHistory.ts           # Undo/redo
│   └── useI18n.ts             # Localization
├── components/
│   ├── StorytellerHelper.tsx   # Main storyteller entry
│   └── StorytellerSub/
│       ├── Arena/
│       │   ├── index.tsx      # Arena wrapper
│       │   ├── ArenaSeats.tsx # Seats container
│       │   ├── ArenaSeat.tsx  # Individual seat card
│       │   ├── ArenaCenter.tsx    # Center area
│       │   ├── ArenaCenterContent.tsx  # Phase controls
│       │   ├── ArenaCenterNominationSheet.tsx # Nomination UI
│       │   ├── ArenaSeatTagPopout.tsx
│       │   ├── ArenaSeatSkillPopout.tsx
│       │   └── ArenaSeatCharacterPopout.tsx
│       ├── RightConsole/
│       │   ├── index.tsx
│       │   ├── RightConsolePlayer.tsx
│       │   ├── RightConsoleDay.tsx
│       │   ├── RightConsoleGame.tsx
│       │   ├── RightConsoleRecords.tsx
│       │   ├── RightConsoleTags.tsx
│       │   ├── RightConsoleSettings.tsx
│       │   ├── RightPopupLog.tsx
│       │   ├── RightPopupScript.tsx
│       │   └── ...
│       ├── Modals/
│       │   ├── index.tsx
│       │   ├── ModalsNewGame.tsx
│       │   ├── ModalsEndGame.tsx
│       │   ├── ModalsExport.tsx
│       │   └── ...
│       ├── CompactToolbar.tsx
│       ├── LeftLogPanel.tsx
│       ├── LeftScriptPanel.tsx
│       └── ...
└── utils/
    └── seats.ts                # Game logic (eligible voters, etc.)
```

---

## Implementation Status

### Completed Features
- ✅ MUI 9 migration (replaced legacy CSS)
- ✅ Phase controls with timer
- ✅ Nomination sheet with countdown timers
- ✅ Vote recording and history
- ✅ Character tag display with icons
- ✅ Night phase with character/wake order display
- ✅ Round robin mode
- ✅ Global notes (public + ST-only)
- ✅ Audio player with local files
- ✅ Saved games / export
- ✅ Undo/redo history
- ✅ Localization (en/zh)
