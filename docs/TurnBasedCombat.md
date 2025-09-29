# Turn-based combat rules (server)

All rules implemented in [`packages/server/src/game.ts`](packages/server/src/game.ts:1).

Overview:
- Server is authoritative: resolves rounds when both players have submitted actions; uses per-game maps: roundActions, titanHPs, titanCharges, gameTitans.
- Resolve happens in GameManager.resolveRound and updates ephemeral game.meta for broadcasting.

Round lifecycle:
- Players submit actions; server sets game.meta.lockedPlayers for visibility.
- When all players acted, resolveRound:
  - records human-readable choices into roundLog,
  - computes speed rolls and action order,
  - applies actions sequentially in that order,
  - updates titanHPs, titanCharges, and game.meta (roundLog, roundNumber, titanHPs, titanCharges).

Action types:
- Attack, Defend, SpecialAbility, Rest.

Turn order:
- For each titan: $speedRoll = Speed * Math.random()$.
- Higher $speedRoll$ acts first; actions are applied sequentially; if the first action reduces opponent HP to 0 the second action is skipped and the game ends.

Attack damage calculation:
- $attackValue = AttackStat * (1 + rand)$ where $rand \in [0,1)$ (Math.random()).
- Defender base defense = Defense stat.
- If defender used Defend: $defMultiplier = 1.5 + Math.random() * 0.5$ (i.e., between 1.5 and 2.0).
- $effectiveDef = Defense * defMultiplier$ (or $Defense$ when not defending).
- $damage = \max(0, attackValue - effectiveDef)$.
- HP update: $newHP = \text{Math.round}(\max(0, oldHP - damage))$; HP is clamped to >= 0.

SpecialAbility:
- Can only be used when titan's charge === 100; the server ignores SpecialAbility submissions when charge < 100.
- Effect: deterministic damage = $Attack * 2$; after use, attacker's charge is reset to 0.

Defend:
- No immediate HP change by itself; it raises effective defense via the multiplier above.
- If a defended attack occurs, defender gains +20 charge (server does Math.round and caps at 100).
 
Rest:
- Increases special charge by +60% (capped at 100%).

Charge tracking & bookkeeping:
- Server tracks per-game integer titanCharges (0–100). Charges are rounded and clamped to [0,100].
- Per-game bookkeeping: roundActions (playerId -> GameAction), titanHPs, titanCharges, gameTitans for stats.
- game.meta (ephemeral) includes roundLog (human messages), roundNumber, titanHPs, titanCharges and is broadcast to clients (it does not expose opponent-internal action details).

Edge cases:
- SpecialAbility validated on submit; invalid usage is ignored.
- Game is marked Finished when a titan's HP <= 0; resolveRound stops applying further actions.
- All rounding behavior uses Math.round as implemented in [`packages/server/src/game.ts`](packages/server/src/game.ts:1).

Reference: authoritative implementation at [`packages/server/src/game.ts`](packages/server/src/game.ts:1).
