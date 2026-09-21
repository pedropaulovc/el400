import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  typeValue,
  pressEnter,
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
      const { user } = await renderSimulator({ millSource: 'noop' });

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
      const { user } = await renderSimulator({ millSource: 'noop' });

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      await user.click(screen.getByTestId('btn-arc-contour'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });

  describe('Parameter Entry and Cut Type', () => {
    it('walks through every prompt, selects MID cut, and computes points', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      await enterArcContourMode(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-center-x');

      // Center X = 0
      await typeValue(user, '0'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-center-y');
      expect(getAxisDisplayPureTextValue('X')).toBe('EntCnt1');

      // Center Y = 0
      await typeValue(user, '0'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-radius');
      expect(getAxisDisplayPureTextValue('X')).toBe('rAdiUS');

      // Radius = 25 mm
      await typeValue(user, '25'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-start-angle');
      expect(getAxisDisplayPureTextValue('X')).toBe('Str AnG');

      // Start angle = 0
      await typeValue(user, '0'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-end-angle');
      expect(getAxisDisplayPureTextValue('X')).toBe('End AnG');

      // End angle = 90
      await typeValue(user, '90'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-tool-diameter');
      expect(getAxisDisplayPureTextValue('X')).toBe('tooL d');

      // Tool diameter = 5 mm
      await typeValue(user, '5'); await pressEnter(user);
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
      await typeValue(user, '5'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-navigate');
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      const data = useDROStore.getState().stateData;
      expect(data).toMatchObject({
        stateDataType: 'arc',
        cutType: 'MID',
        pointCount: 9,
        currentPoint: 1,
        radius: 25,
      });
    });

    it('rejects a zero radius', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      await enterArcContourMode(user);
      await typeValue(user, '0'); await pressEnter(user); // center X
      await typeValue(user, '0'); await pressEnter(user); // center Y
      await typeValue(user, '0'); await pressEnter(user); // radius = 0 (invalid)

      expect(useDROStore.getState().stateName).toBe('arc-contour-radius');
    });

    it('rejects an impossible inside tool path', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      await enterArcContourMode(user);
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '2'); await pressEnter(user);
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '90'); await pressEnter(user);
      await typeValue(user, '5'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('arc-contour-cut-type');

      await user.click(screen.getByTestId('key-enter'));
      expect(useDROStore.getState().stateName).toBe('arc-contour-cut-type');
      expect(getAxisDisplayPureTextValue('X')).toBe('int CUt');
    });

    it.each([
      ['INT', 0, 22.5, 9],
      ['EXT', 1, 27.5, 10],
      ['MID', 2, 25, 9],
    ] as const)(
      '%s applies the tool-radius offset to the visible path',
      async (cutType, cycles, effectiveRadius, pointCount) => {
        const { user } = await renderSimulator({ millSource: 'noop' });
        await enterArcContourMode(user);
        await typeValue(user, '0'); await pressEnter(user);
        await typeValue(user, '0'); await pressEnter(user);
        await typeValue(user, '25'); await pressEnter(user);
        await typeValue(user, '0'); await pressEnter(user);
        await typeValue(user, '90'); await pressEnter(user);
        await typeValue(user, '5'); await pressEnter(user);
        for (let i = 0; i < cycles; i++) {
          await user.click(screen.getByTestId('key-6'));
        }
        await pressEnter(user);
        await typeValue(user, '5'); await pressEnter(user);

        expect(useDROStore.getState().stateData).toMatchObject({
          stateDataType: 'arc',
          cutType,
          pointCount,
        });
        expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(effectiveRadius, 4);
        expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);

        for (let point = 1; point < pointCount; point++) {
          await user.click(screen.getByTestId('key-6'));
        }
        expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
        expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(effectiveRadius, 4);
      }
    );
  });

  describe('Point Navigation', () => {
    async function setupNavigate(user: ReturnType<typeof userEvent.setup>) {
      await enterArcContourMode(user);
      await typeValue(user, '0'); await pressEnter(user); // center X
      await typeValue(user, '0'); await pressEnter(user); // center Y
      await typeValue(user, '25'); await pressEnter(user); // radius
      await typeValue(user, '0'); await pressEnter(user); // start angle
      await typeValue(user, '90'); await pressEnter(user); // end angle
      await typeValue(user, '5'); await pressEnter(user); // tool diameter
      await user.click(screen.getByTestId('key-enter')); // confirm INT cut
      await typeValue(user, '5'); await pressEnter(user); // max cut
    }

    it('navigates next/prev and wraps with keys 6 and 4', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      await setupNavigate(user);

      expect(useDROStore.getState().stateName).toBe('arc-contour-navigate');
      const initialData = useDROStore.getState().stateData;
      expect(initialData).toMatchObject({ stateDataType: 'arc' });
      const pointCount =
        initialData.stateDataType === 'arc' ? initialData.pointCount : null;
      expect(pointCount).not.toBeNull();

      // Start at point 1, wrap backwards to last with key 4
      await user.click(screen.getByTestId('key-4'));
      let data = useDROStore.getState().stateData;
      expect(data).toMatchObject({
        stateDataType: 'arc',
        currentPoint: pointCount,
      });

      // Forward wraps to 1
      await user.click(screen.getByTestId('key-6'));
      data = useDROStore.getState().stateData;
      expect(data).toMatchObject({
        stateDataType: 'arc',
        currentPoint: 1,
      });
    });

    it('shows current point and accepts an arrow-labelled jump digit', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      await setupNavigate(user);

      await user.click(screen.getByTestId('key-8'));
      expect(getAxisDisplayPureTextValue('X')).toBe('hoLES');
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(1);
      await user.click(screen.getByTestId('key-8'));

      await user.click(screen.getByTestId('key-2'));
      expect(getAxisDisplayPureTextValue('X')).toBe('hoLES');
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(0);
      await user.click(screen.getByTestId('key-8'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(8);
      await user.click(screen.getByTestId('key-enter'));

      const data = useDROStore.getState().stateData;
      expect(data).toMatchObject({
        stateDataType: 'arc',
        currentPoint: 8,
        navigationPhase: 'distance-to-go',
      });
    });

    it('exits to idle in ABS mode with clear key', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      await setupNavigate(user);

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
      expect(useDROStore.getState().vMem.mode).toBe('abs');
    });
  });
});
