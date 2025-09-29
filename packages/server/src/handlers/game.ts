import type { CreateGameRequestEvent, Game, GameEvent, GameStartEvent, Player, PlayerActionEvent, Titan } from "@shared/index";
import { WebSocket } from "ws";
import { ServerContext } from "../serverContext";

/**
 * Handle createGameRequest: build active-titans mapping, create game and notify players.
 */
export function handleCreateGameRequest(ws: WebSocket, event: CreateGameRequestEvent, ctx: ServerContext) {
  const { playerIds } = event.payload;
  const gamePlayers = playerIds.map(id => ctx.users.get(id)).filter(Boolean) as Player[];

  if (gamePlayers.length !== playerIds.length) {
    return;
  }

  // Build mapping playerId -> titanId:
  // 1) Prefer GameManager's tracked active titan if present
  // 2) Otherwise fall back to TitanManager's first titan for the player (if any)
  const activeTitansForRequest: Record<string, string> = {};
  for (const pid of playerIds) {
    const active = ctx.gameManager.getActiveTitan(pid); // use GameManager's API
    if (active) {
      activeTitansForRequest[pid] = active;
    } else {
      const playerTitans = ctx.titanManager.getTitansForPlayer(pid);
      if (playerTitans.length > 0) {
        activeTitansForRequest[pid] = playerTitans[0].id; // fallback to first titan
      }
    }
  }

  // Build Titan objects array for the selected titan ids so GameManager can initialize HP/charge
  const titanIdsPre = Object.values(activeTitansForRequest || {});
  const titansForGame: Titan[] = titanIdsPre.map(id => ctx.titanManager.titans.get(id)).filter(Boolean) as Titan[];

  const game = ctx.gameManager.createGame(gamePlayers, activeTitansForRequest, titansForGame);

  const titanIds = Object.values(game.titans || {});
  const titans: Titan[] = titanIds.map(id => ctx.titanManager.titans.get(id)).filter(Boolean) as Titan[];

  // Build lightweight titanAbilities mapping for clients (id, name, cost). Cost may be unknown here so default to 100.
  const titanAbilities: Record<string, { id: string; name: string; cost: number }> = {};
  for (const t of titans) {
    const abilityId = (t as any).abilities?.[0];
    titanAbilities[t.id] = {
      cost: 100,
      id: abilityId ?? "none",
      name: (t as any).specialAbility ?? abilityId ?? "None"
    };
  }

  // Ensure game.meta includes titanAbilities so clients can render ability UI
  const gameToSend = {
    ...game,
    ...((game as any).meta ? { meta: { ...(game as any).meta, titanAbilities } } : { meta: { titanAbilities } })
  } as unknown as Game;

  const gameStartEvent: GameStartEvent = {
    payload: { game: gameToSend, titans },
    type: "gameStart"
  };

  // Notify each player in the game
  game.players.forEach(playerId => {
    ctx.sendToUser(playerId, gameStartEvent);
  });

  console.log(`Game ${game.id} created for players: ${playerIds.join(", ")}`);
}

/**
 * Handle playerAction: forward to GameManager and broadcast GameUpdate to players.
 */
export function handlePlayerAction(ws: WebSocket, event: PlayerActionEvent, ctx: ServerContext) {
  const { gameId, playerId, action } = event.payload;
  const game = ctx.gameManager.handlePlayerAction(gameId, playerId, action);
  if (!game) return;

  const titanIds = Object.values(game.titans || {});
  const titans: Titan[] = titanIds.map(id => ctx.titanManager.titans.get(id)).filter(Boolean) as Titan[];

  // Ensure the game object sent to clients includes ephemeral meta (if present on the server-side game object)
  const gameToSend = {
    ...game,
    // attach meta if it exists on the in-memory game object
    ...((game as any).meta ? { meta: (game as any).meta } : {})
  };

  const gameUpdateEvent: GameEvent = {
    payload: { game: gameToSend as unknown as any, titans },
    type: "GameUpdate"
  };

  game.players.forEach(pId => {
    ctx.sendToUser(pId, gameUpdateEvent);
  });
}
