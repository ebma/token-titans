import type { CreateGameRequestEvent, Game, GameEvent, GameStartEvent, Player, PlayerActionEvent, Titan } from "@shared/index";
import { WebSocket } from "ws";
import { buildTitanAbilities, CombatMeta, RoundMeta, TitanAbilityMeta } from "../game/meta";
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

  // Build lightweight titanAbilities mapping for clients as an array per titan (id, name, cost).
  // Cost may be unknown here so default to 100. This lets clients render multiple abilities even before server finalizes costs.
  const titanAbilities: Record<string, TitanAbilityMeta[]> = {};
  for (const t of titans) {
    const abilityIds: string[] = t.abilities ?? [];
    if (!abilityIds || abilityIds.length === 0) {
      // expose empty array so client can fallback to specialAbility text
      titanAbilities[t.id] = [];
    } else {
      titanAbilities[t.id] = abilityIds.map(aid => {
        return {
          cost: 100,
          id: aid,
          name: t.specialAbility ?? aid ?? "None"
        } as TitanAbilityMeta;
      });
    }
  }

  // Ensure game.meta includes titanAbilities so clients can render ability UI
  const existingMeta = (game.meta ?? {}) as Partial<RoundMeta & CombatMeta>;
  const mergedMeta = { ...existingMeta, titanAbilities } as Partial<RoundMeta & CombatMeta>;
  const gameToSend: Game = {
    ...game,
    meta: mergedMeta
  };

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
  const existingMeta = (game.meta ?? {}) as Partial<RoundMeta & CombatMeta>;
  const gameToSend: Game = {
    ...game,
    ...(Object.keys(existingMeta).length ? { meta: existingMeta } : {})
  };

  const gameUpdateEvent: GameEvent = {
    payload: { game: gameToSend, titans },
    type: "GameUpdate"
  };

  game.players.forEach(pId => {
    ctx.sendToUser(pId, gameUpdateEvent);
  });
}
