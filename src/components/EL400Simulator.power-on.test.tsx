import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, screen } from '@testing-library/react';
import {
  getAxisDisplayPureNumberValue,
  getAxisDisplayPureTextValue,
  renderSimulator,
  setBootMessageMode,
} from '../tests/helpers/integration-test-utils';
import { BOOT_MESSAGE_DURATION_MS } from '../context/VolatileMemoryContext';

describe('EL400Simulator power-on sequence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows model and version on power-on', () => {
    setBootMessageMode('show');

    vi.useFakeTimers();
    renderSimulator();

    expect(getAxisDisplayPureTextValue('X')).toBe('EL400');
    expect(getAxisDisplayPureTextValue('Y')).toBe('vEr 1.0.0');
    expect(getAxisDisplayPureTextValue('Z')).toBe('');

    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('transitions to counting mode after timeout', async () => {
    setBootMessageMode('show');

    vi.useFakeTimers();
    renderSimulator();

    await act(async () => {
      vi.advanceTimersByTime(BOOT_MESSAGE_DURATION_MS);
    });

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);

    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('allows bypassing the power-on message with the clear key', async () => {
    setBootMessageMode('show');

    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('key-clear'));

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
  });
});
