import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock the Audio API
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  currentTime = 0;
  volume = 0.5;
}

global.Audio = MockAudio as unknown as typeof Audio;

// Cleanup after each test
afterEach(() => {
  cleanup();
});
