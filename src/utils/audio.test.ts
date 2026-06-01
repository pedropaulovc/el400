import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';
import type { useSettingsStore as SettingsStore } from '../stores/settingsStore';

/**
 * Unit tests for the keypad-beep gate (US-025).
 *
 * `playClickSound` is the audio feedback fired on every key/button press
 * (DROButton + useKeyboardShortcuts). US-025 silences it when the operator
 * turns the BEEP setup parameter off (nvMem.beepEnabled === false). The gate is
 * the ONLY behaviour that reads beepEnabled here; it is independent of the
 * zero-approach warning (US-024) and error beeps (AC25.5, AC25.6), which use
 * their own audio paths and never consult this flag.
 *
 * We assert the gate by counting how many buffer-source nodes start playing.
 * The audio module memoises its AudioContext, so each test resets the module
 * registry and installs a tracking AudioContext that records start() calls.
 * Because vi.resetModules() gives audio.ts a fresh settingsStore instance, the
 * test reads/writes that SAME instance (returned alongside playClickSound) — not
 * the top-level import, which would belong to a stale module graph.
 *
 * @see project/user-stories/06-configuration/US-025-keypad-beep.md
 */
describe('playClickSound — keypad beep gate (US-025)', () => {
  let startCount: number;
  let originalAudioContext: typeof AudioContext;

  /** Tracking AudioContext: every started buffer source bumps startCount. */
  class TrackingAudioContext {
    state = 'running';
    destination = {};
    createBufferSource() {
      return {
        buffer: null,
        connect: () => ({}),
        start: () => {
          startCount += 1;
        },
        stop: () => undefined,
      };
    }
    createGain() {
      return { gain: { value: 1 }, connect: () => ({}) };
    }
    decodeAudioData() {
      return Promise.resolve({});
    }
    resume() {
      return Promise.resolve();
    }
  }

  /**
   * Reset the module registry, install the tracking AudioContext, then import
   * BOTH audio.ts and settingsStore.ts from the SAME fresh graph so the store
   * the test mutates is the exact one the gate reads.
   */
  async function loadAudio(): Promise<{
    playClickSound: () => Promise<void>;
    store: typeof SettingsStore;
  }> {
    vi.resetModules();
    global.AudioContext = TrackingAudioContext as unknown as typeof AudioContext;
    const audioMod = await import('./audio');
    const storeMod = await import('../stores/settingsStore');
    return { playClickSound: audioMod.playClickSound, store: storeMod.useSettingsStore };
  }

  beforeEach(() => {
    startCount = 0;
    originalAudioContext = global.AudioContext;
  });

  // Restore the real (mocked) AudioContext and the module registry so this
  // file's vi.resetModules() + global swap never leaks into sibling test files
  // that share a worker (which surfaced as setup-nav flakes under coverage).
  afterEach(() => {
    global.AudioContext = originalAudioContext;
    vi.resetModules();
  });

  it('plays a click when beep is enabled (default ON) — AC25.4', async () => {
    const { playClickSound, store } = await loadAudio();
    expect(store.getState().nvMem.beepEnabled).toBe(true);

    await playClickSound();

    expect(startCount).toBe(1);
  });

  it('is silent when beep is disabled — AC25.5 (keypad half)', async () => {
    const { playClickSound, store } = await loadAudio();
    store.setState({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, beepEnabled: false } });

    await playClickSound();

    expect(startCount).toBe(0);
  });

  it('follows the live setting across toggles', async () => {
    const { playClickSound, store } = await loadAudio();

    store.setState({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, beepEnabled: false } });
    await playClickSound();
    expect(startCount).toBe(0);

    store.setState({ nvMem: { ...DEFAULT_NON_VOLATILE_MEMORY, beepEnabled: true } });
    await playClickSound();
    expect(startCount).toBe(1);
  });
});
