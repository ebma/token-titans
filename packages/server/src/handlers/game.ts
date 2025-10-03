import type {
  CreateGameRequestEvent,
  Game,
  GameEvent,
  GameStartEvent,
  Player,
  PlayerActionEvent,
  RoundResult,
  Titan
} from "@shared/index";
import { WebSocket } from "ws";
import { buildTitanAbilities, CombatMeta, RoundMeta } from "../game";
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

  // Build mapping playerId -> Titan:
  // 1) Prefer GameManager's tracked active titan if present
  // 2) Otherwise fall back to TitanManager's first titan for the player (if any)
  const activeTitansForRequest: Record<string, Titan> = {};
  for (const pid of playerIds) {
    const activeId = ctx.gameManager.getActiveTitan(pid); // use GameManager's API
    let titan: Titan | undefined;
    if (activeId) {
      titan = ctx.titanManager.titans.get(activeId);
    } else {
      const playerTitans = ctx.titanManager.getTitansForPlayer(pid);
      if (playerTitans.length > 0) {
        titan = playerTitans[0];
      }
    }
    if (titan) {
      activeTitansForRequest[pid] = titan;
    }
  }

  const game = ctx.gameManager.createGame(gamePlayers, activeTitansForRequest);

  const titans = Object.values(game.titans || {});

  // Prefer server-side meta if available (it includes ability descriptions); otherwise build from Titan objects.
  const existingMeta = (game.meta ?? {}) as Partial<RoundMeta & CombatMeta>;

  // Build a titanRecord from the titan list so buildTitanAbilities can be used as a single source of truth.
  const titanRecord: Record<string, Titan> = {};
  for (const t of titans) {
    titanRecord[t.id] = t;
  }
  const builtAbilities = buildTitanAbilities(titanRecord);

  const titanAbilities =
    existingMeta.titanAbilities && Object.keys(existingMeta.titanAbilities).length > 0
      ? existingMeta.titanAbilities
      : builtAbilities;

  const gameToSend: Game = {
    ...game,
    meta: { ...(existingMeta ?? {}), titanAbilities }
  };

  // Attach ability metadata to the titan objects that are sent in the gameStart payload
  const titansWithMeta = titans.map(
    t =>
      ({
        ...t,
        // keep existing 'abilities' array for compatibility, add 'abilitiesMeta' with descriptions
        abilitiesMeta: titanAbilities[t.id] ?? []
      }) as unknown as typeof t
  );

  const gameStartEvent: GameStartEvent = {
    payload: { game: gameToSend, titans: titansWithMeta as unknown as typeof titans },
    type: "gameStart"
  };

  // Notify each player in the game
  game.players.forEach(playerId => {
    ctx.sendToUser(playerId, gameStartEvent);
  });

  console.log(`Game ${game.id} created for players: ${playerIds.join(", ")}`);
}

/**
 * Handle playerAction: forward to GameManager and broadcast GameUpdate or RoundComplete to players.
 */
export function handlePlayerAction(ws: WebSocket, event: PlayerActionEvent, ctx: ServerContext) {
  const { gameId, playerId, action } = event.payload;
  const result = ctx.gameManager.handlePlayerAction(gameId, playerId, action);
  if (!result.game) return;

  // Ensure the game object sent to clients includes ephemeral meta (if present on the server-side game object)
  const existingMeta = (result.game.meta ?? {}) as Partial<RoundMeta & CombatMeta>;
  const gameToSend: Game = {
    ...result.game,
    ...(Object.keys(existingMeta).length ? { meta: existingMeta } : {})
  };

  // Always broadcast GameUpdate
  const gameUpdateEvent: GameEvent = {
    payload: { game: gameToSend },
    type: "GameUpdate"
  };

  result.game.players.forEach(pId => {
    ctx.sendToUser(pId, gameUpdateEvent);
  });

  // If resolved and roundResult present, broadcast RoundComplete
  if (result.resolved && result.roundResult) {
    const roundCompleteEvent: GameEvent = {
      payload: { roundResult: result.roundResult },
      type: "RoundComplete"
    };

    result.game.players.forEach(pId => {
      ctx.sendToUser(pId, roundCompleteEvent);
    });
  }
}
