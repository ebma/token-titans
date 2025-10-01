import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { RoundSequence } from "@shared/index";
import { useRef } from "react";
import { useRoundAnimator } from "@/hooks/useRoundAnimator";
import { AnimatedTitan, type TitanHandle } from "./AnimatedTitan";

interface GameCanvasProps {
  playerId?: string;
  opponentId?: string;
  sequence: RoundSequence;
  className?: string;
}

export function GameCanvas({ playerId, opponentId, sequence, className }: GameCanvasProps) {
  const playerRef = useRef<TitanHandle>(null);
  const opponentRef = useRef<TitanHandle>(null);

  useRoundAnimator({
    opponentId,
    opponentRef,
    playerId,
    playerRef,
    sequence
  });

  return (
    <Canvas
      camera={{ fov: 50, position: [0, 5, 8] }}
      className={className}
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
        <meshStandardMaterial color="#3cb043" roughness={0.8} />
      </mesh>
      <AnimatedTitan color="green" initialPosition={[-2, 0, 0]} ref={playerRef} />
      <AnimatedTitan color="red" initialPosition={[2, 0, 0]} ref={opponentRef} />
      <OrbitControls maxDistance={6} maxPolarAngle={Math.PI / 2} minDistance={4} minPolarAngle={0.2} />
    </Canvas>
  );
}
