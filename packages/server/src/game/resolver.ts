import type { GameAction, Titan } from "@shared/index";
import { ABILITIES } from "../abilities";
import type { GameManager } from "./manager";
import { buildTitanAbilities, CombatMeta, RoundMeta } from "./meta";

/**
 * Resolve a round for the given gameId using the provided GameManager instance.
 * This function mutates the GameManager's internal HP/charge records via its
 * exposed accessor/mutator methods.
 */
export function resolveRound(manager: GameManager, gameId: string) {
  const game = manager.getGame(gameId);
  if (!game) return;

  const actions = manager._getRoundActions(gameId) as Record<string, GameAction>;
  const titansForGame = manager._getTitansForGame(gameId) as Record<string, Titan>;
  const hpRecord = { ...(manager._getHPRecord(gameId) ?? {}) };
  const chargeRecord = { ...(manager._getChargeRecord(gameId) ?? {}) };

  const getTitanId = (playerId: string) => game.titans[playerId];
  const getTitanObj = (titanId: string) => titansForGame[titanId];

  const roundLog: string[] = [];
  const shields: Record<string, number> = {};
  const tempSpeedModifiers: Record<string, number> = {};

  // Log choices
  for (const player of game.players) {
    const act = actions[player];
    const titanId = getTitanId(player);
    const titanObj = getTitanObj(titanId);
    if (act) {
      roundLog.push(`${titanObj?.name ?? titanId} chooses to ${act.type === "SpecialAbility" ? "SpecialAbility" : act.type}.`);
    }
  }

  // Ensure hp/charge entries exist
  for (const p of game.players) {
    const tid = getTitanId(p);
    const t = getTitanObj(tid);
    if (!(tid in hpRecord)) hpRecord[tid] = t?.stats.HP ?? 0;
    if (!(tid in chargeRecord)) chargeRecord[tid] = 0;
  }

  // Speed rolls
  const speedRolls: Record<string, number> = {};
  for (const player of game.players) {
    const tid = getTitanId(player);
    const titan = getTitanObj(tid);
    speedRolls[player] = (titan?.stats.Speed ?? 0) * Math.random();
  }
  const order = [...game.players].sort((a, b) => speedRolls[b] - speedRolls[a]);

  for (const attacker of order) {
    if (game.gameState === "Finished") break;

    const act = actions[attacker];
    if (!act) continue;

    const defender = game.players.find(p => p !== attacker);
    if (!defender) continue;
    const attackerTitanId = getTitanId(attacker);
    const defenderTitanId = getTitanId(defender);
    const attackerTitan = getTitanObj(attackerTitanId);
    const defenderTitan = getTitanObj(defenderTitanId);
    const defenderAction = actions[defender];

    if (!(attackerTitanId in hpRecord)) hpRecord[attackerTitanId] = attackerTitan?.stats.HP ?? 0;
    if (!(defenderTitanId in hpRecord)) hpRecord[defenderTitanId] = defenderTitan?.stats.HP ?? 0;
    if (!(attackerTitanId in chargeRecord)) chargeRecord[attackerTitanId] = 0;
    if (!(defenderTitanId in chargeRecord)) chargeRecord[defenderTitanId] = 0;

    if ((hpRecord[defenderTitanId] ?? 0) <= 0) continue;

    if (act.type === "Attack") {
      const rand = Math.random();
      const attackValue = (attackerTitan?.stats.Attack ?? 0) * (1 + rand);
      const defenderBaseDef = defenderTitan?.stats.Defense ?? 0;
      const defMultiplier = defenderAction?.type === "Defend" ? 1.5 + Math.random() * 0.5 : 1;
      const effectiveDef = defenderBaseDef * defMultiplier;
      const damageRaw = Math.max(0, attackValue - effectiveDef);

      let damage = Math.round(damageRaw);
      const shieldAmt = shields[defenderTitanId] ?? 0;
      if (shieldAmt > 0 && damage > 0) {
        const absorbed = Math.min(shieldAmt, damage);
        shields[defenderTitanId] = Math.max(0, Math.round(shieldAmt - absorbed));
        damage = Math.max(0, Math.round(damage - absorbed));
        roundLog.push(`${defenderTitan?.name ?? defenderTitanId}'s shield absorbs ${Math.round(absorbed)} damage.`);
      }

      const beforeHP = hpRecord[defenderTitanId] ?? 0;
      const afterHP = Math.round(Math.max(0, beforeHP - damage));
      hpRecord[defenderTitanId] = afterHP;

      if (defenderAction?.type === "Defend") {
        chargeRecord[defenderTitanId] = Math.min(100, Math.round((chargeRecord[defenderTitanId] ?? 0) + 20));
        roundLog.push(
          `${defenderTitan?.name ?? defenderTitanId} defended and charges special by +20 (now ${chargeRecord[defenderTitanId]}%).`
        );
      }

      roundLog.push(
        `${attackerTitan?.name ?? attackerTitanId} deals ${Math.round(damage)} damage to ${defenderTitan?.name ?? defenderTitanId} (HP: ${Math.round(
          beforeHP
        )} -> ${afterHP}).`
      );

      if (afterHP <= 0) {
        game.gameState = "Finished";
        roundLog.push(`${defenderTitan?.name ?? defenderTitanId} is defeated — ${defender} wins.`);
        break;
      }
    } else if (act.type === "SpecialAbility") {
      // Read abilityIndex from payload (default 0)
      const abilityIndex = (act as { payload?: { abilityIndex?: number } }).payload?.abilityIndex ?? 0;
      const titanObj = titansForGame[attackerTitanId];
      const abilityId = titanObj?.abilities?.[abilityIndex];
      if (!abilityId) {
        roundLog.push(
          `${attackerTitan?.name ?? attackerTitanId} attempted SpecialAbility (index ${abilityIndex}) but no ability found at that index.`
        );
        continue;
      }

      const ability = ABILITIES[abilityId];
      if (!ability) {
        roundLog.push(
          `${attackerTitan?.name ?? attackerTitanId} attempted SpecialAbility but ability data missing for id=${abilityId}.`
        );
        continue;
      }

      const cost = ability.cost ?? 100;
      if ((chargeRecord[attackerTitanId] ?? 0) < cost) {
        roundLog.push(`${attackerTitan?.name ?? attackerTitanId} attempted ${ability.name} but has insufficient charge.`);
        continue;
      }

      chargeRecord[attackerTitanId] = Math.max(0, Math.round((chargeRecord[attackerTitanId] ?? 0) - cost));

      try {
        ability.apply({
          attackerId: attackerTitanId,
          attackerTitan,
          chargeRecord,
          defenderId: defenderTitanId,
          defenderTitan,
          hpRecord,
          roundLog,
          shields,
          tempSpeedModifiers
        });
      } catch (_e) {
        roundLog.push(`${attackerTitan?.name ?? attackerTitanId} failed to use ${ability.name}.`);
      }

      const afterHP = hpRecord[defenderTitanId] ?? 0;
      if (afterHP <= 0) {
        game.gameState = "Finished";
        roundLog.push(`${defenderTitan?.name ?? defenderTitanId} is defeated — ${defender} wins.`);
        break;
      }
    } else if (act.type === "Rest") {
      chargeRecord[attackerTitanId] = Math.min(100, Math.round((chargeRecord[attackerTitanId] ?? 0) + 60));
      roundLog.push(
        `${attackerTitan?.name ?? attackerTitanId} rests and charges special by +60 (now ${chargeRecord[attackerTitanId]}%).`
      );
    } else if (act.type === "Defend") {
      // nothing immediate
    }
  }

  // Normalize chargeRecord
  for (const tid of Object.keys(chargeRecord)) {
    chargeRecord[tid] = Math.max(0, Math.min(100, Math.round(chargeRecord[tid])));
  }

  manager._setHPRecord(gameId, hpRecord);
  manager._setChargeRecord(gameId, chargeRecord);

  const startRound = (game.meta?.roundNumber as number) ?? 1;
  const nextRound = game.gameState === "Finished" ? startRound : startRound + 1;

  const titanAbilitiesMap = buildTitanAbilities(titansForGame);
  game.meta = {
    roundLog,
    roundNumber: nextRound,
    titanAbilities: titanAbilitiesMap,
    titanCharges: { ...chargeRecord },
    titanHPs: { ...hpRecord }
  };

  manager._clearRoundActions(gameId);
}
