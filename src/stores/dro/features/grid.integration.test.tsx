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
import { GRID_INTRO_DURATION_MS } from './grid';

describe('Grid Drilling Integration (US-020)', () => {
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
      await vi.advanceTimersByTimeAsync(GRID_INTRO_DURATION_MS + 10);
    });
  }

  /** Enter grid mode, switch to mm, advance past intro. Leaves session at grid-start-x in mm. */
  async function enterGridModeMm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByTestId('btn-toggle-unit')); // switch to mm
    await user.click(screen.getByTestId('btn-grid-hole'));
    await advancePastIntro();
  }

  describe('entering grid mode (AC20.1)', () => {
    it('enters grid mode and shows Grid intro then start prompt', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      expect(useDROStore.getState().vMem.mode).toBe('abs');

      await user.click(screen.getByTestId('btn-grid-hole'));
      expect(useDROStore.getState().stateName).toBe('grid-intro');
      expect(getAxisDisplayPureTextValue('X')).toBe('Grid');

      await advancePastIntro();
      expect(useDROStore.getState().stateName).toBe('grid-start-x');
      expect(getAxisDisplayPureTextValue('Y')).toBe('EntCnt0');
    });

    it('does not enter grid mode when in INC mode', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      await user.click(screen.getByTestId('btn-abs-inc'));
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      await user.click(screen.getByTestId('btn-grid-hole'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });

  describe('parameter entry flow (AC20.2-AC20.8)', () => {
    it('walks every prompt and stores values in mm', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      await enterGridModeMm(user);

      // Start X (AC20.2)
      expect(useDROStore.getState().stateName).toBe('grid-start-x');
      expect(getAxisDisplayPureTextValue('Y')).toBe('EntCnt0');
      await typeValue(user, '0'); await pressEnter(user);

      // Start Y (AC20.3)
      expect(useDROStore.getState().stateName).toBe('grid-start-y');
      expect(getAxisDisplayPureTextValue('X')).toBe('EntCnt1');
      await typeValue(user, '0'); await pressEnter(user);

      // Pitch X (AC20.4)
      expect(useDROStore.getState().stateName).toBe('grid-pitch-x');
      expect(getAxisDisplayPureTextValue('X')).toBe('PItCh X');
      await typeValue(user, '10'); await pressEnter(user);

      // Pitch Y (AC20.5)
      expect(useDROStore.getState().stateName).toBe('grid-pitch-y');
      expect(getAxisDisplayPureTextValue('X')).toBe('PItCh Y');
      await typeValue(user, '8'); await pressEnter(user);

      // Angle (AC20.6)
      expect(useDROStore.getState().stateName).toBe('grid-angle');
      expect(getAxisDisplayPureTextValue('X')).toBe('AnGLE');
      await typeValue(user, '0'); await pressEnter(user);

      // Holes X (AC20.7)
      expect(useDROStore.getState().stateName).toBe('grid-holes-x');
      expect(getAxisDisplayPureTextValue('X')).toBe('hoLE X');
      await typeValue(user, '3'); await pressEnter(user);

      // Holes Y (AC20.8)
      expect(useDROStore.getState().stateName).toBe('grid-holes-y');
      expect(getAxisDisplayPureTextValue('X')).toBe('hoLE Y');
      await typeValue(user, '3'); await pressEnter(user);

      // Navigate, INC mode
      expect(useDROStore.getState().stateName).toBe('grid-navigate');
      expect(useDROStore.getState().vMem.mode).toBe('inc');

      const stateData = useDROStore.getState().stateData;
      expect(stateData.stateDataType).toBe('grid');
      if (stateData.stateDataType === 'grid') {
        expect(stateData.startX).toBeCloseTo(0, 4);
        expect(stateData.startY).toBeCloseTo(0, 4);
        expect(stateData.pitchX).toBeCloseTo(10, 4);
        expect(stateData.pitchY).toBeCloseTo(8, 4);
        expect(stateData.angle).toBe(0);
        expect(stateData.holesX).toBe(3);
        expect(stateData.holesY).toBe(3);
        expect(stateData.currentHole).toBe(1);
      }
    });

    it('rejects zero pitch X', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      await enterGridModeMm(user);

      await typeValue(user, '0'); await pressEnter(user); // start X
      await typeValue(user, '0'); await pressEnter(user); // start Y
      await typeValue(user, '0'); await pressEnter(user); // pitch X = 0 (invalid)

      expect(useDROStore.getState().stateName).toBe('grid-pitch-x');
    });
  });

  describe('hole spacing and rotation (AC20.10, AC20.12)', () => {
    /** Set up a navigate state with the given params (mm), start at origin. */
    async function setupGrid(
      user: ReturnType<typeof userEvent.setup>,
      params: { pitchX: string; pitchY: string; angle: string; holesX: string; holesY: string }
    ) {
      await enterGridModeMm(user);
      await typeValue(user, '0'); await pressEnter(user); // start X
      await typeValue(user, '0'); await pressEnter(user); // start Y
      await typeValue(user, params.pitchX); await pressEnter(user);
      await typeValue(user, params.pitchY); await pressEnter(user);
      await typeValue(user, params.angle); await pressEnter(user);
      await typeValue(user, params.holesX); await pressEnter(user);
      await typeValue(user, params.holesY); await pressEnter(user);
    }

    it('axis-aligned grid: hole 2 one pitch X over, hole 4 one pitch Y up', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      // 3x3, pitchX=10, pitchY=8, angle 0
      await setupGrid(user, { pitchX: '10', pitchY: '8', angle: '0', holesX: '3', holesY: '3' });

      expect(useDROStore.getState().stateName).toBe('grid-navigate');

      // Hole 1 at origin: distance-to-go (0,0)
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 3);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 3);

      // Hole 2: +pitchX in X (key 6 = next)
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 3);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 3);

      // Hole 3
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(20, 3);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 3);

      // Hole 4: start of row 2 => +pitchY in Y, X back to 0
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 3);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(8, 3);
    });

    it('rotated grid at 45 degrees', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      // pitch 1mm each so cos/sin appear directly, 2x2
      await setupGrid(user, { pitchX: '1', pitchY: '1', angle: '45', holesX: '2', holesY: '2' });

      // Hole 2 (row 0, col 1): (cos45, sin45) = (0.7071, 0.7071)
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0.7071, 3);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0.7071, 3);

      // Hole 3 (row 1, col 0): (cos135, sin135) = (-0.7071, 0.7071)
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(-0.7071, 3);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0.7071, 3);
    });
  });

  describe('navigation and total holes (AC20.9, AC20.11)', () => {
    it('navigates 3x3 = 9 holes and wraps back to hole 1', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      await user.click(screen.getByTestId('btn-toggle-unit'));
      await user.click(screen.getByTestId('btn-grid-hole'));
      await advancePastIntro();
      await typeValue(user, '0'); await pressEnter(user); // start X
      await typeValue(user, '0'); await pressEnter(user); // start Y
      await typeValue(user, '5'); await pressEnter(user); // pitch X
      await typeValue(user, '5'); await pressEnter(user); // pitch Y
      await typeValue(user, '0'); await pressEnter(user); // angle
      await typeValue(user, '3'); await pressEnter(user); // holes X
      await typeValue(user, '3'); await pressEnter(user); // holes Y

      expect(useDROStore.getState().stateName).toBe('grid-navigate');

      // Jump to the last hole (9) - in range only because total = 3 * 3 = 9.
      // key-9 is a pure digit key (not an arrow).
      await user.click(screen.getByTestId('key-9'));
      await user.click(screen.getByTestId('key-enter'));
      let stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'grid') {
        expect(stateData.currentHole).toBe(9);
      }

      // Next from the last hole wraps to hole 1
      await user.click(screen.getByTestId('key-6'));
      stateData = useDROStore.getState().stateData;
      if (stateData.stateDataType === 'grid') {
        expect(stateData.currentHole).toBe(1);
      }
    });

    it('shows current hole number with key 8', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      await user.click(screen.getByTestId('btn-toggle-unit'));
      await user.click(screen.getByTestId('btn-grid-hole'));
      await advancePastIntro();
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '5'); await pressEnter(user);
      await typeValue(user, '5'); await pressEnter(user);
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '3'); await pressEnter(user);
      await typeValue(user, '3'); await pressEnter(user);

      await user.click(screen.getByTestId('key-6')); // hole 2
      await user.click(screen.getByTestId('key-8'));
      expect(useDROStore.getState().vMem.inputBuffer).toBe('2');
    });
  });

  describe('exiting grid mode', () => {
    it('exits to idle and restores ABS with clear from navigate', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });

      await user.click(screen.getByTestId('btn-toggle-unit'));
      await user.click(screen.getByTestId('btn-grid-hole'));
      await advancePastIntro();
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '5'); await pressEnter(user);
      await typeValue(user, '5'); await pressEnter(user);
      await typeValue(user, '0'); await pressEnter(user);
      await typeValue(user, '3'); await pressEnter(user);
      await typeValue(user, '3'); await pressEnter(user);
      expect(useDROStore.getState().stateName).toBe('grid-navigate');

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
      expect(useDROStore.getState().vMem.mode).toBe('abs');
    });

    it('exits to idle with clear from parameter entry when buffer empty', async () => {
      const { user } = await renderSimulator({ millSource: 'noop' });
      await enterGridModeMm(user);
      await typeValue(user, '0'); await pressEnter(user); // start X -> now at start Y
      expect(useDROStore.getState().stateName).toBe('grid-start-y');

      await user.click(screen.getByTestId('key-clear'));
      expect(useDROStore.getState().stateName).toBe('idle');
    });
  });
});
