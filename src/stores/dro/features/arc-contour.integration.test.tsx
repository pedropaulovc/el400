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
import { ARC_CONTOUR_INTRO_DURATION_MS } from './arc-contour';

describe('Arc Contouring Integration', () => {
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
      await vi.advanceTimersByTimeAsync(ARC_CONTOUR_INTRO_DURATION_MS + 10);
    });
  }

  async function enterArcContourMode(user: ReturnType<typeof userEvent.setup>) {
    // Switch to mm so entered values are stored directly without inch conversion.
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await user.click(screen.getByTestId('btn-arc-contour'));
    await advancePastIntro();
  }

  describe('Entering Arc Contour Mode', () => {
    it('shows intro then advances to center-x entry (ABS mode)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      expect(useDROStore.getState().vMem.mode).toBe('abs');

      await user.click(screen.getByTestId('btn-arc-contour'));
      expect(useDROStore.getState().stateName).toBe('arc-contour-intro');
      expect(getAxisDisplayPureTextValue('X')).toBe('ArC Cnt');

      await advancePastIntro();
      expect(useDROStore.getState().stateName).toBe('arc-contour-center-x');
      // center-x: X shows buffer value, Y shows prompt
      expect(getAxisDisplayPureNumberValue('X')).toBe(0);
      expect(getAxisDisplayPureTextValue('Y')).toBe('EntCnt0');
    });

    it('does not enter arc contour mode when in INC mode', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      await user.click(screen.getByTestId('btn-arc-contour'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });

  describe('Parameter Entry and Cut Type', () => {
    it('walks through every prompt, selects MID cut, and computes points', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterArcContourMode(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-center-x');

      // Center X = 0
      await enterValue(user, '0');
      expect(useDROStore.getState().stateName).toBe('arc-contour-center-y');
      expect(getAxisDisplayPureTextValue('X')).toBe('EntCnt1');

      // Center Y = 0
      await enterValue(user, '0');
      expect(useDROStore.getState().stateName).toBe('arc-contour-radius');
      expect(getAxisDisplayPureTextValue('X')).toBe('rAdiUS');

      // Radius = 25 mm
      await enterValue(user, '25');
      expect(useDROStore.getState().stateName).toBe('arc-contour-start-angle');
      expect(getAxisDisplayPureTextValue('X')).toBe('Str AnG');

      // Start angle = 0
      await enterValue(user, '0');
      expect(useDROStore.getState().stateName).toBe('arc-contour-end-angle');
      expect(getAxisDisplayPureTextValue('X')).toBe('End AnG');

      // End angle = 90
      await enterValue(user, '90');
      expect(useDROStore.getState().stateName).toBe('arc-contour-tool-diameter');
      expect(getAxisDisplayPureTextValue('X')).toBe('tooL d');

      // Tool diameter = 5 mm
      await enterValue(user, '5');
      expect(useDROStore.getState().stateName).toBe('arc-contour-cut-type');
      // Default cut type INT
      expect(getAxisDisplayPureTextValue('X')).toBe('int CUt');

      // Toggle 6 three times: INT -> EXT -> MID
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('EXt CUt');
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('X')).toBe('mid CUt');
      await user.click(screen.getByTestId('key-enter'));

      // MAX CUT prompt
      expect(useDROStore.getState().stateName).toBe('arc-contour-max-cut');
      expect(getAxisDisplayPureTextValue('X')).toBe('nAX CUt');

      // MAX CUT = 5 mm -> 90deg arc, MID radius 25 -> length 39.27 -> ceil/5 = 8 -> 9 points
      await enterValue(user, '5');
      expect(useDROStore.getState().stateName).toBe('arc-contour-navigate');
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      const data = useDROStore.getState().stateData;
      expect(data.stateDataType).toBe('arc');
      if (data.stateDataType === 'arc') {
        expect(data.cutType).toBe('MID');
        expect(data.pointCount).toBe(9);
        expect(data.currentPoint).toBe(1);
        expect(data.radius).toBeCloseTo(25, 4);
      }
    });

    it('rejects a zero radius', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();

      await enterArcContourMode(user);
      await enterValue(user, '0'); // center X
      await enterValue(user, '0'); // center Y
      await enterValue(user, '0'); // radius = 0 (invalid)

      expect(useDROStore.getState().stateName).toBe('arc-contour-radius');
    });
  });

  describe('Point Navigation', () => {
    async function setupNavigate(user: ReturnType<typeof userEvent.setup>) {
      await enterArcContourMode(user);
      await enterValue(user, '0'); // center X
      await enterValue(user, '0'); // center Y
      await enterValue(user, '25'); // radius
      await enterValue(user, '0'); // start angle
      await enterValue(user, '90'); // end angle
      await enterValue(user, '5'); // tool diameter
      await user.click(screen.getByTestId('key-enter')); // confirm INT cut
      await enterValue(user, '5'); // max cut
    }

    it('navigates next/prev and wraps with keys 6 and 4', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigate(user);

      expect(useDROStore.getState().stateName).toBe('arc-contour-navigate');
      const pointCount =
        useDROStore.getState().stateData.stateDataType === 'arc'
          ? (useDROStore.getState().stateData as { pointCount: number }).pointCount
          : 0;
      expect(pointCount).toBeGreaterThan(1);

      // Start at point 1, wrap backwards to last with key 4
      await user.click(screen.getByTestId('key-4'));
      let data = useDROStore.getState().stateData;
      if (data.stateDataType === 'arc') expect(data.currentPoint).toBe(pointCount);

      // Forward wraps to 1
      await user.click(screen.getByTestId('key-6'));
      data = useDROStore.getState().stateData;
      if (data.stateDataType === 'arc') expect(data.currentPoint).toBe(1);
    });

    it('exits to idle in ABS mode with clear key', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderSimulator();
      await setupNavigate(user);

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
      expect(useDROStore.getState().vMem.mode).toBe('abs');
    });
  });
});
