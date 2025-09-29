import type { Titan } from "@shared/index";
import { ABILITIES } from "../abilities";

/**
 * Lightweight ability metadata exposed to clients.
 */
export type TitanAbilityMeta = {
  id: string;
  name: string;
  cost: number;
};

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
  titanAbilities: Record<string, TitanAbilityMeta[]>;
};

/**
 * Build a titanAbilities mapping (titanId -> ability metadata array) from Titan records.
 * If a titan has no explicit abilities, an empty array is returned for that titan.
 */
export function buildTitanAbilities(titanRecord: Record<string, Titan>): Record<string, TitanAbilityMeta[]> {
  const map: Record<string, TitanAbilityMeta[]> = {};
  for (const tid of Object.keys(titanRecord)) {
    const t = titanRecord[tid];
    const abilityIds: string[] = t.abilities ?? [];
    if (!abilityIds || abilityIds.length === 0) {
      map[tid] = [];
    } else {
      map[tid] = abilityIds.map(aid => {
        const ability = ABILITIES[aid];
        return {
          cost: ability?.cost ?? 100,
          id: aid,
          name: ability?.name ?? t.specialAbility ?? "Unknown"
        };
      });
    }
  }
  return map;
}
