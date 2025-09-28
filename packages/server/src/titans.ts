import { Titan, TitanStat } from "@shared/index";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const TITAN_NAMES = ["Atlas", "Hyperion", "Prometheus", "Cronus", "Oceanus"];

export class TitanManager {
  titans: Map<string, Titan> = new Map();
  playerTitans: Map<string, string[]> = new Map();

  getTitansForPlayer(playerId: string): Titan[] {
    const titanIds = this.playerTitans.get(playerId) || [];
    return titanIds.map(id => this.titans.get(id)).filter(Boolean) as Titan[];
  }

  generateInitialTitan(playerId: string): Titan {
    const existing = this.getTitansForPlayer(playerId);
    if (existing.length > 0) {
      return existing[0];
    }

    const id = "titan_" + Math.random().toString(36).slice(2, 10);
    const name = TITAN_NAMES[randomInt(0, TITAN_NAMES.length - 1)];
    const stats: Record<TitanStat, number> = {
      Attack: randomInt(5, 10),
      Defense: randomInt(5, 10),
      HP: randomInt(5, 10),
      Speed: randomInt(5, 10),
      Stamina: randomInt(5, 10)
    };

    const titan: Titan = {
      id,
      name,
      specialAbility: "None",
      stats
    };

    this.titans.set(id, titan);
    this.playerTitans.set(playerId, [id]);
    return titan;
  }
}
