import { Box, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { GameAction, PlayerActionEvent } from "@shared/index";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useGameStore } from "@/hooks/useGameStore";
import { useTitanStore } from "@/hooks/useTitanStore";

export function GameView({ ws }: { ws: WebSocket | null }) {
  const game = useGameStore(state => state.game);
  const session = useAuthStore(state => state.session);
  const titans = useTitanStore(state => state.titans);

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

  return (
    <div className="flex h-full w-full flex-col">
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
          <OrbitControls maxPolarAngle={Math.PI / 2} minPolarAngle={0.2} />
        </Canvas>
      </div>
      <div className="flex justify-center gap-2 p-4">
        <Button onClick={() => handleAction({ payload: { targetId: "player2" }, type: "Attack" })}>Attack</Button>
        <Button onClick={() => handleAction({ type: "Defend" })}>Defend</Button>
        <Button
          onClick={() =>
            handleAction({
              payload: { targetId: "player2" },
              type: "SpecialAbility"
            })
          }
        >
          Special Ability
        </Button>
        <Button onClick={() => handleAction({ type: "Rest" })}>Rest</Button>
      </div>

      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stat</TableHead>
              <TableHead>{playerTitan?.name ?? "You"}</TableHead>
              <TableHead>{opponentTitan?.name ?? "Opponent"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statsOrder.map(stat => (
              <TableRow key={stat as string}>
                <TableHead>{stat}</TableHead>
                <TableCell>{playerTitan ? playerTitan.stats[stat] : "-"}</TableCell>
                <TableCell>{opponentTitan ? opponentTitan.stats[stat] : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
