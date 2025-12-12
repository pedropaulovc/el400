import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock the Audio API
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  currentTime = 0;
  volume = 0.5;
}

global.Audio = MockAudio as unknown as typeof Audio;

// Mock AudioContext for Web Audio API
class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
}

class MockGainNode {
  gain = { value: 1 };
  connect = vi.fn().mockReturnThis();
}

class MockAudioContext {
  state = 'running';
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  createGain = vi.fn(() => new MockGainNode());
  decodeAudioData = vi.fn().mockResolvedValue({} as AudioBuffer);
  resume = vi.fn().mockResolvedValue(undefined);
  destination = {};
}

global.AudioContext = MockAudioContext as unknown as typeof AudioContext;

// Mock fetch for audio files
const originalFetch = global.fetch;
global.fetch = vi.fn((url) => {
  if (typeof url === 'string' && url.includes('.wav')) {
    return Promise.resolve({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    } as Response);
  }
  return originalFetch(url);
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
});
