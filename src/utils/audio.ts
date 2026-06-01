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
