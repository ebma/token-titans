// Synthesized SFX using Tone.js for game actions.
// Call Tone.start() once on user gesture (e.g., in App.tsx) to enable audio.
// Each function plays a short, reactive sound for the corresponding action.

import * as Tone from "tone";

// Attack: punchy membrane sound (like a hit)
export const playAttack = async () => {
  await Tone.start(); // Ensure audio context is started
  const synth = new Tone.MembraneSynth({
    envelope: { attack: 0.001, decay: 0.1, release: 0.1, sustain: 0 },
    octaves: 1,
    oscillator: { type: "sine" },
    pitchDecay: 0.05
  }).toDestination();
  synth.triggerAttackRelease("C3", "8n");
};

// Defend: longer, defensive tone (like a shield)
export const playDefend = async () => {
  await Tone.start();
  const synth = new Tone.Synth({
    envelope: { attack: 0.1, decay: 0.2, release: 0.4, sustain: 0.3 },
    oscillator: { type: "triangle" }
  }).toDestination();
  synth.triggerAttackRelease("G2", "4n");
};

// Rest: soft, low restorative tone
export const playRest = async () => {
  await Tone.start();
  const synth = new Tone.Synth({
    envelope: { attack: 0.2, decay: 0.3, release: 0.5, sustain: 0.2 },
    oscillator: { type: "sine" }
  }).toDestination();
  synth.triggerAttackRelease("A1", "2n");
};

// Ability: flashy, high-pitched burst
export const playAbility = async () => {
  await Tone.start();
  const synth = new Tone.Synth({
    envelope: { attack: 0.01, decay: 0.1, release: 0.2, sustain: 0 },
    oscillator: { type: "sawtooth" }
  }).toDestination();
  synth.triggerAttackRelease("C5", "16n");
};
