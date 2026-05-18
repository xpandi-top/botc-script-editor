# Card Dealing Feature — Design Doc

Storyteller selects N characters, shuffles them into face-down cards, shares a link. Each player opens the link, flips one card, and sees only their own character. The ST sees who claimed which card and assigns seat numbers.

---

## Firebase Integration

Project already uses **Firebase Firestore** (`src/lib/firebase.ts`, `src/lib/firebaseShortUrl.ts`):

- `getFirebaseApp()` — singleton initialised from `VITE_FIREBASE_*` env vars
- `getFirestore()` — Firestore client, Spark plan compatible
- Existing `shortlinks` collection pattern: `setDoc` / `getDoc` / `deleteDoc`, lazy TTL cleanup on read
- **Firestore `onSnapshot`** — real-time listener for ST dashboard (no polling needed)

Card dealing uses the same Firebase project, same `getFirebaseApp()` / `getFirestore()` imports. No new SDK dependencies.

---

## User Flow

### Storyteller (Host)

1. Open **New Game** → Characters tab → pick characters (e.g. 9 players → 9 chars)
2. Click **"Deal Cards"** button
3. App shuffles cards, writes a **deal session** to Firestore, generates a share URL:
   `https://botc.app/?deal=<sessionId>` (same query-param pattern as `?sl=`)
4. ST sees live dashboard:
   - Grid of N face-down cards (ST can toggle face-up to peek)
   - Each card shows: claimed / unclaimed, player's display name, timestamp
   - Click claimed card → assign **seat number** + **player name**
   - **"Apply to Game"** → fills `seatNames` + `assignments` in New Game panel

### Player (Guest)

1. Receive link (QR code / chat)
2. Open link → landing page shows N face-down cards
3. Enter a **display name** (optional)
4. Tap **one** card → flips, reveals character icon + name + ability text
5. All other cards lock immediately (greyed, unclickable)
6. Player keeps page open — character stays shown; re-open link shows their card again (keyed by browser token stored in `sessionStorage`)

---

## Data Model (Firestore)

### Collection: `dealSessions/{sessionId}`

```ts
type DealSession = {
  createdAt:  Timestamp
  expiresAt:  Timestamp          // 24 h TTL — lazy-deleted on read (Spark plan)
  hostToken:  string             // 128-bit secret; ST stores in localStorage
  status:     'open' | 'closed'
  cardCount:  number
}
```

### Sub-collection: `dealSessions/{sessionId}/cards/{position}`

```ts
type DealCard = {
  position:       number          // 0-indexed grid slot
  characterId:    string          // only returned to the claiming guest
  claimedByToken: string | null   // guest's sessionStorage token
  claimedByName:  string | null   // guest's display name
  claimedAt:      Timestamp | null
  assignedSeat:   number | null   // ST-assigned seat
  assignedName:   string | null   // ST-assigned player name
}
```

### Guest Token

```ts
// Generated once per browser tab, stored in sessionStorage
const guestToken = sessionStorage.getItem('botc-deal-token')
  ?? (() => { const t = crypto.randomUUID(); sessionStorage.setItem('botc-deal-token', t); return t })()
```

---

## Firestore Security Rules

Extend existing rules in Firebase console:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Existing shortlinks (unchanged)
    match /shortlinks/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['data','expiresAt'])
                    && request.resource.data.data is string
                    && request.resource.data.data.size() < 500000;
      allow delete, update: if false;
    }

    // Deal sessions — ST creates, guests read metadata only
    match /dealSessions/{sessionId} {
      allow read:   if true;
      allow create: if request.resource.data.keys().hasAll(['createdAt','expiresAt','hostToken','status','cardCount'])
                    && request.resource.data.cardCount is int
                    && request.resource.data.cardCount <= 20;
      // Only host can close session (update status); verified via hostToken in app layer
      allow update: if false;  // handled by Cloud Function or trusted client check
      allow delete: if false;

      // Cards sub-collection
      match /cards/{position} {
        // Guests can read position + claimed status
        // characterId is returned only if claimedByToken matches the request header
        // (enforced in app layer — Firestore can't inspect request headers directly)
        allow read: if true;

        // Atomic claim: only update an unclaimed card, set your own token
        allow update: if resource.data.claimedByToken == null
                      && request.resource.data.claimedByToken is string
                      && request.resource.data.claimedByToken.size() > 0
                      && request.resource.data.diff(resource.data).affectedKeys()
                           .hasOnly(['claimedByToken','claimedByName','claimedAt']);

        // ST assigns seat/name — validated in app layer via hostToken
        // Use a separate path or Cloud Function for full security
        allow update: if true;   // tighten in Phase 2 with hostToken check

        allow create, delete: if false;
      }
    }
  }
}
```

**Note:** Firestore rules can't read `characterId` conditionally per-caller in a single rule. App layer enforces: the `characterId` field is only sent to the client after their claim succeeds (fetch after write). Other guests who read unclaimed cards get a response that excludes `characterId` — enforced by the client library helper, not by Firestore rules alone. For full server-side enforcement, use a Cloud Function.

---

## Sync Architecture

### Real-time Updates (ST Dashboard)

Uses Firestore `onSnapshot` — same SDK already in the project:

```ts
import { getFirestore, collection, onSnapshot } from 'firebase/firestore'
import { getFirebaseApp } from './firebase'

function subscribeToCards(sessionId: string, onChange: (cards: DealCard[]) => void) {
  const db = getFirestore(getFirebaseApp())
  const ref = collection(db, 'dealSessions', sessionId, 'cards')
  return onSnapshot(ref, (snap) => {
    const cards = snap.docs.map(d => d.data() as DealCard)
    onChange(cards)
  })
  // returns unsubscribe fn — call in useEffect cleanup
}
```

### Atomic Card Claim (Guest)

```ts
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore'

async function claimCard(sessionId: string, position: number, guestToken: string, displayName: string) {
  const db  = getFirestore(getFirebaseApp())
  const ref = doc(db, 'dealSessions', sessionId, 'cards', String(position))

  // Firestore update with field-level write — fails if already claimed
  // (Firestore rule: claimedByToken must be null before update)
  await updateDoc(ref, {
    claimedByToken: guestToken,
    claimedByName:  displayName || null,
    claimedAt:      serverTimestamp(),
  })

  // Fetch full card (including characterId) after successful claim
  const snap = await getDoc(ref)
  return snap.data() as DealCard
}
```

Two guests racing to claim the same card: the second `updateDoc` is rejected by the Firestore security rule (`claimedByToken == null` fails on the already-claimed card). First writer wins.

### TTL / Cleanup

Mirrors the existing `shortlinks` pattern:

```ts
// On session read, lazily delete if expired
if (session.expiresAt.toMillis() < Date.now()) {
  // delete session + cards sub-collection (batch or Cloud Function)
  deleteDoc(sessionRef).catch(() => {})
  return null
}
```

Spark plan compatible — no scheduled functions or TTL policies needed.

---

## New Firestore Helper: `src/lib/firebaseDeal.ts`

Mirrors `firebaseShortUrl.ts` pattern:

```ts
export async function createDealSession(cards: { characterId: string }[], hostToken: string): Promise<string>
export async function getDealSession(sessionId: string): Promise<DealSession | null>
export async function subscribeCards(sessionId: string, cb: (cards: DealCard[]) => void): () => void
export async function claimCard(sessionId: string, position: number, guestToken: string, name: string): Promise<DealCard>
export async function updateCardAssignment(sessionId: string, position: number, seat: number, name: string, hostToken: string): Promise<void>
export async function closeDealSession(sessionId: string, hostToken: string): Promise<void>
```

---

## UI Components

### ST Dashboard (`/?deal=<id>&host=<hostToken>`)

```
┌──────────────────────────────────────────────────┐
│  Deal Session                  [Copy Link] [QR]  │
│  5/9 claimed · expires in 23h     [Close Deal]   │
├──────────────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐             │
│  │ ✓  │ │ ✓  │ │    │ │    │ │ ✓  │  ...        │
│  │Alex│ │Bob │ │    │ │    │ │Carol│             │
│  │[1▼]│ │[3▼]│ │    │ │    │ │[5▼]│             │
│  └────┘ └────┘ └────┘ └────┘ └────┘             │
│                                                   │
│  Selected: Imp · Alex · Seat [1▼] Name [_______] │
│                              [Apply to Game]      │
└──────────────────────────────────────────────────┘
```

### Guest Page (`/?deal=<id>`)

```
┌──────────────────────────┐      ┌──────────────────────────┐
│  Your name: [_________]  │  →   │  [Imp icon]              │
│                          │      │  You are the Imp         │
│  ┌──┐ ┌──┐ ┌──┐  ...    │      │  "Each night* choose..."  │
│  │??│ │??│ │??│          │      │                           │
│  └──┘ └──┘ └──┘          │      │  ✓ Card saved             │
│  Tap one card to flip!   │      └──────────────────────────┘
└──────────────────────────┘
```

- CSS 3D card-flip animation on claim
- Other cards grey out + `pointer-events:none` immediately
- Character icon from existing `getIconForCharacter()` in `catalog.ts`
- Ability text from existing `getAbilityText()` + bilingual support

---

## Integration with New Game Panel

```ts
// ST clicks "Apply to Game"
const patch: Partial<NewGameConfig> = {
  seatNames: Object.fromEntries(
    cards
      .filter(c => c.assignedSeat != null)
      .map(c => [c.assignedSeat!, c.assignedName ?? c.claimedByName ?? `Player ${c.assignedSeat}`])
  ),
  assignments: Object.fromEntries(
    cards
      .filter(c => c.assignedSeat != null)
      .map(c => [c.assignedSeat!, c.characterId])
  ),
}
setNewGamePanel(prev => ({ ...prev, ...patch }))
```

---

## Implementation Phases

### Phase 1 — MVP
- `firebaseDeal.ts` helpers
- ST creates session, gets shareable URL (`?deal=<id>`)
- Guest claim flow (no display name required)
- ST dashboard with `onSnapshot` live updates
- Assign seat numbers manually, "Apply to Game" button
- **Effort:** ~3 days

### Phase 2 — Polish
- QR code display for session link
- Card flip CSS animation
- Demon-only bluff card section (deal bluffs separately after demon is known)
- ST can reset an unclaimed card (re-open for another guest)
- Session replay export

### Phase 3 — Security Hardening
- Cloud Function for `hostToken`-gated writes (seat assignment, close session)
- Firestore rule: `characterId` field excluded from unclaimed card reads at DB level

---

## Open Questions

1. **Demon bluffs** — deal 3 bluff cards after demon is identified, or include in initial deal as a separate "bluff" phase?
2. **Travellers** — include in main deal grid or separate flow?
3. **Re-deal** — if guest exits before claiming, ST can reset `claimedByToken = null`?
4. **QR vs link** — one QR for whole session (all players scan same URL) — yes, simpler
5. **Offline** — not supported; Firebase required; fallback to manual assignment
