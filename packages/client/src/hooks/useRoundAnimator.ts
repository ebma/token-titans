import type { RoundSequence } from "@shared/index";
import { useEffect } from "react";
import type { TitanHandle } from "@/components/game/AnimatedTitan";

interface UseRoundAnimatorParams {
  playerId?: string;
  opponentId?: string;
  sequence: RoundSequence;
  playerRef: React.RefObject<TitanHandle | null>;
  opponentRef: React.RefObject<TitanHandle | null>;
  onAnimating?: (animating: boolean) => void;
}

export function useRoundAnimator({
  playerId,
  opponentId,
  sequence,
  playerRef,
  opponentRef,
  onAnimating
}: UseRoundAnimatorParams) {
  // Sound helper
  const playSound = (type: "attack" | "defend" | "rest" | "ability") => {
    // Add sound files to /public/sounds/attack.mp3, defend.mp3, rest.mp3, ability.mp3
    const audio = new Audio(`/public/sounds/${type}.mp3`);
    audio.play().catch(() => {}); // Ignore errors if sound not found
  };

  useEffect(() => {
    const runSequence = async () => {
      onAnimating?.(true);
      for (const action of sequence) {
        const actorRef = action.actorId === playerId ? playerRef : opponentRef;
        const targetRef = action.targetId === playerId ? playerRef : opponentRef;
        if (!actorRef.current) continue;
        switch (action.action) {
          case "Attack":
            // Action->Animation mapping: Attack triggers lunge animation towards target
            if (targetRef.current) {
              const actorPos = actorRef.current.getPosition();
              const targetPos = targetRef.current.getPosition();
              const direction = targetPos.clone().sub(actorPos).normalize();
              const lungePos = actorPos.clone().add(direction.multiplyScalar(1.5));
              await actorRef.current.lungeToPoint(lungePos);
              if (action.result === "Death") {
                targetRef.current.setDead();
              }
            }
            playSound("attack");
            break;
          case "Defend":
            // Action->Animation mapping: Defend triggers rotation and scale animation
            await actorRef.current.defend();
            playSound("defend");
            break;
          case "Rest":
            // Action->Animation mapping: Rest triggers scale down animation
            await actorRef.current.rest();
            playSound("rest");
            break;
          case "Ability":
            // Action->Animation mapping: Ability triggers pulse and color flash animation
            await actorRef.current.abilityPulse();
            playSound("ability");
            break;
          default:
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      onAnimating?.(false);
    };

    if (sequence.length > 0) {
      runSequence();
    }
  }, [sequence, playerId, opponentId, playerRef, opponentRef, onAnimating]);
}
