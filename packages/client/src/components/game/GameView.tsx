import { Box, OrbitControls, Plane } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { GameAction, PlayerActionEvent } from "@shared/index";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useGameStore } from "@/hooks/useGameStore";

export function GameView({ ws }: { ws: WebSocket | null }) {
  const game = useGameStore(state => state.game);
  const session = useAuthStore(state => state.session);

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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-grow">
        <Canvas>
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
    </div>
  );
}
