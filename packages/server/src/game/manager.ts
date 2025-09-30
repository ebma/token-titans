import type { Game, GameAction, Titan } from "@shared/index";
import { randomUUID } from "crypto";
import { buildTitanAbilities, CombatMeta, RoundMeta } from "./meta";
import { resolveRound } from "./resolver";

/**
 * GameManager (core): stores games, active titan selection and per-game records.
 * Round resolution is delegated to `resolver.ts`.
 */
export class GameManager {
  private games: Map<string, Game> = new Map();
  // Track current active titan per player (playerId -> titanId)
  private activeTitans: Map<string, string> = new Map();

  // Per-game bookkeeping:
  private roundActions: Map<string, Record<string, GameAction>> = new Map();
  private titanHPs: Map<string, Record<string, number>> = new Map();
  private titanCharges: Map<string, Record<string, number>> = new Map();
  private gameTitans: Map<string, Record<string, Titan>> = new Map();

  // Set a player's active titan
  setActiveTitan(playerId: string, titanId: string): void {
    this.activeTitans.set(playerId, titanId);
  }

  // Get a player's active titan id
  getActiveTitan(playerId: string): string | undefined {
    return this.activeTitans.get(playerId);
  }

  // Return mapping of playerId -> titanId for known active titans among the provided players
  getActiveTitansForPlayers(playerIds: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const playerId of playerIds) {
      const titanId = this.activeTitans.get(playerId);
      if (titanId) {
        result[playerId] = titanId;
      }
    }
    return result;
  }

  /**
   * Create a new game.
   * Optionally accept a list of Titan objects for the titans participating in the game
   * so that per-game HP and charge can be initialized from Titan.stats.HP.
   */
  createGame(players: { id: string; username: string }[], activeTitans?: Record<string, string>, titans?: Titan[]): Game {
    // Use provided mapping when available, otherwise use stored active titans for these players
    const titansMapping = activeTitans ?? this.getActiveTitansForPlayers(players.map(p => p.id));

    const game: Game = {
      gameMode: "1v1",
      gameState: "PreBattle",
      id: randomUUID(),
      players: players.map(p => p.id),
      titans: titansMapping
    };

    // Initialize per-game titan data if Titan objects were provided
    const titanHPRecord: Record<string, number> = {};
    const titanChargeRecord: Record<string, number> = {};
    const titanRecord: Record<string, Titan> = {};

    if (titans && titans.length > 0) {
      for (const t of titans) {
        titanHPRecord[t.id] = t.stats.HP;
        titanChargeRecord[t.id] = 0;
        titanRecord[t.id] = t;
      }
    } else {
      // If no titan objects provided, default to 0/empty; handler may call initGameMeta later.
      for (const tid of Object.values(game.titans || {})) {
        titanHPRecord[tid] = 0;
        titanChargeRecord[tid] = 0;
      }
    }

    this.titanHPs.set(game.id, titanHPRecord);
    this.titanCharges.set(game.id, titanChargeRecord);
    this.gameTitans.set(game.id, titanRecord);
    this.roundActions.set(game.id, {});

    // Build meta using helper
    const titanAbilitiesMap = buildTitanAbilities(titanRecord);

    game.meta = {
      lockedPlayers: {},
      roundLog: [],
      roundNumber: 1,
      titanAbilities: titanAbilitiesMap,
      titanCharges: { ...titanChargeRecord },
      titanHPs: { ...titanHPRecord }
    };

    this.games.set(game.id, game);
    return game;
  }

  /**
   * If titans become available after createGame, this can initialize per-game titan data.
   */
  initGameMeta(gameId: string, titans: Titan[]) {
    const game = this.getGame(gameId);
    if (!game) return;

    const titanHPRecord: Record<string, number> = {};
    const titanChargeRecord: Record<string, number> = {};
    const titanRecord: Record<string, Titan> = {};

    for (const t of titans) {
      titanHPRecord[t.id] = t.stats.HP;
      titanChargeRecord[t.id] = 0;
      titanRecord[t.id] = t;
    }

    this.titanHPs.set(gameId, titanHPRecord);
    this.titanCharges.set(gameId, titanChargeRecord);
    this.gameTitans.set(gameId, titanRecord);
    this.roundActions.set(gameId, {});

    const titanAbilitiesMap = buildTitanAbilities(titanRecord);

    game.meta = {
      lockedPlayers: {},
      roundLog: [],
      roundNumber: 1,
      titanAbilities: titanAbilitiesMap,
      titanCharges: { ...titanChargeRecord },
      titanHPs: { ...titanHPRecord }
    };

    this.games.set(game.id, game);
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  /**
   * Handle a player's action:
   * - validate game and player
   * - store action for the round; when both players acted, trigger resolveRound (delegated)
   * - Ability cost validation is handled in resolver.ts where ability data is available
   */
  handlePlayerAction(gameId: string, playerId: string, action: GameAction): Game | undefined {
    const game = this.getGame(gameId);
    if (!game) {
      return;
    }

    if (!game.players.includes(playerId)) {
      return game;
    }

    console.log(`Player ${playerId} in game ${gameId} used action: ${action.type}`);

    // Ensure per-game data exists
    if (!this.titanCharges.has(gameId) || !this.titanHPs.has(gameId)) {
      // No per-game meta initialized; nothing to process
      return game;
    }

    // Ability cost validation is handled in resolver.ts where ability data is available

    // Store action for the round
    const actions = this.roundActions.get(gameId) ?? {};
    actions[playerId] = action;
    this.roundActions.set(gameId, actions);

    // Mark this player as having locked in for the current round (for client visibility)
    const currentMeta = game.meta ?? {};
    const currentLocked = (currentMeta.lockedPlayers as Record<string, boolean>) ?? {};
    currentLocked[playerId] = true;
    game.meta = { ...currentMeta, lockedPlayers: { ...currentLocked } };

    // If all players have submitted actions, resolve simultaneously (delegated to resolver)
    const allPlayersActed = game.players.every(pId => actions[pId] !== undefined);
    if (allPlayersActed) {
      // Delegate resolution to resolver module which will update titanHPs/titanCharges and game.meta
      try {
        resolveRound(this, game.id);
      } catch (e) {
        console.error("resolveRound failed:", e);
      }
    }

    // Return updated game object (it may have been augmented)
    return this.getGame(gameId);
  }

  // Expose some internal records for the resolver (careful; internal API)
  _getRoundActions(gameId: string) {
    return this.roundActions.get(gameId) ?? {};
  }

  _getTitansForGame(gameId: string) {
    return this.gameTitans.get(gameId) ?? {};
  }

  _getHPRecord(gameId: string) {
    return this.titanHPs.get(gameId) ?? {};
  }

  _getChargeRecord(gameId: string) {
    return this.titanCharges.get(gameId) ?? {};
  }

  _setHPRecord(gameId: string, rec: Record<string, number>) {
    this.titanHPs.set(gameId, rec);
  }

  _setChargeRecord(gameId: string, rec: Record<string, number>) {
    this.titanCharges.set(gameId, rec);
  }

  _clearRoundActions(gameId: string) {
    this.roundActions.set(gameId, {});
  }

  /**
   * Lookup a game by a player id.
   */
  getGameByPlayerId(playerId: string): Game | undefined {
    for (const game of this.games.values()) {
      if (game.players.includes(playerId)) {
        return game;
      }
    }
    return undefined;
  }
}
