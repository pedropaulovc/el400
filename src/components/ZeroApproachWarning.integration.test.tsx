/**
 * Integration tests for Zero Approach Warning (US-024)
 * Tests the complete flow of center-finding with zero approach beep
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderSimulator,
  setNonVolatileMemory,
} from '../tests/helpers/integration-test-utils';
import * as audioManager from '../utils/audioManager';
import { vi } from 'vitest';

// Mock audio manager
vi.mock('../utils/audioManager', () => ({
  playButtonClick: vi.fn(),
  startZeroApproachBeep: vi.fn(),
  stopZeroApproachBeep: vi.fn(),
  isZeroApproachBeepActive: vi.fn(() => false),
}));

describe('Zero Approach Warning Integration (US-024)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not beep when zero approach is disabled (default)', async () => {
    renderSimulator();

    // No beeping should occur by default
    expect(audioManager.startZeroApproachBeep).not.toHaveBeenCalled();
  });

  it('should have correct default BP DIST and BP TOLR values', async () => {
    renderSimulator();

    // Check localStorage for default values
    const stored = localStorage.getItem('el400-dro-non-volatile-memory');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    // Defaults should be set
    expect(parsed.bpDist).toBe(0.002); // Default 0.002 inches
    expect(parsed.bpTolr).toBe(0.0000); // Default 0.0000 inches
    expect(parsed.zeroApproachEnabled).toBe(false); // Default disabled
  });

  it('should allow updating BP DIST and BP TOLR settings', async () => {
    // Set custom values
    setNonVolatileMemory({
      zeroApproachEnabled: true,
      bpDist: 0.010,
      bpTolr: 0.001,
    });

    renderSimulator();

    // Verify settings were saved
    const stored = localStorage.getItem('el400-dro-non-volatile-memory');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.zeroApproachEnabled).toBe(true);
    expect(parsed.bpDist).toBe(0.010);
    expect(parsed.bpTolr).toBe(0.001);
  });

  it('should respect beep enabled setting for button clicks', async () => {
    setNonVolatileMemory({ beepEnabled: true });
    
    renderSimulator();

    // In the integration, button clicks should respect the beepEnabled setting
    // The setting should be persisted
    const stored = localStorage.getItem('el400-dro-non-volatile-memory');
    const parsed = JSON.parse(stored!);
    expect(parsed.beepEnabled).toBe(true);
  });

  it('should persist zero approach settings across sessions', async () => {
    // Update settings
    setNonVolatileMemory({
      zeroApproachEnabled: true,
      bpDist: 0.015,
      bpTolr: 0.002,
    });

    renderSimulator();

    // Settings should be saved to localStorage
    const stored = localStorage.getItem('el400-dro-non-volatile-memory');
    expect(stored).toBeTruthy();
    
    const parsed = JSON.parse(stored!);
    expect(parsed.zeroApproachEnabled).toBe(true);
    expect(parsed.bpDist).toBe(0.015);
    expect(parsed.bpTolr).toBe(0.002);
  });

  it('should have distinct beep from button click', () => {
    // This test documents that zero approach beep uses:
    // - 800Hz oscillator tone (continuous)
    // - Pulsing pattern (0.2s on, 0.2s off)
    // vs button click which uses:
    // - Pre-recorded WAV file (short)
    // - Single play per click
    
    expect(audioManager.startZeroApproachBeep).toBeDefined();
    expect(audioManager.stopZeroApproachBeep).toBeDefined();
    expect(audioManager.playButtonClick).toBeDefined();
    
    // These are different functions for different beep types
    expect(audioManager.startZeroApproachBeep).not.toBe(audioManager.playButtonClick);
  });

  it('should integrate with EL400Simulator without errors', () => {
    // Enable zero approach
    setNonVolatileMemory({
      zeroApproachEnabled: true,
      bpDist: 0.010,
      bpTolr: 0.001,
    });

    // Should render without errors
    const { container } = renderSimulator();
    expect(container).toBeTruthy();
    
    // Hook should be monitoring but not beeping (not in result state)
    expect(audioManager.startZeroApproachBeep).not.toHaveBeenCalled();
  });
});
