/**
 * XP and leveling system for Titans.
 */

/**
 * Calculate XP required to reach the next level.
 * Formula: floor(100 * 1.15^(level-1))
 */
export function xpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

/**
 * Compute XP awarded after a battle.
 * @param ownLevel - Level of the titan gaining XP
 * @param oppLevel - Level of the opponent titan
 * @param won - Whether this titan won the battle
 * @param defeated - Whether this titan defeated the opponent (only relevant if won)
 */
export function computeBattleXP(ownLevel: number, oppLevel: number, won: boolean, defeated: boolean): number {
  const base = won ? 50 : 20;
  const multiplier = Math.max(0.5, Math.min(2.0, 1 + 0.1 * (oppLevel - ownLevel)));
  let xp = Math.round(base * multiplier);
  if (won && defeated) {
    xp = Math.round(xp * 1.1); // 10% bonus for defeating opponent
  }
  return xp;
}

/**
 * Get stat increase on level up: 0-3 with weighted probabilities (less likely for 0 and 3).
 */
export function getStatIncrease(): number {
  const rand = Math.random();
  if (rand < 0.1) return 0;
  if (rand < 0.4) return 1;
  if (rand < 0.8) return 2;
  return 3;
}
