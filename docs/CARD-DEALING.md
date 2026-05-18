# Card Dealing Feature — Design Doc

Storyteller selects N characters, shuffles them into face-down cards, shares a link. Each player opens the link, flips one card, and sees only their own character. The ST sees who claimed which card and assigns seat numbers.

---

## User Flow

### Storyteller (Host)

1. Open **New Game** → Characters tab → pick characters (e.g. 9 players → 9 chars + travellers/bluffs)
2. Click **"Deal Cards"** button
3. App shuffles cards, generates a **deal session** with a short URL:
   `https://botc.app/deal/<sessionId>`
4. ST sees a live dashboard:
   - Grid of N cards (face-down by default, or ST can toggle face-up)
   - Each card shows: claimed / unclaimed status, player's chosen display name, timestamp
   - ST can assign **seat number** and **player name** to each claimed card
   - Once all assigned: **"Apply to Game"** button → fills `seatNames` + `assignments` in the New Game panel

### Player (Guest)

1. Receive link from ST (QR code, chat, etc.)
2. Open link on phone → landing page shows N face-down cards in a grid
3. Player enters a **display name** (optional, for ST to identify them)
4. Player taps any **one** card → it flips, shows character icon + name + ability
5. All other cards lock (greyed out, unclickable) — cannot flip a second one
6. Player can **copy/screenshot** their character; page stays open showing their card
7. If player closes and reopens link: their card is still shown (keyed by browser token)

---

## Data Model

### Deal Session (server-side or Supabase)

```ts
type DealSession = {
  id: string                      // short random ID (e.g. "xk7p2")
  createdAt: number               // timestamp
  expiresAt: number               // TTL: 24h after creation
  hostToken: string               // secret token for ST dashboard (stored in ST's localStorage)
  cards: DealCard[]               // shuffled array, index = card position
  status: 'open' | 'closed'      // ST closes when done
}

type DealCard = {
  position: number                // 0-indexed slot in the grid
  characterId: string             // the character at this slot
  claimedByToken: string | null   // guest's browser token, null if unclaimed
  claimedByName: string | null    // guest's display name
  claimedAt: number | null
  assignedSeat: number | null     // ST-assigned seat number
  assignedName: string | null     // ST-assigned player name (may differ from display name)
}
```

### Guest Token

- Generated client-side: `crypto.randomUUID()` stored in `sessionStorage`
- Sent with every claim request
- Identifies the same browser tab/session
- No account required

---

## Sync Architecture

### Option A — Supabase Realtime (Recommended)

Supabase Postgres + Realtime subscriptions.

```
ST creates session → INSERT into deal_sessions + deal_cards
Guest opens link   → SELECT cards (positions only, no characterId until claimed)
Guest claims card  → UPDATE deal_cards SET claimedByToken, claimedByName, claimedAt
                     WHERE position=X AND claimedByToken IS NULL   ← atomic
ST dashboard       → SUBSCRIBE to deal_cards changes → live updates
```

**Why Supabase:**
- Row-level security: guests can only see their own claimed card's characterId
- Realtime pushes to ST dashboard without polling
- Atomic UPDATE prevents two guests claiming the same card (DB constraint)
- Already in tech stack consideration (see VERSIONING-CUSTOM-CLOUD.md)

**RLS Policy sketch:**
```sql
-- Guests: can read position + claimed status; can read characterId only for their own token
CREATE POLICY "guest_read" ON deal_cards FOR SELECT
  USING (claimed_by_token = current_setting('app.guest_token', true)
         OR claimed_by_token IS NULL);   -- unclaimed cards show position only (no char)

-- Guests: can claim one unclaimed card per session token (enforce in app layer + DB trigger)
CREATE POLICY "guest_claim" ON deal_cards FOR UPDATE
  USING (claimed_by_token IS NULL)
  WITH CHECK (claimed_by_token = current_setting('app.guest_token', true));
```

### Option B — Simple Polling (No Backend)

For a lightweight MVP with no server:

- Store session in **localStorage on the ST's device** only
- Generate per-card **one-time tokens** baked into the URL fragment:
  `https://botc.app/deal/<sessionId>#<cardToken>`
- Each card gets a unique URL; ST generates N QR codes
- Guest opens their specific URL → sees their card immediately (no claim step)
- No cross-device sync; ST sends each QR/link directly to each player

**Tradeoff:** Simpler but less fun — no "flip" moment, no live dashboard.

### Option C — Firebase Realtime Database

Similar to Supabase but uses Firebase. Skip if avoiding Google dependency.

---

## Security Considerations

| Risk | Mitigation |
|------|-----------|
| Guest sees other cards before claiming | Server never sends `characterId` for unclaimed cards (only position index) |
| Guest claims multiple cards | DB UPDATE WHERE claimed_by_token IS NULL — first writer wins; second request finds row already claimed |
| Guest replays old token | Token is `sessionStorage`-scoped; tab close loses it; fine for game session duration |
| ST link guessed by guests | `hostToken` is a 128-bit random secret; separate from `sessionId` |
| Session lasts forever | TTL: auto-expire after 24h; ST can manually close |

---

## UI Components

### ST Dashboard (`/deal/<id>?host=<hostToken>`)

```
┌─────────────────────────────────────────────────┐
│  Deal Session  xk7p2   [Copy Link]  [Show QR]   │
│  5/9 claimed · expires in 23h      [Close Deal]  │
├─────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│  │ ✓  │ │ ✓  │ │    │ │    │ │ ✓  │  ...        │
│  │Alex│ │Bob │ │ -- │ │ -- │ │Carol│            │
│  │[1] │ │[3] │ │    │ │    │ │[5] │            │
│  └────┘ └────┘ └────┘ └────┘ └────┘            │
│                                                  │
│  Claimed card detail panel (click a card):       │
│  Character: Imp  ·  Player: Alex  ·  Seat: [1▼] │
└─────────────────────────────────────────────────┘
```

- Cards toggle face-up/down (ST can peek at all)
- Click claimed card → edit seat number and player name
- "Apply to Game" → writes into New Game panel assignments

### Guest Page (`/deal/<id>`)

```
┌─────────────────────────┐
│   Your display name:    │
│   [_____________]       │
│                         │
│  ┌──┐ ┌──┐ ┌──┐        │
│  │??│ │??│ │??│  ...    │
│  └──┘ └──┘ └──┘        │
│                         │
│  Tap one card to flip!  │
└─────────────────────────┘

After flip:
┌─────────────────────────┐
│  [Imp icon]             │
│  You are the Imp        │
│  Each night...          │
│                         │
│  ✓ Card saved           │
└─────────────────────────┘
```

- Card flip animation (CSS 3D flip)
- Other cards grey out immediately after flip
- Bilingual (EN/ZH) same as rest of app

---

## Integration with New Game Panel

After all players claim cards:

```ts
// ST clicks "Apply to Game" on dashboard
const patch: Partial<NewGameConfig> = {
  seatNames: Object.fromEntries(
    cards.filter(c => c.assignedSeat).map(c => [c.assignedSeat, c.assignedName ?? c.claimedByName ?? `Player ${c.assignedSeat}`])
  ),
  assignments: Object.fromEntries(
    cards.filter(c => c.assignedSeat).map(c => [c.assignedSeat, c.characterId])
  ),
}
setNewGamePanel(prev => ({ ...prev, ...patch }))
```

---

## Implementation Phases

### Phase 1 — MVP (Option B, no backend)
- ST generates N unique card URLs (one per character)
- Each URL contains an encrypted card token in the fragment
- Guest opens URL, sees their character immediately
- No live dashboard; ST manages manually
- **Effort:** ~1–2 days

### Phase 2 — Full (Option A, Supabase)
- Session creation, claim flow, live ST dashboard
- RLS policies, realtime subscriptions
- QR code generation per session link
- Apply-to-game integration
- **Effort:** ~4–6 days

### Phase 3 — Polish
- Card flip animation
- ST can send reminders to unclaimed players
- Session replay (export who got which character)
- Bluff cards section (demon bluffs dealt separately to demon player only)

---

## Open Questions

1. **Demon bluffs** — deal bluff cards to only the player who is Demon? Requires ST to know who got Demon before bluffs are dealt.
2. **Travellers** — include in the deal or handle separately?
3. **Re-deal** — if a player exits before claiming, can ST reset their card?
4. **Offline** — should Phase 1 work fully offline (no server)? Yes for Option B.
5. **QR vs link** — generate one QR for the whole session (all players scan same URL) or one QR per player card?
