// Node stand-in for the `cloudflare:workers` module so unit tests can import
// the worker entry point. Durable Objects themselves are exercised through
// GameRoomCore with in-memory storage.
export class DurableObject<Env = unknown> {
  constructor(readonly ctx: unknown, readonly env: Env) {}
}
