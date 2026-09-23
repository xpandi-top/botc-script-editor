/**
 * Durable Object hosting one cloud game. It holds no logic of its own: it
 * gives GameRoomCore persistent storage and, being a Durable Object, runs
 * the game's requests one at a time. Methods are called over DO RPC.
 */
import { DurableObject } from 'cloudflare:workers'
import { getCatalog } from '../catalog'
import type { Env } from '../env'
import { GameRoomCore, roomApi, type Access, type CreateGameInput, type RoomApi, type RoomState, type RoomStorage } from './room'
import type { GameCommand } from '../../../src/core/engine/commands'

class DurableRoomStorage implements RoomStorage {
  constructor(private readonly storage: DurableObjectStorage) {}
  async load() { return (await this.storage.get<RoomState>('state')) ?? null }
  async save(state: RoomState) { await this.storage.put('state', state) }
}

export class GameRoom extends DurableObject<Env> {
  private readonly api: RoomApi

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.api = roomApi(new GameRoomCore(new DurableRoomStorage(ctx.storage), getCatalog()))
  }

  create(gameId: string, input: CreateGameInput, owner: { ownerId: string | null; hostToken: string }) { return this.api.create(gameId, input, owner) }
  grimoire(access: Access) { return this.api.grimoire(access) }
  publicState() { return this.api.publicState() }
  seat(access: Access, seat: number) { return this.api.seat(access, seat) }
  command(access: Access, commands: GameCommand[], expectedVersion?: number) { return this.api.command(access, commands, expectedVersion) }
  nightScript(access: Access, night: 'first' | 'other', lang: 'en' | 'zh', includeDead?: boolean) { return this.api.nightScript(access, night, lang, includeDead) }
  journal(access: Access, since?: number) { return this.api.journal(access, since) }
  lobby() { return this.api.lobby() }
  claimSeat(seat: number, name: string, seatToken: string) { return this.api.claimSeat(seat, name, seatToken) }
  releaseSeat(access: Access, seat: number) { return this.api.releaseSeat(access, seat) }
  mySeat(access: Access) { return this.api.mySeat(access) }
  sendMessage(access: Access, to: 'st' | 'all' | number, text: string) { return this.api.sendMessage(access, to, text) }
  messages(access: Access, since?: number) { return this.api.messages(access, since) }
  castOwnVote(access: Access, yes: boolean) { return this.api.castOwnVote(access, yes) }
}
