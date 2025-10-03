import { forwardRef, useImperativeHandle, useRef } from "react";
import * as THREE from "three";

export interface TitanHandle {
  lungeToPoint(point: THREE.Vector3, durationMs?: number): Promise<void>;
  defend(durationMs?: number): Promise<void>;
  defendStart(durationMs?: number): Promise<void>;
  defendEnd(durationMs?: number): Promise<void>;
  rest(durationMs?: number): Promise<void>;
  restStart(durationMs?: number): Promise<void>;
  restEnd(durationMs?: number): Promise<void>;
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

  const defendStart = (durationMs = 400) => {
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
          resolve();
        }
      };
      animate();
    });
  };

  const defendEnd = (durationMs = 400) => {
    return new Promise<void>(resolve => {
      if (!meshRef.current) return resolve();
      const startRot = meshRef.current.rotation.z;
      const startScale = meshRef.current.scale.clone();
      const endRot = 0; // neutral rotation
      const endScale = new THREE.Vector3(1, 1, 1); // neutral scale
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
          resolve();
        }
      };
      animate();
    });
  };

  const restStart = (durationMs = 500) => {
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
          resolve();
        }
      };
      animate();
    });
  };

  const restEnd = (durationMs = 500) => {
    return new Promise<void>(resolve => {
      if (!meshRef.current) return resolve();
      const startScale = meshRef.current.scale.clone();
      const endScale = new THREE.Vector3(1, 1, 1); // neutral scale
      let t = 0;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        t = Math.min(elapsed / durationMs, 1);
        meshRef.current!.scale.lerpVectors(startScale, endScale, t);
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  };

  useImperativeHandle(ref, () => ({
    abilityPulse: (durationMs = 300) => {
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
      });
    },

    defend: async (durationMs = 400) => {
      await defendStart(durationMs);
      await defendEnd(durationMs);
    },
    defendEnd,

    defendStart,

    getPosition: () => meshRef.current?.position.clone() || new THREE.Vector3(),
    lungeToPoint: (point: THREE.Vector3, durationMs = 200) => {
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      const easeIn = (t: number) => t * t * t;

      return new Promise<void>(resolve => {
        if (!meshRef.current) return resolve();
        const startPos = meshRef.current.position.clone();
        let t = 0;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          t = Math.min(elapsed / durationMs, 1);
          const easedT = easeOutBack(t);
          meshRef.current!.position.lerpVectors(startPos, point, easedT);
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            // back
            t = 0;
            const backStartTime = Date.now();
            const backAnimate = () => {
              const backElapsed = Date.now() - backStartTime;
              const backT = Math.min(backElapsed / durationMs, 1);
              const easedBackT = easeIn(backT);
              meshRef.current!.position.lerpVectors(point, startPos, easedBackT);
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
      });
    },

    rest: async (durationMs = 500) => {
      await restStart(durationMs);
      await restEnd(durationMs);
    },
    restEnd,
    restStart,

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
