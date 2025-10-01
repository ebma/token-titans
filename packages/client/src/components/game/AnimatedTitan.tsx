import { forwardRef, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

export interface TitanHandle {
  lungeToPoint(point: THREE.Vector3, durationMs?: number): Promise<void>;
  defend(durationMs?: number): Promise<void>;
  rest(durationMs?: number): Promise<void>;
  abilityPulse(durationMs?: number): Promise<void>;
  setDead(): void;
  getPosition(): THREE.Vector3;
}

interface AnimatedTitanProps {
  color: string;
  initialPosition: [number, number, number];
}

export const AnimatedTitan = forwardRef<TitanHandle, AnimatedTitanProps>(({ color, initialPosition }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useImperativeHandle(ref, () => ({
    abilityPulse: (durationMs: number = 300) => {
      return new Promise<void>(resolve => {
        if (!meshRef.current) return resolve();
        const startScale = meshRef.current.scale.clone();
        const pulseScale = startScale.clone().multiplyScalar(1.2);
        const material = meshRef.current.material as THREE.MeshStandardMaterial;
        const startColor = material.color.clone();
        const flashColor = new THREE.Color(0xffff00);
        let t = 0;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          t = Math.min(elapsed / durationMs, 1);
          const scaleT = Math.sin(t * Math.PI);
          meshRef.current!.scale.lerpVectors(startScale, pulseScale, scaleT);
          material.color.lerpColors(startColor, flashColor, t);
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            material.color.copy(startColor);
            meshRef.current!.scale.copy(startScale);
            resolve();
          }
        };
        animate();
        // Sound placeholder: add sound file to /public/sounds/ability.mp3
      });
    },

    defend: (durationMs: number = 400) => {
      return new Promise<void>(resolve => {
        if (!meshRef.current) return resolve();
        const startRot = meshRef.current.rotation.z;
        const startScale = meshRef.current.scale.clone();
        const endRot = startRot + Math.PI / 4;
        const endScale = startScale.clone().multiplyScalar(1.15);
        let t = 0;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          t = Math.min(elapsed / durationMs, 1);
          meshRef.current!.rotation.z = startRot + (endRot - startRot) * t;
          meshRef.current!.scale.lerpVectors(startScale, endScale, t);
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            // revert
            t = 0;
            const revertStartTime = Date.now();
            const revertAnimate = () => {
              const revertElapsed = Date.now() - revertStartTime;
              const revertT = Math.min(revertElapsed / durationMs, 1);
              meshRef.current!.rotation.z = endRot + (startRot - endRot) * revertT;
              meshRef.current!.scale.lerpVectors(endScale, startScale, revertT);
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
        // Sound placeholder: add sound file to /public/sounds/defend.mp3
      });
    },

    getPosition: () => meshRef.current?.position.clone() || new THREE.Vector3(),
    lungeToPoint: (point: THREE.Vector3, durationMs: number = 250) => {
      return new Promise<void>(resolve => {
        if (!meshRef.current) return resolve();
        const startPos = meshRef.current.position.clone();
        let t = 0;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          t = Math.min(elapsed / durationMs, 1);
          meshRef.current!.position.lerpVectors(startPos, point, t);
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            // back
            t = 0;
            const backStartTime = Date.now();
            const backAnimate = () => {
              const backElapsed = Date.now() - backStartTime;
              const backT = Math.min(backElapsed / durationMs, 1);
              meshRef.current!.position.lerpVectors(point, startPos, backT);
              if (backT < 1) {
                requestAnimationFrame(backAnimate);
              } else {
                resolve();
              }
            };
            backAnimate();
          }
        };
        animate();
        // Sound placeholder: add sound file to /public/sounds/attack.mp3
      });
    },

    rest: (durationMs: number = 500) => {
      return new Promise<void>(resolve => {
        if (!meshRef.current) return resolve();
        const startScale = meshRef.current.scale.clone();
        const endScale = startScale.clone().multiplyScalar(0.85);
        let t = 0;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          t = Math.min(elapsed / durationMs, 1);
          meshRef.current!.scale.lerpVectors(startScale, endScale, t);
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            // revert
            t = 0;
            const revertStartTime = Date.now();
            const revertAnimate = () => {
              const revertElapsed = Date.now() - revertStartTime;
              const revertT = Math.min(revertElapsed / durationMs, 1);
              meshRef.current!.scale.lerpVectors(endScale, startScale, revertT);
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
        // Sound placeholder: add sound file to /public/sounds/rest.mp3
      });
    },

    setDead: () => {
      if (meshRef.current) {
        meshRef.current.scale.set(0.1, 0.1, 0.1);
      }
    }
  }));

  return (
    <mesh castShadow position={initialPosition} ref={meshRef} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
    </mesh>
  );
});
