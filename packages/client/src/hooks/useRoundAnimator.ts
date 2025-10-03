import type { RoundSequence } from "@shared/index";
import { useEffect } from "react";
import type { TitanHandle } from "@/components/game/AnimatedTitan";
import { useSoundManager } from "./useSoundManager";

interface UseRoundAnimatorParams {
  playerId?: string;
  opponentId?: string;
  sequence: RoundSequence;
  playerRef: React.RefObject<TitanHandle | null>;
  opponentRef: React.RefObject<TitanHandle | null>;
  onAnimating?: (animating: boolean) => void;
}

export function useRoundAnimator({ playerId, sequence, playerRef, opponentRef, onAnimating }: UseRoundAnimatorParams) {
  const { playSound } = useSoundManager();

  useEffect(() => {
    const runSequence = async () => {
      onAnimating?.(true);
      const holdActions: { handle: TitanHandle; action: "Defend" | "Rest" }[] = [];
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

              playSound("attack");
              await actorRef.current.lungeToPoint(lungePos);
              if (action.result === "Death") {
                targetRef.current.setDead();
              }
            }
            break;
          case "Defend":
            // Action->Animation mapping: Defend triggers start of rotation and scale animation
            playSound("defend");
            await actorRef.current.defendStart();
            holdActions.push({ action: "Defend", handle: actorRef.current });
            break;
          case "Rest":
            // Action->Animation mapping: Rest triggers start of scale down animation
            playSound("rest");
            await actorRef.current.restStart();
            holdActions.push({ action: "Rest", handle: actorRef.current });
            break;
          case "Ability":
            // Action->Animation mapping: Ability triggers pulse and color flash animation
            playSound("ability");
            await actorRef.current.abilityPulse();
            break;
          default:
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      // Revert hold actions
      for (const { handle, action } of holdActions) {
        if (action === "Defend") {
          await handle.defendEnd();
        } else if (action === "Rest") {
          await handle.restEnd();
        }
      }
      onAnimating?.(false);
    };

    if (sequence.length > 0 && playerRef.current && opponentRef.current) {
      runSequence();
    }
  }, [sequence, playerId, playerRef, opponentRef, onAnimating, playSound]);
}
