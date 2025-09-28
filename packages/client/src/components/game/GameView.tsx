import { Box, OrbitControls, Plane } from "@react-three/drei";
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
        <Canvas fallback={<div>Sorry no WebGL supported!</div>} style={{ height: 400 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 10, 5]} />
          <Plane args={[10, 10]} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial attach="material" color="lightblue" />
          </Plane>
          <Box position={[-2, 0, 0]} />
          <Box position={[2, 0, 0]} />
          <OrbitControls />
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
                <TableCell>{playerTitan ? (playerTitan.stats as any)[stat] : "-"}</TableCell>
                <TableCell>{opponentTitan ? (opponentTitan.stats as any)[stat] : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
