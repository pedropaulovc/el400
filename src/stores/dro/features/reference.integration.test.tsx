/**
 * Integration tests for the Reference / Datum recall feature (US-012).
 *
 * Drives the rendered simulator via data-testids and asserts the displayed
 * values. Reference-mark crossing is delivered through the same dispatch the
 * mill connection uses, after positioning the (connected) mill.
 *
 * @see project/user-stories/03-data-management/US-012-datum-recall.md
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('Reference / Datum recall integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('AC 12.5: honE mode shows honE, then SELECt after ENT', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-reference'));
    expect(useDROStore.getState().stateName).toBe('reference-menu-home');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.home);

    await user.click(screen.getByTestId('key-enter'));
    expect(useDROStore.getState().stateName).toBe('reference-home-select');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.select);
  });

  it('AC 12.1: navigate to nC rEF and confirm', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-6')); // right -> nC rEF
    expect(useDROStore.getState().stateName).toBe('reference-menu-machine');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.machine);

    await user.click(screen.getByTestId('key-enter'));
    expect(useDROStore.getState().stateName).toBe('reference-machine-select');
    expect(getAxisDisplayPureTextValue('X')).toBe(REFERENCE_TEXT.select);
  });

  it('AC 12.6: selecting an axis shows blinking 0 (waiting)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter')); // confirm honE
    await user.click(screen.getByTestId('axis-select-x'));

    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');
    expect(getAxisDisplayPureNumberValue('X')).toBe(0);
  });

  it('AC 12.3/12.4 honE: crossing mark sets datum at the mark (reads 0)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // mm mode for direct values
    await user.click(screen.getByTestId('btn-toggle-unit'));

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter')); // honE
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');

    crossReferenceMark('X', 37.5);

    expect(useDROStore.getState().stateName).toBe('idle');
    // At the mark, Home datum reads 0
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    expect(useDROStore.getState().vMem.workOffsets.X).toBeCloseTo(37.5, 4);
  });

  it('AC 12.3/12.4 nC rEF: crossing mark recalls stored machine reference', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-toggle-unit')); // mm

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-6')); // -> nC rEF
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-machine-waiting');

    crossReferenceMark('X', 100);

    expect(useDROStore.getState().stateName).toBe('idle');
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(MACHINE_REFERENCE_VALUES_MM.X, 4);
  });

  it('forces ABS mode when entered from INC (§7.7)', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-abs-inc')); // -> INC
    expect(useDROStore.getState().vMem.mode).toBe('inc');

    await user.click(screen.getByTestId('btn-reference'));
    expect(useDROStore.getState().stateName).toBe('reference-menu-home');
    expect(useDROStore.getState().vMem.mode).toBe('abs');
  });

  it('CLEAR cancels reference without changing the datum', async () => {
    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(useDROStore.getState().stateName).toBe('reference-home-waiting');

    await user.click(screen.getByTestId('key-clear'));
    expect(useDROStore.getState().stateName).toBe('idle');
    expect(useDROStore.getState().vMem.workOffsets.X).toBe(0);
  });
});
