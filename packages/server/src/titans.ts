import { Titan, TitanStat } from "@shared/index";
import { ABILITIES } from "./abilities";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const TITAN_NAMES = [
  "Ares",
  "Apollo",
  "Artemis",
  "Athena",
  "Atlas",
  "Baldr",
  "Coeus",
  "Crius",
  "Cronus",
  "Deimos",
  "Demeter",
  "Dionysus",
  "Eos",
  "Eros",
  "Freya",
  "Frigg",
  "Gaia",
  "Hades",
  "Heimdall",
  "Helios",
  "Hephaestus",
  "Hera",
  "Hyperion",
  "Iapetus",
  "Janus",
  "Loki",
  "Metis",
  "Mnemosyne",
  "Morpheus",
  "Nemesis",
  "Nereus",
  "Nike",
  "Njord",
  "Nyx",
  "Oceanus",
  "Odin",
  "Phobos",
  "Poseidon",
  "Prometheus",
  "Proteus",
  "Rhea",
  "Selene",
  "Thanatos",
  "Theia",
  "Tethys",
  "Thor",
  "Triton",
  "Tyr",
  "Uranus",
  "Zeus"
];

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
      Accuracy: randomInt(5, 10),
      Attack: randomInt(5, 10),
      CriticalChance: randomInt(5, 10),
      Defense: randomInt(5, 10),
      Evasion: randomInt(5, 10),
      HP: randomInt(20, 30),
      Speed: randomInt(5, 10),
      Stamina: randomInt(5, 10)
    };

    const titan: Titan = {
      abilities: [],
      id,
      name,
      ownerId: playerId,
      stats
    };

    // Assign up to two distinct random abilities from ABILITIES
    const abilityIds = Object.keys(ABILITIES);
    const numToAssign = Math.min(2, abilityIds.length);
    if (numToAssign > 0) {
      const shuffled = [...abilityIds].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, numToAssign);
      titan.abilities = selected.map(id => {
        const ability = ABILITIES[id];
        return {
          cost: ability.cost,
          description: ability.description,
          id: ability.id,
          name: ability.name
        };
      });
    }

    this.titans.set(id, titan);
    this.playerTitans.set(playerId, [id]);
    return titan;
  }
}
