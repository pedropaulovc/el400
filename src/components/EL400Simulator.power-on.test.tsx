import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, screen } from '@testing-library/react';
import {
  getAxisDisplayPureNumberValue,
  getAxisDisplayPureTextValue,
  renderSimulator,
} from '../tests/helpers/integration-test-utils';

const BOOT_MESSAGE_DURATION_MS = 1000;

describe('EL400Simulator power-on sequence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows model and version on power-on', () => {
    // Set bootMessageMode to 'show' (default behavior)
    localStorage.setItem('el400-dro-non-volatile-memory', JSON.stringify({
      bootMessageMode: 'show',
    }));

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
    localStorage.setItem('el400-dro-non-volatile-memory', JSON.stringify({
      bootMessageMode: 'show',
    }));

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
    localStorage.setItem('el400-dro-non-volatile-memory', JSON.stringify({
      bootMessageMode: 'show',
    }));

    const user = userEvent.setup();
    renderSimulator();

    await user.click(screen.getByTestId('key-clear'));

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
  });
});
