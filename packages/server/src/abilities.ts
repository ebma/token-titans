import type { Titan } from "@shared/index";

/**
 * Minimal ability system.
 *
 * apply signature:
 * (ctx: {
 *   attackerId: string;
 *   defenderId: string;
 *   attackerTitan?: Titan | undefined;
 *   defenderTitan?: Titan | undefined;
 *   hpRecord: Record<string, number>;
 *   chargeRecord: Record<string, number>;
 *   roundLog: string[];
 *   shields: Record<string, number>;
 *   tempSpeedModifiers: Record<string, number>;
 * }) => void
 */
export const ABILITIES: Record<
  string,
  {
    id: string;
    name: string;
    cost: number;
    description: string;
    apply: (ctx: {
      attackerId: string;
      defenderId: string;
      attackerTitan?: Titan | undefined;
      defenderTitan?: Titan | undefined;
      hpRecord: Record<string, number>;
      chargeRecord: Record<string, number>;
      roundLog: string[];
      shields: Record<string, number>;
      tempSpeedModifiers: Record<string, number>;
    }) => void;
  }
> = {
  drain: {
    apply: ({ attackerId, defenderId, attackerTitan, defenderTitan, hpRecord, roundLog, shields }) => {
      const atk = attackerTitan?.stats.Attack ?? 0;
      let damage = Math.round(atk * 0.75);
      // Shield absorbs first
      const shieldAmt = shields[defenderId] ?? 0;
      if (shieldAmt > 0) {
        const absorbed = Math.min(shieldAmt, damage);
        shields[defenderId] = Math.max(0, Math.round(shieldAmt - absorbed));
        damage = Math.max(0, Math.round(damage - absorbed));
        roundLog.push(`${defenderTitan?.name ?? defenderId}'s shield absorbs ${Math.round(absorbed)} damage.`);
      }
      const beforeDef = Math.round(hpRecord[defenderId] ?? 0);
      const afterDef = Math.round(Math.max(0, beforeDef - damage));
      hpRecord[defenderId] = afterDef;
      const heal = Math.round(damage);
      const maxHP = attackerTitan?.stats.HP ?? hpRecord[attackerId] ?? 0;
      const beforeAtk = Math.round(hpRecord[attackerId] ?? 0);
      const afterAtk = Math.min(maxHP, Math.round(beforeAtk + heal));
      hpRecord[attackerId] = afterAtk;
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} uses Drain dealing ${damage} damage and healing ${afterAtk - beforeAtk} HP (${beforeDef} -> ${afterDef}; self ${beforeAtk} -> ${afterAtk}).`
      );
    },
    cost: 35,
    description: "Deal Attack * 0.75 damage and heal caster by same amount.",
    id: "drain",
    name: "Drain"
  },

  focused_strike: {
    apply: ({ attackerId, defenderId, attackerTitan, defenderTitan, hpRecord, roundLog, shields }) => {
      const atk = attackerTitan?.stats.Attack ?? 0;
      const rawDamage = atk * 1.5;
      let damage = Math.round(rawDamage);
      // Apply shield first
      const shieldAmt = shields[defenderId] ?? 0;
      if (shieldAmt > 0) {
        const absorbed = Math.min(shieldAmt, damage);
        shields[defenderId] = Math.max(0, Math.round(shieldAmt - absorbed));
        damage = Math.max(0, Math.round(damage - absorbed));
        roundLog.push(`${defenderTitan?.name ?? defenderId}'s shield absorbs ${Math.round(absorbed)} damage.`);
      }
      const before = Math.round(hpRecord[defenderId] ?? 0);
      const after = Math.round(Math.max(0, before - damage));
      hpRecord[defenderId] = after;
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} uses Focused Strike dealing ${Math.round(damage)} damage (${before} -> ${after}).`
      );
    },
    cost: 25,
    description: "Deal Attack * 1.5 damage.",
    id: "focused_strike",
    name: "Focused Strike"
  },

  fortify: {
    apply: ({ attackerId, attackerTitan, hpRecord, roundLog, shields }) => {
      const beforeHP = Math.round(hpRecord[attackerId] ?? 0);
      const maxHP = attackerTitan?.stats.HP ?? beforeHP;
      const afterHP = Math.min(maxHP, Math.round(beforeHP + 10));
      hpRecord[attackerId] = afterHP;
      // Use shield as temporary small defense for the round
      const beforeShield = Math.round(shields[attackerId] ?? 0);
      shields[attackerId] = Math.round(beforeShield + 10);
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} uses Fortify: heals ${afterHP - beforeHP} HP and gains +10 temporary defense (HP ${beforeHP} -> ${afterHP}).`
      );
    },
    cost: 20,
    description: "Heal 10 and add +10 temporary defense for this round (implemented as small shield).",
    id: "fortify",
    name: "Fortify"
  },

  heal_big: {
    apply: ({ attackerId, attackerTitan, hpRecord, roundLog }) => {
      const maxHP = attackerTitan?.stats.HP ?? hpRecord[attackerId] ?? 0;
      const before = Math.round(hpRecord[attackerId] ?? 0);
      const heal = 50;
      const after = Math.min(maxHP, Math.round(before + heal));
      hpRecord[attackerId] = after;
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} uses Vital Surge and heals ${Math.round(after - before)} HP (${before} -> ${after}).`
      );
    },
    cost: 40,
    description: "Heal self 50 HP.",
    id: "heal_big",
    name: "Vital Surge"
  },
  heal_small: {
    apply: ({ attackerId, attackerTitan, hpRecord, roundLog }) => {
      const maxHP = attackerTitan?.stats.HP ?? hpRecord[attackerId] ?? 0;
      const before = Math.round(hpRecord[attackerId] ?? 0);
      const heal = 25;
      const after = Math.min(maxHP, Math.round(before + heal));
      hpRecord[attackerId] = after;
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} uses Cleansing Light and heals ${Math.round(after - before)} HP (${before} -> ${after}).`
      );
    },
    cost: 20,
    description: "Heal self 25 HP.",
    id: "heal_small",
    name: "Cleansing Light"
  },

  overdrive: {
    apply: ({ attackerId, defenderId, attackerTitan, defenderTitan, hpRecord, roundLog, shields }) => {
      const atk = attackerTitan?.stats.Attack ?? 0;
      let damage = Math.round(atk * 2.5);
      const shieldAmt = shields[defenderId] ?? 0;
      if (shieldAmt > 0) {
        const absorbed = Math.min(shieldAmt, damage);
        shields[defenderId] = Math.max(0, Math.round(shieldAmt - absorbed));
        damage = Math.max(0, Math.round(damage - absorbed));
        roundLog.push(`${defenderTitan?.name ?? defenderId}'s shield absorbs ${Math.round(absorbed)} damage.`);
      }
      const before = Math.round(hpRecord[defenderId] ?? 0);
      const after = Math.round(Math.max(0, before - damage));
      hpRecord[defenderId] = after;
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} uses Overdrive dealing ${Math.round(damage)} damage (${before} -> ${after}).`
      );
    },
    cost: 50,
    description: "Deal Attack * 2.5 damage.",
    id: "overdrive",
    name: "Overdrive"
  },

  quick_charge: {
    apply: ({ attackerId, chargeRecord, roundLog, attackerTitan }) => {
      const before = Math.round(chargeRecord[attackerId] ?? 0);
      const after = Math.min(100, Math.round(before + 40));
      chargeRecord[attackerId] = after;
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} uses Quick Charge and gains ${after - before}% charge (now ${after}%).`
      );
    },
    cost: 5,
    description: "Add +40 charge to caster (capped 100).",
    id: "quick_charge",
    name: "Quick Charge"
  },

  shield: {
    apply: ({ attackerId, roundLog, shields, attackerTitan }) => {
      const before = Math.round(shields[attackerId] ?? 0);
      const after = Math.round(before + 30);
      shields[attackerId] = after;
      roundLog.push(
        `${attackerTitan?.name ?? attackerId} creates a Barrier absorbing 30 damage (shield ${before} -> ${after}).`
      );
    },
    cost: 30,
    description: "Create a shield that absorbs 30 damage for this round.",
    id: "shield",
    name: "Barrier"
  },

  shock: {
    apply: ({ attackerId, defenderId, defenderTitan, hpRecord, roundLog, shields, tempSpeedModifiers }) => {
      const baseDamage = 10;
      let damage = Math.round(baseDamage);
      const shieldAmt = shields[defenderId] ?? 0;
      if (shieldAmt > 0) {
        const absorbed = Math.min(shieldAmt, damage);
        shields[defenderId] = Math.max(0, Math.round(shieldAmt - absorbed));
        damage = Math.max(0, Math.round(damage - absorbed));
        roundLog.push(`${defenderTitan?.name ?? defenderId}'s shield absorbs ${Math.round(absorbed)} damage.`);
      }
      const before = Math.round(hpRecord[defenderId] ?? 0);
      const after = Math.round(Math.max(0, before - damage));
      hpRecord[defenderId] = after;
      tempSpeedModifiers[defenderId] = Math.max(0, (tempSpeedModifiers[defenderId] ?? 1) * 0.75);
      roundLog.push(
        `${attackerId} uses Shock dealing ${damage} damage and reducing ${defenderTitan?.name ?? defenderId}'s Speed by 25% for this round (HP ${before} -> ${after}).`
      );
    },
    cost: 30,
    description: "Deal 10 fixed damage and reduce opponent Speed by 25% for this round.",
    id: "shock",
    name: "Shock"
  },

  weaken: {
    apply: ({ attackerId, defenderId, defenderTitan, roundLog, tempSpeedModifiers }) => {
      // Record a flag in tempSpeedModifiers to indicate weakened defender (abusing this map as a temp-store)
      tempSpeedModifiers[defenderId] = Math.max(0, (tempSpeedModifiers[defenderId] ?? 1) * 0.8);
      roundLog.push(`${defenderTitan?.name ?? defenderId} is weakened: defense reduced by 20% for this round.`);
    },
    cost: 25,
    description: "Reduce opponent defense by 20% for this round (applies to this ability's damage calculation).",
    id: "weaken",
    name: "Weaken"
  }
};
