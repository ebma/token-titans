import type { Game, GameAction, Titan } from "@shared/index";
import { randomUUID } from "crypto";
import { ABILITIES } from "./abilities";

/**
 * GameManager now tracks per-game ephemeral state:
 * - roundActions: map gameId -> (playerId -> GameAction)
 * - titanHPs: map gameId -> (titanId -> currentHP)
 * - titanCharges: map gameId -> (titanId -> currentCharge 0-100)
 * - gameTitans: map gameId -> (titanId -> Titan) for access to stats
 *
 * The Game object stored in memory will be augmented at runtime with a `meta` field
 * containing titanHPs and titanCharges so handlers can broadcast it to clients.
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

    // Attach lightweight ephemeral meta to the stored Game object for broadcasting.
    // titanAbilities is now an array per titan so clients can render multiple abilities.
    const titanAbilitiesMap: Record<string, { id: string; name: string; cost: number }[]> = {};
    for (const tid of Object.keys(titanRecord)) {
      const t = titanRecord[tid];
      const abilityIds: string[] = (t as any).abilities ?? [];
      if (!abilityIds || abilityIds.length === 0) {
        // No explicit abilities listed; expose empty array so client can fall back to specialAbility text
        titanAbilitiesMap[tid] = [];
      } else {
        titanAbilitiesMap[tid] = abilityIds.map(aid => {
          const ability = ABILITIES[aid];
          return {
            cost: ability?.cost ?? 100,
            id: aid,
            name: ability?.name ?? (t as any).specialAbility ?? "Unknown"
          };
        });
      }
    }
    (game as any).meta = {
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

    const titanAbilitiesMap: Record<string, { id: string; name: string; cost: number }[]> = {};
    for (const tid of Object.keys(titanRecord)) {
      const t = titanRecord[tid];
      const abilityIds: string[] = (t as any).abilities ?? [];
      if (!abilityIds || abilityIds.length === 0) {
        titanAbilitiesMap[tid] = [];
      } else {
        titanAbilitiesMap[tid] = abilityIds.map(aid => {
          const ability = ABILITIES[aid];
          return {
            cost: ability?.cost ?? 100,
            id: aid,
            name: ability?.name ?? (t as any).specialAbility ?? "Unknown"
          };
        });
      }
    }

    (game as any).meta = {
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
   * - validate SpecialAbility availability (charge==100), otherwise ignore the action
   * - store action for the round; when both players acted, resolve simultaneously
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

    const titanId = game.titans[playerId];
    const charges = this.titanCharges.get(gameId)!;
    const currentCharge = charges[titanId] ?? 0;

    // Validate SpecialAbility usage against titan's ability cost
    if (action.type === "SpecialAbility") {
      const titansForGame = this.gameTitans.get(gameId) ?? {};
      const titanObj = titansForGame[titanId];
      const abilityId = (titanObj as any).abilities?.[0];
      const ability = abilityId ? ABILITIES[abilityId] : undefined;
      const cost = ability?.cost ?? 100;
      if (currentCharge < cost) {
        // Ignore the player's choice, return current game state (so clients receive updated info)
        return game;
      }
    }

    // Store action for the round
    const actions = this.roundActions.get(gameId) ?? {};
    actions[playerId] = action;
    this.roundActions.set(gameId, actions);

    // Mark this player as having locked in for the current round (for client visibility)
    const currentMeta = (game as any).meta ?? {};
    const currentLocked = (currentMeta.lockedPlayers as Record<string, boolean>) ?? {};
    currentLocked[playerId] = true;
    game.meta = { ...currentMeta, lockedPlayers: { ...currentLocked } };

    // If all players have submitted actions, resolve simultaneously
    const allPlayersActed = game.players.every(pId => actions[pId] !== undefined);
    if (allPlayersActed) {
      this.resolveRound(game.id);
    }

    // Return updated game object (it may have been augmented)
    return this.getGame(gameId);
  }

  private resolveRound(gameId: string) {
    const game = this.getGame(gameId);
    if (!game) return;

    const actions = this.roundActions.get(gameId) ?? {};
    const titansForGame = this.gameTitans.get(gameId) ?? {};
    const hpRecord = { ...(this.titanHPs.get(gameId) ?? {}) };
    const chargeRecord = { ...(this.titanCharges.get(gameId) ?? {}) };

    // Helper to get titan id and titan object for a player
    const getTitanId = (playerId: string) => game.titans[playerId];
    const getTitanObj = (titanId: string) => titansForGame[titanId];

    // Prepare round log
    const roundLog: string[] = [];

    // Prepare temporary shields and speed modifiers for this resolution
    const shields: Record<string, number> = {};
    const tempSpeedModifiers: Record<string, number> = {};

    // Log choices (locked before resolving)
    for (const player of game.players) {
      const act = actions[player];
      const titanId = getTitanId(player);
      const titanObj = getTitanObj(titanId);
      if (act) {
        roundLog.push(
          `${titanObj?.name ?? titanId} chooses to ${act.type === "SpecialAbility" ? "SpecialAbility" : act.type}.`
        );
      }
    }

    // Ensure records exist for all involved titans
    for (const p of game.players) {
      const tid = getTitanId(p);
      const t = getTitanObj(tid);
      if (!(tid in hpRecord)) hpRecord[tid] = t?.stats.HP ?? 0;
      if (!(tid in chargeRecord)) chargeRecord[tid] = 0;
    }

    // Compute speed rolls and determine action order
    const speedRolls: Record<string, number> = {};
    for (const player of game.players) {
      const tid = getTitanId(player);
      const titan = getTitanObj(tid);
      speedRolls[player] = (titan?.stats.Speed ?? 0) * Math.random();
    }
    const order = [...game.players].sort((a, b) => speedRolls[b] - speedRolls[a]); // descending: higher speedRoll acts first

    // Resolve actions sequentially in order
    for (const attacker of order) {
      // If game already finished due to earlier action, skip remaining
      if (game.gameState === "Finished") break;

      const act = actions[attacker];
      if (!act) continue;

      const defender = game.players.find(p => p !== attacker)!;
      const attackerTitanId = getTitanId(attacker);
      const defenderTitanId = getTitanId(defender);
      const attackerTitan = getTitanObj(attackerTitanId);
      const defenderTitan = getTitanObj(defenderTitanId);
      const defenderAction = actions[defender];

      // Ensure hp/charge exist
      if (!(attackerTitanId in hpRecord)) hpRecord[attackerTitanId] = attackerTitan?.stats.HP ?? 0;
      if (!(defenderTitanId in hpRecord)) hpRecord[defenderTitanId] = defenderTitan?.stats.HP ?? 0;
      if (!(attackerTitanId in chargeRecord)) chargeRecord[attackerTitanId] = 0;
      if (!(defenderTitanId in chargeRecord)) chargeRecord[defenderTitanId] = 0;

      // If defender already dead, skip applying this action
      if ((hpRecord[defenderTitanId] ?? 0) <= 0) {
        continue;
      }

      if (act.type === "Attack") {
        const rand = Math.random();
        const attackValue = (attackerTitan?.stats.Attack ?? 0) * (1 + rand);
        const defenderBaseDef = defenderTitan?.stats.Defense ?? 0;
        const defMultiplier = defenderAction?.type === "Defend" ? 1.5 + Math.random() * 0.5 : 1; // Between 1.5 and 2.0
        const effectiveDef = defenderBaseDef * defMultiplier;
        const damageRaw = Math.max(0, attackValue - effectiveDef);

        // Apply shields if present
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

        // If defender defended this attack, it charges +20 (cap below)
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

        // If defender died, mark finished and log
        if (afterHP <= 0) {
          game.gameState = "Finished";
          roundLog.push(`${defenderTitan?.name ?? defenderTitanId} is defeated — ${defender} wins.`);
          // Do not allow further actions
          break;
        }
      } else if (act.type === "SpecialAbility") {
        // Resolve special ability by looking up titan's assigned ability by index (provided by client) or default to 0.
        const titansForGame = this.gameTitans.get(gameId) ?? {};
        const titanObj = titansForGame[attackerTitanId];
        const abilityIndex = (act as any).payload?.abilityIndex ?? 0;
        const abilityId = (titanObj as any).abilities?.[abilityIndex];
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

        // Deduct cost (do not reset to 0)
        chargeRecord[attackerTitanId] = Math.max(0, Math.round((chargeRecord[attackerTitanId] ?? 0) - cost));

        // Call ability apply which will mutate hpRecord/chargeRecord/shields/tempSpeedModifiers and append to roundLog
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
        } catch (e) {
          roundLog.push(`${attackerTitan?.name ?? attackerTitanId} failed to use ${ability.name}.`);
        }

        // Check if defender died as a result
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
        // Defend only matters when being attacked (handled in attack branch)
        // No immediate HP change; we already logged the choice above.
      }
    }

    // Ensure charges are integers and bounded between 0 and 100
    for (const tid of Object.keys(chargeRecord)) {
      chargeRecord[tid] = Math.max(0, Math.min(100, Math.round(chargeRecord[tid])));
    }

    // Store back updated records
    this.titanHPs.set(gameId, hpRecord);
    this.titanCharges.set(gameId, chargeRecord);

    // Update ephemeral meta on the game object so handlers can broadcast it, include roundLog
    // Advance the round number only when the game continues; reset lockedPlayers for the next round.
    const startRound = (game.meta?.roundNumber as number) ?? 1;
    const nextRound = game.gameState === "Finished" ? startRound : startRound + 1;
    // Build titanAbilities mapping for meta (array per titan)
    const titanAbilitiesMap: Record<string, { id: string; name: string; cost: number }[]> = {};
    const titansForGameFinal = this.gameTitans.get(gameId) ?? {};
    for (const tid of Object.keys(titansForGameFinal)) {
      const t = titansForGameFinal[tid];
      const abilityIds: string[] = (t as any).abilities ?? [];
      if (!abilityIds || abilityIds.length === 0) {
        titanAbilitiesMap[tid] = [];
      } else {
        titanAbilitiesMap[tid] = abilityIds.map(aid => {
          const ability = ABILITIES[aid];
          return {
            cost: ability?.cost ?? 100,
            id: aid,
            name: ability?.name ?? (t as any).specialAbility ?? "Unknown"
          };
        });
      }
    }

    (game as any).meta = {
      roundLog,
      roundNumber: nextRound,
      titanAbilities: titanAbilitiesMap,
      titanCharges: { ...chargeRecord },
      titanHPs: { ...hpRecord }
    };

    // Clear stored actions for next round
    this.roundActions.set(gameId, {});
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
