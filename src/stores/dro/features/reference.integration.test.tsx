/**
 * Integration tests for the Reference / Datum recall feature (US-012).
 *
 * Drives the rendered simulator via data-testids and asserts the displayed
 * values. Reference-mark crossing is delivered through the same dispatch the
 * mill connection uses (MILL_STATE_CHANGED) after positioning the (connected)
 * mill — the real-user jog path — and is additionally exercised through the
 * explicit ENCODER_REF_MARK_CROSSED latch.
 *
 * @see project/user-stories/03-data-management/US-012-datum-recall.md
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';
import { useMillStore } from '../../millStore';
import { createDefaultMillState } from '../../../types/millState';
import { MACHINE_REFERENCE_VALUES_MM, REFERENCE_TEXT } from './reference';

/**
 * Put the (connected) mill at a machine position, then dispatch the
 * ENCODER_REF_MARK_CROSSED event for an axis to model crossing the mark there.
 */
function crossReferenceMark(axis: 'X' | 'Y' | 'Z', machinePos: number) {
  act(() => {
    useMillStore.setState({
      millState: {
        ...createDefaultMillState('mock'),
        connected: true,
        position: {
          x: axis === 'X' ? machinePos : 0,
          y: axis === 'Y' ? machinePos : 0,
          z: axis === 'Z' ? machinePos : 0,
        },
      },
    });
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
    useDROStore.getState().dispatch({ eventName: 'ENCODER_REF_MARK_CROSSED', axis });
  });
}

/**
 * Real-user path only: jog the (connected) mill so the selected axis lands at
 * `machinePos`, emitting MILL_STATE_CHANGED — exactly what a debug-panel jog or
 * a connected mill does. No explicit reference hook is fired here, so this
 * proves the running app latches the datum from machine motion alone.
 */
function jogAcrossMark(axis: 'X' | 'Y' | 'Z', machinePos: number) {
  act(() => {
    useMillStore.setState({
      millState: {
        ...createDefaultMillState('mock'),
        connected: true,
        position: {
          x: axis === 'X' ? machinePos : 0,
          y: axis === 'Y' ? machinePos : 0,
          z: axis === 'Z' ? machinePos : 0,
        },
      },
    });
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
  });
}

describe('Reference / Datum recall integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('AC 12.5: honE mode shows honE, then SELECt after ENT', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-reference'));
    expect(useDROStore.getState().stateName).toBe('reference-menu-home');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.home);

    await user.click(screen.getByTestId('key-enter'));
    expect(useDROStore.getState().stateName).toBe('reference-home-select');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.select);
  });

  it('AC 12.1: navigate to nC rEF and confirm', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-6')); // right -> nC rEF
    expect(useDROStore.getState().stateName).toBe('reference-menu-machine');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.machine);

    await user.click(screen.getByTestId('key-enter'));
    expect(useDROStore.getState().stateName).toBe('reference-machine-select');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.select);
  });

  it('AC 12.6: selecting an axis shows blinking 0 (waiting)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter')); // confirm honE
    await user.click(screen.getByTestId('axis-select-x'));

    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');
    expect(getAxisDisplayPureNumberValue('X')).toBe(0);
  });

  it('AC 12.3/12.4 honE: crossing mark sets datum at the mark (reads 0)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    // mm mode for direct values
    await user.click(screen.getByTestId('btn-toggle-unit'));

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter')); // honE
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');

    // Jog so the axis lands on the mark (10mm) — Home datum reads 0 there.
    crossReferenceMark('X', 10);

    expect(useDROStore.getState().stateName).toBe('idle');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    // Datum referenced to the mark: offset = mark - 0 = 10.
    expect(useDROStore.getState().vMem.workOffsets.X).toBeCloseTo(10, 4);
  });

  it('AC 12.3/12.4 nC rEF: crossing mark recalls stored machine reference', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-6')); // -> nC rEF
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-machine-waiting');

    // Land on the mark (10mm) so the recalled value shows at the crossing point.
    crossReferenceMark('X', 10);

    expect(useDROStore.getState().stateName).toBe('idle');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(MACHINE_REFERENCE_VALUES_MM.X, 4);
    // offset = mark - storedRef, so the count past the mark stays correct.
    expect(useDROStore.getState().vMem.workOffsets.X).toBeCloseTo(
      10 - MACHINE_REFERENCE_VALUES_MM.X,
      4
    );
  });

  it('AC 12.3 real-user trigger: jogging the axis across the mark latches the datum (no hook)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-6')); // -> nC rEF
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-machine-waiting');

    // Jog so the axis lands on the mark (10mm) via MILL_STATE_CHANGED only —
    // the real-user path (no explicit hook). Display reads the stored value.
    jogAcrossMark('X', 10);

    expect(useDROStore.getState().stateName).toBe('idle');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(MACHINE_REFERENCE_VALUES_MM.X, 4);
    expect(useDROStore.getState().vMem.workOffsets.X).toBeCloseTo(
      10 - MACHINE_REFERENCE_VALUES_MM.X,
      4
    );
  });

  it('AC 12.3 real-user trigger: jogging short of the mark keeps waiting (no latch)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter')); // honE
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');

    // Jog only to 5mm — short of the 10mm mark; must stay waiting.
    jogAcrossMark('X', 5);
    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');

    // Continue past the mark — now it latches.
    jogAcrossMark('X', 12);
    expect(useDROStore.getState().stateName).toBe('idle');
  });

  it('AC 12.6: the waiting axis digits blink while waiting for the mark', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter')); // honE
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');

    // The selected axis (X) digits carry the blink marker; others do not.
    const xDigits = document.querySelector('[data-testid="axis-display-x"] [data-blinking="true"]');
    expect(xDigits).not.toBeNull();
    expect(xDigits?.className).toContain('animate-blink');

    const yDigits = document.querySelector('[data-testid="axis-display-y"] [data-blinking="true"]');
    expect(yDigits).toBeNull();
  });

  it('forces ABS mode when entered from INC (§7.7)', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-abs-inc')); // -> INC
    expect(useDROStore.getState().vMem.mode).toBe('inc');

    await user.click(screen.getByTestId('btn-reference'));
    expect(useDROStore.getState().stateName).toBe('reference-menu-home');
    expect(useDROStore.getState().vMem.mode).toBe('abs');
  });

  it('CLEAR cancels reference without changing the datum', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');

    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
    expect(useDROStore.getState().vMem.workOffsets.X).toBe(0);
  });
});
