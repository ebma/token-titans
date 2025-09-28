import type { Game, GameAction } from "@shared/index";
import { randomUUID } from "crypto";

export class GameManager {
  private games: Map<string, Game> = new Map();
  // Track current active titan per player (playerId -> titanId)
  private activeTitans: Map<string, string> = new Map();

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

  // Accept optional activeTitans mapping; if omitted, populate from internal tracking
  createGame(players: { id: string; username: string }[], activeTitans?: Record<string, string>): Game {
    // Use provided mapping when available, otherwise use stored active titans for these players
    const titansMapping = activeTitans ?? this.getActiveTitansForPlayers(players.map(p => p.id));

    const game: Game = {
      gameMode: "1v1",
      gameState: "PreBattle",
      id: randomUUID(),
      players: players.map(p => p.id),
      titans: titansMapping
    };

    this.games.set(game.id, game);
    return game;
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId);
  }

  handlePlayerAction(gameId: string, playerId: string, action: GameAction): Game | undefined {
    const game = this.getGame(gameId);
    if (!game) {
      return;
    }

    console.log(`Player ${playerId} in game ${gameId} used action: ${action.type}`);

    // In a future step, this method would modify the game state.
    // For now, we just return the current state.
    return game;
  }

  getGameByPlayerId(playerId: string): Game | undefined {
    for (const game of this.games.values()) {
      if (game.players.includes(playerId)) {
        return game;
      }
    }
    return undefined;
  }
}
