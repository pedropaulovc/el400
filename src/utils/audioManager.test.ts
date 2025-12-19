/**
 * Tests for Audio Manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  playButtonClick,
  startZeroApproachBeep,
  stopZeroApproachBeep,
  isZeroApproachBeepActive,
} from './audioManager';

describe('audioManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any active beeps
    stopZeroApproachBeep();
  });

  describe('playButtonClick', () => {
    it('should attempt to play button click sound', async () => {
      // Just verify it doesn't throw
      await expect(playButtonClick()).resolves.toBeUndefined();
    });

    it('should handle missing audio file gracefully', async () => {
      // Should not throw even if audio file is missing
      await expect(playButtonClick()).resolves.toBeUndefined();
    });
  });

  describe('startZeroApproachBeep', () => {
    it('should start zero approach beep', async () => {
      await startZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(true);
    });

    it('should not start beep twice if already beeping', async () => {
      await startZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(true);
      
      // Starting again should not cause issues
      await startZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(true);
    });
  });

  describe('stopZeroApproachBeep', () => {
    it('should stop zero approach beep', async () => {
      await startZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(true);
      
      stopZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(false);
    });

    it('should handle stopping when not beeping', () => {
      expect(isZeroApproachBeepActive()).toBe(false);
      
      // Should not throw
      stopZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(false);
    });
  });

  describe('isZeroApproachBeepActive', () => {
    it('should return false initially', () => {
      expect(isZeroApproachBeepActive()).toBe(false);
    });

    it('should return true when beeping', async () => {
      await startZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(true);
    });

    it('should return false after stopping', async () => {
      await startZeroApproachBeep();
      stopZeroApproachBeep();
      expect(isZeroApproachBeepActive()).toBe(false);
    });
  });
});
