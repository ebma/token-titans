import type { Ability, Titan } from "@shared/index";
import { ABILITIES } from "../abilities";

/**
 * Round-related ephemeral metadata.
 */
export type RoundMeta = {
  roundNumber: number;
  roundLog: string[];
  lockedPlayers: Record<string, boolean>;
};

/**
 * Combat-related ephemeral metadata.
 */
export type CombatMeta = {
  titanHPs: Record<string, number>;
  titanCharges: Record<string, number>;
  titanAbilities: Record<string, Ability[]>;
};

/**
 * Build a titanAbilities mapping (titanId -> ability metadata array) from Titan records.
 * If a titan has no explicit abilities, an empty array is returned for that titan.
 */
export function buildTitanAbilities(titanRecord: Record<string, Titan>): Record<string, Ability[]> {
  const map: Record<string, Ability[]> = {};
  for (const tid of Object.keys(titanRecord)) {
    const t = titanRecord[tid];
    const abilities = t.abilities ?? [];
    if (!abilities || abilities.length === 0) {
      map[tid] = [];
    } else {
      map[tid] = abilities.map(ability => ({
        cost: ability.cost,
        description: ability.description,
        id: ability.id,
        name: ability.name
      }));
    }
  }
  return map;
}
