import { useCallback, useEffect } from "react";
import * as Tone from "tone";
import { playAbility, playAttack, playDefend, playRest } from "@/lib/sfx";

type SoundType = "attack" | "defend" | "rest" | "ability";

// Sound manager using Tone.js for synthesized playback.
// No files needed; sounds are generated live.
export function useSoundManager() {
  // Start Tone.js audio context on mount (will succeed on user gesture)
  useEffect(() => {
    Tone.start().catch(() => {
      // Audio context not ready yet; will be started on first sound play
    });
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    try {
      switch (type) {
        case "attack":
          await playAttack();
          break;
        case "defend":
          await playDefend();
          break;
        case "rest":
          await playRest();
          break;
        case "ability":
          await playAbility();
          break;
        default:
          break;
      }
    } catch (error) {
      console.warn("Sound playback failed:", error);
    }
  }, []);

  return { playSound };
}
