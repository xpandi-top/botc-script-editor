/** Browser-only demo transport, injected by Playwright. Never imported by the app.
 * Simulates the service boundary across isolated demo tabs; no Firebase writes.
 */
export const HOST_TOKEN_KEY = id => `botc-deal-host-${id}`
export const ACTIVE_HOST_DEAL_KEY = 'botc-deal-active-host'
export const DEAL_SESSION_CHANGED_EVENT = 'botc-deal-session-changed'
export const DEFAULT_DEAL_VOTE_SECONDS = 10
export const GAME_DEAL_KEY = id => `botc-deal-game-${id}`
export const GUEST_TOKEN_KEY = 'botc-deal-guest-token'
export const CHARACTER_SEEN_KEY = id => `botc-deal-character-seen-${id}`
const KEY = 'botc-demo-deal-service'
const EVENT = 'botc-demo-deal-update'
const stamp = ms => ({ toMillis: () => ms, toDate: () => new Date(ms) })
const read = () => JSON.parse(localStorage.getItem(KEY) ?? '{"seats":[],"responses":[],"vote":null}')
function write(state) { localStorage.setItem(KEY, JSON.stringify(state)); window.dispatchEvent(new Event(EVENT)) }
function subscribe(select, cb) {
  const update = () => cb(select(read()))
  window.addEventListener('storage', update)
  window.addEventListener(EVENT, update)
  update()
  return () => { window.removeEventListener('storage', update); window.removeEventListener(EVENT, update) }
}
export const getGuestToken = () => 'demo-guest-alice'
export const hasSeenDealCharacter = id => localStorage.getItem(CHARACTER_SEEN_KEY(id)) === '1'
export const markDealCharacterSeen = id => localStorage.setItem(CHARACTER_SEEN_KEY(id), '1')
export async function createSeatClaimSession(totalSeats) {
  const names = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank','Iris','Jack']
  write({ session: { id: 'demo-room', hostToken: 'demo-host', status: 'open', cardCount: 0, totalSeats },
    seats: Array.from({length:totalSeats}, (_,i) => ({seatNumber:i+1,
      claimedByToken: i === 0 || i === 6 ? null : `demo-guest-${i}`,
      playerName: i === 0 || i === 6 ? null : names[i], characterId:null })), responses:[], vote:null })
  return { sessionId:'demo-room', hostToken:'demo-host' }
}
export async function getDealSession() {
  const session = read().session
  return session ? {...session, createdAt:stamp(1790208000000), expiresAt:stamp(4102444800000)} : null
}
export const getSeatClaims = async () => read().seats
export const subscribeSeatClaims = (_id, cb) => subscribe(s => s.seats, cb)
export const findClaimedSeat = async (_id, token) => read().seats.find(s => s.claimedByToken === token) ?? null
export async function claimSeat(_id, seatNumber, token, playerName) {
  const state = read(), seat = state.seats.find(s => s.seatNumber === seatNumber)
  if (!seat || seat.claimedByToken) throw new Error('seat_already_claimed')
  Object.assign(seat, {claimedByToken:token, playerName})
  write(state)
  return seat
}
export async function assignCharacterToSeatByHost(_id, number, payload) {
  const state = read(); Object.assign(state.seats.find(s => s.seatNumber === number), payload); write(state)
}
export async function createDealVoteSession(_id, input) {
  const state = read()
  state.vote = {...input, voteId:'demo-vote', currentIndex:0, status:'active', noVoteSeats:input.noVoteSeats ?? [],
    startedAt:Date.now(), deadlineAt:Date.now() + input.perPlayerSeconds * 1000}
  state.responses = []; write(state)
  return hydrateVote(state.vote)
}
const hydrateVote = v => v ? {...v, startedAt:stamp(v.startedAt), deadlineAt:stamp(v.deadlineAt)} : null
export const subscribeActiveDealVote = (_id, cb) => subscribe(s => s.vote?.status === 'active' ? hydrateVote(s.vote) : null, cb)
export const subscribeDealVoteResponses = (_id, _vote, cb) => subscribe(s => s.responses.map(r => ({...r, submittedAt:stamp(r.submittedAt)})), cb)
export async function submitDealVoteResponse(_id, _vote, seat, guestToken, response) {
  const state = read()
  if (state.vote.votingOrder[state.vote.currentIndex] !== seat) throw new Error('not_current_voter')
  state.responses = [...state.responses.filter(r => r.seat !== seat), {seat,guestToken,response,submittedAt:Date.now()}]
  write(state)
}
export async function advanceDealVote() {
  const state = read(); state.vote.currentIndex++
  state.vote.deadlineAt = Date.now() + state.vote.perPlayerSeconds * 1000
  if (state.vote.currentIndex >= state.vote.votingOrder.length) state.vote.status = 'closed'
  write(state)
}
export async function closeDealVote(_id, _vote, status = 'closed') {const s=read();s.vote.status=status;write(s)}
export const subscribeMessages = (_id, cb) => {cb([]);return () => {}}
export const subscribeSeatMessages = (_id, _seat, cb) => {cb([]);return () => {}}
// Keep unexercised actions explicit: a new scenario must implement its behavior.
const unsupported = async () => { throw new Error('Unsupported demo service action') }
export const unclaimSeatByHost = unsupported
export const renameSeatByHost = unsupported
export const addSeatToSession = unsupported
export const closeDealSession = unsupported
export const sendMessage = unsupported
export const markMessageRead = unsupported
