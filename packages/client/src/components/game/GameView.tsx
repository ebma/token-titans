import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { Ability, GameAction, PlayerActionEvent, RoundAction, RoundSequence } from "@shared/index";
import { ArrowLeft, BadgeCheckIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Badge } from "@/components/ui/badge.tsx";
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
  const [selectedActionType, setSelectedActionType] = useState<"Attack" | "Defend" | "Rest" | "Ability" | null>(null);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);

  // Animation refs and state
  const playerMeshRef = useRef<THREE.Mesh>(null);
  const opponentMeshRef = useRef<THREE.Mesh>(null);
  const [currentSequence, setCurrentSequence] = useState<RoundSequence>([]);
  const [animating, setAnimating] = useState(false);

  // Reset selected action when a new round starts so the UI does not remain highlighted
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only want to reset on roundNumber change
  useEffect(() => {
    setSelectedActionType(null);
    setSelectedAbilityId(null);
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

  // Sound helper
  const playSound = (type: "attack" | "defend" | "rest" | "ability") => {
    // Add sound files to public/sounds/attack.mp3, defend.mp3, rest.mp3, ability.mp3
    const audio = new Audio(`/public/sounds/${type}.mp3`);
    audio.play().catch(() => {}); // Ignore errors if sound not found
  };

  // Animation helpers
  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  const animateAttack = (actorMesh: THREE.Mesh, targetMesh: THREE.Mesh, result?: string) => {
    return new Promise<void>(resolve => {
      const startPos = actorMesh.position.clone();
      const targetPos = targetMesh.position.clone();
      const direction = targetPos.clone().sub(startPos).normalize();
      const lungePos = startPos.clone().add(direction.multiplyScalar(1.5));
      let t = 0;
      const duration = 250;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        t = Math.min(elapsed / duration, 1);
        actorMesh.position.lerpVectors(startPos, lungePos, t);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          // back
          t = 0;
          const backStartTime = Date.now();
          const backAnimate = () => {
            const backElapsed = Date.now() - backStartTime;
            const backT = Math.min(backElapsed / duration, 1);
            actorMesh.position.lerpVectors(lungePos, startPos, backT);
            if (backT < 1) {
              requestAnimationFrame(backAnimate);
            } else {
              if (result === "Death") {
                targetMesh.scale.set(0.1, 0.1, 0.1);
              }
              resolve();
            }
          };
          backAnimate();
        }
      };
      animate();
      playSound("attack");
    });
  };

  const animateDefend = (actorMesh: THREE.Mesh) => {
    return new Promise<void>(resolve => {
      const startRot = actorMesh.rotation.z;
      const startScale = actorMesh.scale.clone();
      const endRot = startRot + Math.PI / 4;
      const endScale = startScale.clone().multiplyScalar(1.15);
      let t = 0;
      const duration = 400;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        t = Math.min(elapsed / duration, 1);
        actorMesh.rotation.z = lerp(startRot, endRot, t);
        actorMesh.scale.lerpVectors(startScale, endScale, t);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          // revert
          t = 0;
          const revertStartTime = Date.now();
          const revertAnimate = () => {
            const revertElapsed = Date.now() - revertStartTime;
            const revertT = Math.min(revertElapsed / duration, 1);
            actorMesh.rotation.z = lerp(endRot, startRot, revertT);
            actorMesh.scale.lerpVectors(endScale, startScale, revertT);
            if (revertT < 1) {
              requestAnimationFrame(revertAnimate);
            } else {
              resolve();
            }
          };
          revertAnimate();
        }
      };
      animate();
      playSound("defend");
    });
  };

  const animateRest = (actorMesh: THREE.Mesh) => {
    return new Promise<void>(resolve => {
      const startScale = actorMesh.scale.clone();
      const endScale = startScale.clone().multiplyScalar(0.85);
      let t = 0;
      const duration = 500;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        t = Math.min(elapsed / duration, 1);
        actorMesh.scale.lerpVectors(startScale, endScale, t);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          // revert
          t = 0;
          const revertStartTime = Date.now();
          const revertAnimate = () => {
            const revertElapsed = Date.now() - revertStartTime;
            const revertT = Math.min(revertElapsed / duration, 1);
            actorMesh.scale.lerpVectors(endScale, startScale, revertT);
            if (revertT < 1) {
              requestAnimationFrame(revertAnimate);
            } else {
              resolve();
            }
          };
          revertAnimate();
        }
      };
      animate();
      playSound("rest");
    });
  };

  const animateAbility = (actorMesh: THREE.Mesh) => {
    return new Promise<void>(resolve => {
      const startScale = actorMesh.scale.clone();
      const pulseScale = startScale.clone().multiplyScalar(1.2);
      const material = actorMesh.material as THREE.MeshStandardMaterial;
      const startColor = material.color.clone();
      const flashColor = new THREE.Color(0xffff00);
      let t = 0;
      const duration = 300;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        t = Math.min(elapsed / duration, 1);
        const scaleT = Math.sin(t * Math.PI);
        actorMesh.scale.lerpVectors(startScale, pulseScale, scaleT);
        material.color.lerpColors(startColor, flashColor, t);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          material.color.copy(startColor);
          actorMesh.scale.copy(startScale);
          resolve();
        }
      };
      animate();
      playSound("ability");
    });
  };

  const animateAction = (action: RoundAction) => {
    const actorMesh = action.actorId === session?.userId ? playerMeshRef.current : opponentMeshRef.current;
    const targetMesh = action.targetId === session?.userId ? playerMeshRef.current : opponentMeshRef.current;
    if (!actorMesh) return Promise.resolve();
    switch (action.action) {
      case "Attack":
        return animateAttack(actorMesh, targetMesh || actorMesh, action.result);
      case "Defend":
        return animateDefend(actorMesh);
      case "Rest":
        return animateRest(actorMesh);
      case "Ability":
        return animateAbility(actorMesh);
      default:
        return Promise.resolve();
    }
  };

  const processSequence = useCallback(
    async (sequence: RoundSequence) => {
      setAnimating(true);
      for (const action of sequence) {
        await animateAction(action);
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      setAnimating(false);
    },
    [animateAction]
  );

  // Detect new sequence: read from meta.roundSequence (primary), fallback to meta.roundActions for backward compatibility
  // The sequence uses the shared RoundAction type for strong typing
  useEffect(() => {
    const sequence = (meta.roundSequence as RoundSequence | undefined) || [];
    setCurrentSequence(sequence);
    if (!animating) {
      processSequence(sequence);
    }
  }, [animating, meta.roundSequence, processSequence]);

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
        <mesh castShadow position={[-2, 0, 0]} ref={playerMeshRef} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
          <boxGeometry />
          <meshStandardMaterial color="green" />
        </mesh>
        <mesh castShadow position={[2, 0, 0]} ref={opponentMeshRef} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
          <boxGeometry />
          <meshStandardMaterial color="red" />
        </mesh>
        <OrbitControls maxDistance={6} maxPolarAngle={Math.PI / 2} minDistance={4} minPolarAngle={0.2} />
      </Canvas>
    ),
    []
  );

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
            <Badge className={opponentLocked ? "bg-green-600 text-white" : "bg-yellow-500 text-black"}>
              <div className="text-sm">{opponentLocked ? "Opponent ready" : "Opponent undecided"}</div>
              {opponentLocked && <BadgeCheckIcon />}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>{ActionSelector}</CardContent>
      </Card>
    ),
    [roundNumber, opponentLocked, ActionSelector]
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
