import { Box, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { Ability, GameAction, PlayerActionEvent } from "@shared/index";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useGameStore } from "@/hooks/useGameStore";
import { useTitanStore } from "@/hooks/useTitanStore";

export function GameView({ ws }: { ws: WebSocket | null }) {
  const game = useGameStore(state => state.game);
  const setGame = useGameStore(state => state.setGame);
  const session = useAuthStore(state => state.session);
  const titans = useTitanStore(state => state.titans);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedAbilityIndex, setSelectedAbilityIndex] = useState<number | null>(0);

  // Reset selected action when a new round starts so the UI does not remain highlighted
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only want to reset on roundNumber change
  useEffect(() => {
    setSelectedAction(null);
    setSelectedAbilityIndex(0);
  }, [game?.meta?.roundNumber]);

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

  const playerTitanId = game?.titans?.[session?.userId ?? ""] ?? undefined;
  const opponentPlayerId = session?.userId ? (game?.players?.find(p => p !== session.userId) ?? null) : null;
  const opponentTitanId = opponentPlayerId ? game?.titans?.[opponentPlayerId] : undefined;
  const playerTitan = titans.find(t => t.id === playerTitanId);
  const opponentTitan = titans.find(t => t.id === opponentTitanId);
  const statsOrder = useMemo(() => ["HP", "Attack", "Defense", "Speed", "Stamina"] as const, []);

  // Read server-provided ephemeral charge/HP meta (may be absent) and optional round log
  const meta = useMemo(() => game?.meta ?? {}, [game?.meta]);
  const charges: Record<string, number> = meta.titanCharges ?? {};
  const hpMeta: Record<string, number> = meta.titanHPs ?? {};
  const roundNumber = meta.roundNumber ?? 1;
  const playerCharge = playerTitanId ? (charges[playerTitanId] ?? 0) : 0;
  const opponentCharge = opponentTitanId ? (charges[opponentTitanId] ?? 0) : 0;
  const playerHP = playerTitanId ? (hpMeta[playerTitanId] ?? playerTitan?.stats.HP ?? "-") : "-";
  const opponentHP = opponentTitanId ? (hpMeta[opponentTitanId] ?? opponentTitan?.stats.HP ?? "-") : "-";

  const lockedPlayers = meta.lockedPlayers ?? {};
  const opponentLocked = opponentPlayerId ? lockedPlayers[opponentPlayerId] : false;

  // Compute abilities once and reuse.
  // Prefer server-provided meta.titanAbilities (global meta) -> fallback from titan.abilities
  const abilities = useMemo<Ability[]>(() => {
    const metaAbilitiesMap = (meta as { titanAbilities?: Record<string, Ability[]> }).titanAbilities ?? {};
    // prefer meta map first
    let abs: Ability[] = playerTitanId ? (metaAbilitiesMap[playerTitanId] ?? []) : [];

    // final fallback: use titan.abilities directly
    if (!abs || abs.length === 0) {
      abs = playerTitan?.abilities ?? [];
    }

    return abs;
  }, [meta, playerTitanId, playerTitan?.abilities]);

  // expose stat objects for safer indexing in the table
  const playerStats = useMemo<Record<string, number | string>>(() => playerTitan?.stats ?? {}, [playerTitan]);
  const opponentStats = useMemo<Record<string, number | string>>(() => opponentTitan?.stats ?? {}, [opponentTitan]);

  // Scene / Canvas (static)
  const SceneCanvas = useMemo(
    () => (
      <Canvas
        camera={{ fov: 50, position: [0, 5, 8] }}
        fallback={<div>Sorry no WebGL supported!</div>}
        shadows
        style={{ height: 300 }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight
          castShadow
          intensity={1}
          position={[0, 10, 5]}
          shadow-camera-bottom={-10}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-near={0.5}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-mapSize-height={1024}
          shadow-mapSize-width={1024}
        />
        <mesh position={[0, -1, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[5, 64]} />
          <meshStandardMaterial attach="material" color="#3cb043" roughness={0.8} />
        </mesh>
        <Box castShadow position={[-2, 0, 0]}>
          <meshStandardMaterial attach="material" color="green" />
        </Box>
        <Box castShadow position={[2, 0, 0]}>
          <meshStandardMaterial attach="material" color="red" />
        </Box>
        <OrbitControls maxDistance={6} maxPolarAngle={Math.PI / 2} minDistance={4} minPolarAngle={0.2} />
      </Canvas>
    ),
    []
  );

  // Ability selector UI
  const AbilitySelectorBlock = useMemo(() => {
    const selIdx = selectedAbilityIndex ?? 0;
    const selectedAbility = abilities[selIdx] ?? abilities[0];
    return (
      <div className="mt-2 mb-1 text-sm">
        <div>
          Selected Ability: <span className="font-semibold">{selectedAbility.name}</span>{" "}
          <span className="text-primary">({selectedAbility.cost}%)</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-3">
          {abilities.map((ab: Ability, idx: number) => (
            <label
              className="inline-flex cursor-pointer select-none items-center gap-2 text-sm"
              key={ab.id + "-" + idx}
              title={ab.description ?? ""}
            >
              <input checked={selIdx === idx} name="ability" onChange={() => setSelectedAbilityIndex(idx)} type="radio" />
              <span>
                {ab.name} <span className="text-primary">({ab.cost}%)</span>
                <Tooltip>
                  <TooltipTrigger>
                    <span aria-hidden className="ml-1 cursor-help text-primary text-xs">
                      ⓘ
                    </span>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    <div className="max-w-xs whitespace-normal break-words text-sm">{ab.description ?? "No description"}</div>
                  </TooltipContent>
                </Tooltip>
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  }, [abilities, selectedAbilityIndex]);

  // Action buttons (Attack, Defend, Special, Rest)
  const ActionButtons = useMemo(
    () => (
      <div className="flex justify-center gap-2">
        <Button
          className={selectedAction === "Attack" ? "bg-indigo-600 text-white" : ""}
          onClick={() => {
            setSelectedAction("Attack");
            handleAction({
              payload: { targetId: opponentPlayerId ?? "player2" },
              type: "Attack"
            });
          }}
        >
          Attack
        </Button>
        <Button
          className={selectedAction === "Defend" ? "bg-indigo-600 text-white" : ""}
          onClick={() => {
            setSelectedAction("Defend");
            handleAction({ type: "Defend" });
          }}
        >
          Defend
        </Button>
        <Button
          className={selectedAction === "Ability" ? "bg-indigo-600 text-white" : ""}
          disabled={playerCharge < (abilities[selectedAbilityIndex ?? 0]?.cost ?? 100)}
          onClick={() => {
            setSelectedAction("Ability");
            const idx = selectedAbilityIndex ?? 0;
            const abilityId = abilities[idx]?.id;
            handleAction({
              payload: { abilityId, targetId: opponentPlayerId ?? "player2" },
              type: "Ability"
            });
          }}
        >
          Ability
        </Button>
        <Button
          className={selectedAction === "Rest" ? "bg-indigo-600 text-white" : ""}
          onClick={() => {
            setSelectedAction("Rest");
            handleAction({ type: "Rest" });
          }}
        >
          Rest
        </Button>
      </div>
    ),
    [selectedAction, playerCharge, handleAction, opponentPlayerId, selectedAbilityIndex, abilities]
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

  // Round / ability card (combines round header, ability selector and buttons)
  const RoundCard = useMemo(
    () => (
      <Card className="shrink">
        <CardHeader>
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="flex items-center gap-4 rounded-4xl bg-primary px-4">
              <div className="font-semibold">Round #{roundNumber}</div>
              <div className="text-sm">{opponentLocked ? "Opponent waiting" : "Opponent undecided"}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {AbilitySelectorBlock}
          {ActionButtons}
        </CardContent>
      </Card>
    ),
    [roundNumber, opponentLocked, AbilitySelectorBlock, ActionButtons]
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
            {meta.roundLog?.length === 0 ? (
              <div>No events yet.</div>
            ) : (
              meta.roundLog?.map((msg, idx) => (
                <div className="text-sm leading-6" key={idx}>
                  {msg}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    ),
    [meta.roundLog]
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

      <div className="flex-grow">{SceneCanvas}</div>

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
