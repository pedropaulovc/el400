// Shared button-click audio playback.
//
// Extracted from DROButton so both pointer clicks and keyboard shortcuts
// (US-038) play the same feedback sound through a single AudioContext.

let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let initPromise: Promise<void> | null = null;

const initAudio = async (): Promise<void> => {
  if (audioBuffer) return;

  audioContext ??= new AudioContext();

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}sounds/button-click.wav`);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('Failed to load button click sound');
  }
};

export const playClickSound = async (): Promise<void> => {
  // If not initialized, start initialization and wait for it
  if (!audioBuffer) {
    initPromise ??= initAudio();
    await initPromise;
  }

  if (!audioContext || !audioBuffer) return;

  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5;
  source.buffer = audioBuffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(0);
};

/**
 * Play the Near-Zero Warning beep (US-024, AC24.8). Synthesised as a short
 * sine tone so it is DISTINCT from the sampled key-press click, signalling the
 * operator that an axis is within BP DIST of the target. Called repeatedly by
 * the warning hook while the approach condition holds, producing the manual's
 * "continuous beeping near zero" (AC24.3) without overlapping notes.
 */
export const playZeroApproachBeep = async (): Promise<void> => {
  audioContext ??= new AudioContext();

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  // A higher, pure tone clearly differentiated from the key click (AC24.8).
  oscillator.type = 'sine';
  oscillator.frequency.value = 1760; // A6
  // Short envelope to avoid clicks at start/stop.
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.12);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.13);
};
