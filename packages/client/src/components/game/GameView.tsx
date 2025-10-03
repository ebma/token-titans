import type { Ability, GameAction, PlayerActionEvent } from "@shared/index";
import { TITAN_STATS_ORDER } from "@shared/index";
import { ArrowLeft, Hourglass } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useGameStore } from "@/hooks/useGameStore";
import { GameCanvas } from "./GameCanvas";

export function GameView({ ws }: { ws: WebSocket | null }) {
  const game = useGameStore(state => state.game);
  const setGame = useGameStore(state => state.setGame);
  const lastRoundResult = useGameStore(state => state.lastRoundResult);
  const session = useAuthStore(state => state.session);
  const [selectedActionType, setSelectedActionType] = useState<"Attack" | "Defend" | "Rest" | "Ability" | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);

  // Reset selected action when a new round starts so the UI does not remain highlighted
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only want to reset on roundNumber change
  useEffect(() => {
    setSelectedActionType(null);
    setSelectedAbilityId(null);
  }, [lastRoundResult?.roundNumber]);

  const isWaiting = !game || !session;

  const handleAction = useCallback(
    (action: GameAction) => {
      if (!ws || !game || !session) return;
      const event: PlayerActionEvent = {
        payload: {
          action,
          gameId: game.id,
          playerId: session.userId
        },
        type: "playerAction"
      };
      ws.send(JSON.stringify(event));
    },
    [game, session, ws]
  );

  const playerTitan = game?.titans?.[session?.userId ?? ""];
  const opponentPlayerId = session?.userId ? (game?.players?.find(p => p !== session.userId) ?? null) : null;
  const opponentTitan = opponentPlayerId ? game?.titans?.[opponentPlayerId] : undefined;
  const statsOrder = TITAN_STATS_ORDER;

  // Read server-provided ephemeral charge/HP meta (may be absent) and optional round log
  const meta = useMemo(() => game?.meta ?? {}, [game?.meta]);
  const charges: Record<string, number> = meta.titanCharges ?? {};
  const hpMeta: Record<string, number> = meta.titanHPs ?? {};
  const roundNumber = lastRoundResult?.roundNumber ?? 1;
  const playerCharge = playerTitan ? (charges[playerTitan.id] ?? 0) : 0;
  const opponentCharge = opponentTitan ? (charges[opponentTitan.id] ?? 0) : 0;
  const playerHP = playerTitan ? (hpMeta[playerTitan.id] ?? playerTitan.stats.HP ?? "-") : "-";
  const opponentHP = opponentTitan ? (hpMeta[opponentTitan.id] ?? opponentTitan.stats.HP ?? "-") : "-";

  const lockedPlayers = meta.lockedPlayers ?? {};
  const playerLocked = session?.userId ? lockedPlayers[session.userId] : false;
  const opponentLocked = opponentPlayerId ? lockedPlayers[opponentPlayerId] : false;

  // Compute abilities once and reuse.
  // Prefer server-provided meta.titanAbilities (global meta) -> fallback from titan.abilities
  const abilities = useMemo<Ability[]>(() => {
    const metaAbilitiesMap = (meta as { titanAbilities?: Record<string, Ability[]> }).titanAbilities ?? {};
    // prefer meta map first
    let abs: Ability[] = playerTitan ? (metaAbilitiesMap[playerTitan.id] ?? []) : [];

    // final fallback: use titan.abilities directly
    if (!abs || abs.length === 0) {
      abs = playerTitan?.abilities ?? [];
    }

    return abs;
  }, [meta, playerTitan]);

  const sequence = lastRoundResult?.roundSequence || [];

  // expose stat objects for safer indexing in the table
  const playerStats = useMemo<Record<string, number | string>>(() => playerTitan?.stats ?? {}, [playerTitan]);
  const opponentStats = useMemo<Record<string, number | string>>(() => opponentTitan?.stats ?? {}, [opponentTitan]);

  // Action selector UI
  const ActionSelector = useMemo(
    () => (
      <div className="space-y-2">
        <div className="flex justify-center gap-2">
          <Button
            className={selectedActionType === "Attack" ? "bg-indigo-600 text-white" : ""}
            onClick={() => {
              setSelectedActionType("Attack");
              setSelectedAbilityId(null);
              handleAction({
                payload: { targetId: opponentPlayerId ?? "player2" },
                type: "Attack"
              });
            }}
          >
            Attack
          </Button>
          <Button
            className={selectedActionType === "Defend" ? "bg-indigo-600 text-white" : ""}
            onClick={() => {
              setSelectedActionType("Defend");
              setSelectedAbilityId(null);
              handleAction({ type: "Defend" });
            }}
          >
            Defend
          </Button>
          <Button
            className={selectedActionType === "Rest" ? "bg-indigo-600 text-white" : ""}
            onClick={() => {
              setSelectedActionType("Rest");
              setSelectedAbilityId(null);
              handleAction({ type: "Rest" });
            }}
          >
            Rest
          </Button>
        </div>
        {abilities.map((ab: Ability) => (
          <div className="flex justify-center" key={ab.id}>
            <Tooltip delayDuration={500}>
              <TooltipTrigger>
                <Button
                  className={selectedActionType === "Ability" && selectedAbilityId === ab.id ? "bg-indigo-600 text-white" : ""}
                  disabled={playerCharge < ab.cost}
                  onClick={() => {
                    setSelectedActionType("Ability");
                    setSelectedAbilityId(ab.id);
                    handleAction({
                      payload: { abilityId: ab.id, targetId: opponentPlayerId ?? "player2" },
                      type: "Ability"
                    });
                  }}
                >
                  {ab.name} ({ab.cost}%)
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                <div className="max-w-60 whitespace-normal break-words text-sm">{ab.description}</div>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    ),
    [selectedActionType, selectedAbilityId, playerCharge, handleAction, opponentPlayerId, abilities]
  );

  // Stats table
  const StatsCard = useMemo(
    () => (
      <Card className="shrink">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stat</TableHead>
                <TableHead>{playerTitan?.name ?? "You"}</TableHead>
                <TableHead>{opponentTitan?.name ?? "Opponent"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableHead>HP</TableHead>
                <TableCell>{playerHP}</TableCell>
                <TableCell>{opponentHP}</TableCell>
              </TableRow>

              {statsOrder
                .filter(s => s !== "HP")
                .map(stat => (
                  <TableRow key={stat as string}>
                    <TableHead>{stat}</TableHead>
                    <TableCell>{playerStats[stat as string] ?? "-"}</TableCell>
                    <TableCell>{opponentStats[stat as string] ?? "-"}</TableCell>
                  </TableRow>
                ))}

              <TableRow>
                <TableHead>Charge</TableHead>
                <TableCell>{playerCharge}%</TableCell>
                <TableCell>{opponentCharge}%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ),
    [playerTitan, opponentTitan, playerHP, opponentHP, statsOrder, playerCharge, opponentCharge, playerStats, opponentStats]
  );

  // Round / action card (combines round header and action selector)
  const RoundCard = useMemo(
    () => (
      <Card className="shrink">
        <CardHeader>
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="text-xl">Round #{roundNumber}</div>
            <Badge className={playerLocked ? "bg-green-600 text-white" : "bg-yellow-500 text-black"}>
              <div className="text-sm">
                {!playerLocked ? "Choose an action" : !opponentLocked ? "Waiting for opponent" : "All done. "}
              </div>
              {opponentLocked && <Hourglass />}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>{ActionSelector}</CardContent>
      </Card>
    ),
    [roundNumber, opponentLocked, playerLocked, ActionSelector]
  );

  // Game log card
  const LogCard = useMemo(
    () => (
      <Card className="m-4 grow">
        <CardHeader>
          <CardTitle>
            <h3 className="mb-2 font-bold">Game Log</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {lastRoundResult?.roundLog?.length === 0 ? (
              <div>No events yet.</div>
            ) : (
              lastRoundResult?.roundLog?.map((msg, idx) => (
                <div className="text-sm leading-6" key={idx}>
                  {msg}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),
    [lastRoundResult?.roundLog]
  );

  if (isWaiting) {
    return <div>Waiting for game to start...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="p-4">
        <Button
          disabled={game.gameState !== "Finished"}
          onClick={() => {
            setGame(null);
            if (ws) {
              ws.send(JSON.stringify({ type: "lobbyInfoRequest" }));
            }
          }}
        >
          <ArrowLeft />
          Back
        </Button>
      </div>

      <div className="flex-grow">
        <GameCanvas opponentId={opponentPlayerId ?? undefined} playerId={session?.userId} sequence={sequence} />
      </div>

      <div className="m-4">
        <div className="flex flex-row justify-around gap-4">
          {RoundCard}
          {StatsCard}
        </div>

        {LogCard}
      </div>
    </div>
  );
}
