import { Box, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { GameAction, PlayerActionEvent } from "@shared/index";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  if (!game || !session) {
    return <div>Waiting for game to start...</div>;
  }

  const handleAction = (action: GameAction) => {
    if (!ws) return;
    const event: PlayerActionEvent = {
      payload: {
        action,
        gameId: game.id,
        playerId: session.userId
      },
      type: "playerAction"
    };
    ws.send(JSON.stringify(event));
  };

  const playerTitanId = game.titans[session.userId];
  const opponentPlayerId = game.players.find(p => p !== session.userId) ?? null;
  const opponentTitanId = opponentPlayerId ? game.titans[opponentPlayerId] : undefined;
  const playerTitan = titans.find(t => t.id === playerTitanId);
  const opponentTitan = titans.find(t => t.id === opponentTitanId);
  const statsOrder = ["HP", "Attack", "Defense", "Speed", "Stamina"] as const;

  // Read server-provided ephemeral charge/HP meta (may be absent) and optional round log
  const meta = game.meta ?? {};
  const charges: Record<string, number> = meta.titanCharges ?? {};
  const hpMeta: Record<string, number> = meta.titanHPs ?? {};
  const roundLog: string[] = meta.roundLog ?? [];
  const roundNumber = meta.roundNumber ?? 1;
  const playerCharge = playerTitanId ? (charges[playerTitanId] ?? 0) : 0;
  const opponentCharge = opponentTitanId ? (charges[opponentTitanId] ?? 0) : 0;
  const playerHP = playerTitanId ? (hpMeta[playerTitanId] ?? playerTitan?.stats.HP ?? "-") : "-";
  const opponentHP = opponentTitanId ? (hpMeta[opponentTitanId] ?? opponentTitan?.stats.HP ?? "-") : "-";

  const lockedPlayers = meta.lockedPlayers ?? {};
  const opponentLocked = opponentPlayerId ? !!lockedPlayers[opponentPlayerId] : false;

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
        <Canvas
          camera={{ fov: 50, position: [0, 5, 8] }}
          fallback={<div>Sorry no WebGL supported!</div>}
          shadows
          style={{ height: 400 }}
        >
          <ambientLight intensity={0.3} />
          {/* top directional light that casts shadows onto the plane */}
          <directionalLight
            castShadow
            intensity={1}
            position={[0, 10, 5]}
            // shadow quality and camera bounds for the directional light
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
          {/* player cube (left) - green */}
          <Box castShadow position={[-2, 0, 0]}>
            <meshStandardMaterial attach="material" color="green" />
          </Box>
          {/* enemy cube (right) - red */}
          <Box castShadow position={[2, 0, 0]}>
            <meshStandardMaterial attach="material" color="red" />
          </Box>
          <OrbitControls maxDistance={6} maxPolarAngle={Math.PI / 2} minDistance={4} minPolarAngle={0.2} />
        </Canvas>
      </div>
      <div className="flex flex-col items-center gap-2 p-4">
        <div className="flex items-center gap-4 rounded-4xl bg-primary px-4">
          <div className="font-semibold">Round #{roundNumber}</div>
          <div className="text-sm">{opponentLocked ? "Opponent waiting" : "Opponent undecided"}</div>
        </div>
        {/* Ability info (from server meta if available) - now supports multiple abilities per titan */}
        <div className="mt-2 mb-1 text-sm">
          {(() => {
            const titanAbilitiesMeta =
              (
                meta as unknown as {
                  titanAbilities?: Record<string, { id: string; name: string; cost: number; description?: string }[]>;
                }
              ).titanAbilities ?? {};
            let abilities = playerTitanId ? (titanAbilitiesMeta[playerTitanId] ?? []) : [];
            if (!abilities || abilities.length === 0) {
              abilities = playerTitanId
                ? [{ cost: 100, id: "none", name: playerTitan?.specialAbility ?? "None" }]
                : [{ cost: 100, id: "none", name: "None" }];
            }
            const selIdx = selectedAbilityIndex ?? 0;
            const selectedAbility = abilities[selIdx] ?? abilities[0];
            return (
              <div>
                <div>
                  Selected Ability: <span className="font-semibold">{selectedAbility.name}</span>{" "}
                  <span className="text-muted">({selectedAbility.cost}%)</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3">
                  {abilities.map((ab, idx) => (
                    <label
                      className="inline-flex cursor-pointer select-none items-center gap-2 text-sm"
                      key={ab.id + "-" + idx}
                      title={ab.description ?? ""}
                    >
                      <input
                        checked={selIdx === idx}
                        name="ability"
                        onChange={() => setSelectedAbilityIndex(idx)}
                        type="radio"
                      />
                      <span>
                        {ab.name} <span className="text-muted">({ab.cost}%)</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
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
            className={selectedAction === "SpecialAbility" ? "bg-indigo-600 text-white" : ""}
            // Only allow Special Ability when the titan is fully charged to 100%
            disabled={playerCharge < 100}
            onClick={() => {
              setSelectedAction("SpecialAbility");
              const idx = selectedAbilityIndex ?? 0;
              handleAction({
                payload: { abilityIndex: idx, targetId: opponentPlayerId ?? "player2" },
                type: "SpecialAbility"
              });
            }}
          >
            Special Ability
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
      </div>

      <Card className="m-4">
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
              {/* Show HP from server meta when available */}
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
                    <TableCell>{playerTitan ? playerTitan.stats[stat] : "-"}</TableCell>
                    <TableCell>{opponentTitan ? opponentTitan.stats[stat] : "-"}</TableCell>
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

      <Card className="m-4">
        <CardHeader>
          <CardTitle>
            <h3 className="mb-2 font-bold">Game Log</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {roundLog.length === 0 ? (
              <div>No events yet.</div>
            ) : (
              roundLog.map((msg, idx) => (
                <div className="text-sm leading-6" key={idx}>
                  {msg}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
