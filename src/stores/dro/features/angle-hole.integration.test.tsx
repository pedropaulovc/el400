import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  enterValue,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';
import { ANGLE_HOLE_INTRO_DURATION_MS } from './angle-hole';

describe('Angle Hole (Linear Hole Pattern) Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    vi.useRealTimers();
  });

  async function advancePastIntro() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANGLE_HOLE_INTRO_DURATION_MS + 10);
    });
  }

  async function enterAngleHoleMode(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-angle-hole'));
    await advancePastIntro();
  }

  describe('Entering Angle Hole Mode', () => {
    it('enters angle hole mode when button pressed in ABS mode', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      expect(useDROStore.getState().vMem.mode).toBe('abs');

      await user.click(screen.getByTestId('btn-angle-hole'));

      // intro state shows "AnGhoLE" prompt
      expect(useDROStore.getState().stateName).toBe('angle-hole-intro');
      expect(getAxisDisplayPureTextValue('X')).toBe('AnGhoLE');
      expect(getAxisDisplayPureNumberValue('Y')).toBe(0);

      await advancePastIntro();

      // advances straight to start-X entry (no CIRCLE/ARC submenu)
      expect(useDROStore.getState().stateName).toBe('angle-hole-start-x');
      expect(getAxisDisplayPureNumberValue('X')).toBe(0);
      expect(getAxisDisplayPureTextValue('Y')).toBe('EntCnt0');
    });

    it('does not enter angle hole mode when in INC mode', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      await user.click(screen.getByTestId('btn-angle-hole'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });

  describe('Parameter Entry', () => {
    it('completes full parameter entry in mm mode and computes hole 1 distance', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      // Toggle to mm so stored values equal displayed distance
      await user.click(screen.getByTestId('btn-toggle-unit'));

      await enterAngleHoleMode(user);
      expect(useDROStore.getState().stateName).toBe('angle-hole-start-x');

      // Start X = 10
      await enterValue(user, '10');
      expect(useDROStore.getState().stateName).toBe('angle-hole-start-y');
      expect(getAxisDisplayPureTextValue('X')).toBe('EntCnt1');

      // Start Y = 5
      await enterValue(user, '5');
      expect(useDROStore.getState().stateName).toBe('angle-hole-pitch');
      expect(getAxisDisplayPureTextValue('X')).toBe('P itCh');

      // Pitch = 20
      await enterValue(user, '20');
      expect(useDROStore.getState().stateName).toBe('angle-hole-angle');
      expect(getAxisDisplayPureTextValue('X')).toBe('AnGLE');

      // Angle = 30
      await enterValue(user, '30');
      expect(useDROStore.getState().stateName).toBe('angle-hole-holes');
      expect(getAxisDisplayPureTextValue('X')).toBe('hoLES');

      // Holes = 6
      await enterValue(user, '6');
      expect(useDROStore.getState().stateName).toBe('angle-hole-navigate');
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      const stateData = useDROStore.getState().stateData;
      expect(stateData.stateDataType).toBe('angle-hole');
      if (stateData.stateDataType === 'angle-hole') {
        expect(stateData.startX).toBeCloseTo(10, 4);
        expect(stateData.startY).toBeCloseTo(5, 4);
        expect(stateData.pitch).toBeCloseTo(20, 4);
        expect(stateData.lineAngle).toBe(30);
        expect(stateData.holeCount).toBe(6);
        expect(stateData.currentHole).toBe(1);
      }

      // Hole 1 = start point (10, 5); distance from origin = (10, 5)
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 2);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(5, 2);
    });

    it('rejects zero pitch (unhappy path)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterAngleHoleMode(user);
      await enterValue(user, '1'); // start X
      await enterValue(user, '1'); // start Y
      await enterValue(user, '0'); // pitch = 0 -> rejected

      expect(useDROStore.getState().stateName).toBe('angle-hole-pitch');
    });

    it('rejects hole count less than 2 (unhappy path)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterAngleHoleMode(user);
      await enterValue(user, '0'); // start X
      await enterValue(user, '0'); // start Y
      await enterValue(user, '1'); // pitch
      await enterValue(user, '0'); // angle
      await enterValue(user, '1'); // 1 hole -> rejected

      expect(useDROStore.getState().stateName).toBe('angle-hole-holes');
    });
  });

  describe('Hole Navigation', () => {
    async function setupNavigateState(user: ReturnType<typeof userEvent.setup>) {
      await enterAngleHoleMode(user);
      await enterValue(user, '0'); // start X
      await enterValue(user, '0'); // start Y
      await enterValue(user, '1'); // pitch
      await enterValue(user, '0'); // angle
      await enterValue(user, '6'); // 6 holes
    }

    it('navigates next/prev with keys 6 and 4', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      expect(useDROStore.getState().stateName).toBe('angle-hole-navigate');

      await user.click(screen.getByTestId('key-6'));
      let stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'angle-hole') {
        expect(stateData.currentHole).toBe(2);
      }

      await user.click(screen.getByTestId('key-4'));
      stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'angle-hole') {
        expect(stateData.currentHole).toBe(1);
      }
    });

    it('jumps to specific hole with number entry then enter (key 3)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigateState(user);

      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));

      const stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'angle-hole') {
        expect(stateData.currentHole).toBe(3);
      }
    });
  });

  describe('Exiting Angle Hole Mode', () => {
    it('exits to idle with clear key from parameter entry', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterAngleHoleMode(user);
      await enterValue(user, '1');
      expect(useDROStore.getState().stateName).toBe('angle-hole-start-y');

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
      expect(useDROStore.getState().vMem.mode).toBe('abs');
    });

    it('exits to idle with clear key from navigate state', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterAngleHoleMode(user);
      await enterValue(user, '0');
      await enterValue(user, '0');
      await enterValue(user, '1');
      await enterValue(user, '0');
      await enterValue(user, '6');
      expect(useDROStore.getState().stateName).toBe('angle-hole-navigate');

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });
});
