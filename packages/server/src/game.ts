import type { Game, GameAction } from "@shared/index";
import { randomUUID } from "crypto";

export class GameManager {
  private games: Map<string, Game> = new Map();

  createGame(players: { id: string; username: string }[]): Game {
    const game: Game = {
      gameMode: "1v1",
      gameState: "PreBattle",
      id: randomUUID(),
      players: players.map(p => p.id),
      titans: {}
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
