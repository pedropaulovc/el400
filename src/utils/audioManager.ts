/**
 * Audio Manager for DRO sound effects
 * 
 * Handles two types of audio:
 * 1. Button click sound - short beep on button press
 * 2. Zero approach warning - continuous beep when near zero
 */

// Shared audio context for all beeps
let audioContext: AudioContext | null = null;
let buttonAudioBuffer: AudioBuffer | null = null;
let initPromise: Promise<void> | null = null;

// Zero approach beep state
let zeroApproachSource: OscillatorNode | null = null;
let zeroApproachGain: GainNode | null = null;
let isZeroApproachBeeping = false;

/**
 * Initialize audio system - loads button click sound
 */
const initAudio = async (): Promise<void> => {
  if (buttonAudioBuffer) return;
  
  audioContext ??= new AudioContext();
  
  try {
    const response = await fetch('/sounds/button-click.wav');
    const arrayBuffer = await response.arrayBuffer();
    buttonAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('Failed to load button click sound');
  }
};

/**
 * Play button click sound (short beep)
 */
export const playButtonClick = async (): Promise<void> => {
  // If not initialized, start initialization and wait for it
  if (!buttonAudioBuffer) {
    initPromise ??= initAudio();
    await initPromise;
  }
  
  if (!audioContext || !buttonAudioBuffer) return;
  
  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5;
  source.buffer = buttonAudioBuffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(0);
};

/**
 * Start continuous zero approach warning beep
 * Uses oscillator for continuous tone distinct from button click
 */
export const startZeroApproachBeep = async (): Promise<void> => {
  if (isZeroApproachBeeping) return;
  
  // Initialize audio context if needed
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  
  // Resume context if suspended
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  // Create oscillator for continuous beep
  // Using 800Hz frequency (distinct from button click)
  zeroApproachSource = audioContext.createOscillator();
  zeroApproachGain = audioContext.createGain();
  
  zeroApproachSource.type = 'sine';
  zeroApproachSource.frequency.value = 800; // 800Hz tone
  zeroApproachGain.gain.value = 0.3; // Lower volume than button click
  
  zeroApproachSource.connect(zeroApproachGain);
  zeroApproachGain.connect(audioContext.destination);
  
  // Create pulsing effect (0.2s on, 0.2s off)
  const now = audioContext.currentTime;
  const pulseInterval = 0.4; // Total cycle time
  const onDuration = 0.2;    // Beep duration
  
  // Schedule fade in and out for pulsing effect
  for (let i = 0; i < 100; i++) { // Schedule 40 seconds worth of pulses
    const startTime = now + (i * pulseInterval);
    zeroApproachGain.gain.setValueAtTime(0, startTime);
    zeroApproachGain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
    zeroApproachGain.gain.setValueAtTime(0.3, startTime + onDuration);
    zeroApproachGain.gain.linearRampToValueAtTime(0, startTime + onDuration + 0.01);
  }
  
  zeroApproachSource.start();
  isZeroApproachBeeping = true;
};

/**
 * Stop zero approach warning beep
 */
export const stopZeroApproachBeep = (): void => {
  if (!isZeroApproachBeeping || !zeroApproachSource) return;
  
  try {
    zeroApproachSource.stop();
    zeroApproachSource.disconnect();
    zeroApproachGain?.disconnect();
  } catch (e) {
    // Ignore errors if already stopped
  }
  
  zeroApproachSource = null;
  zeroApproachGain = null;
  isZeroApproachBeeping = false;
};

/**
 * Check if zero approach beep is currently playing
 */
export const isZeroApproachBeepActive = (): boolean => {
  return isZeroApproachBeeping;
};
