import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, screen } from '@testing-library/react';
import {
  getAxisDisplayPureNumberValue,
  getAxisDisplayPureTextValue,
  renderSimulator,
} from '../tests/helpers/integration-test-utils';
import { POWER_ON_DISPLAY_DURATION_MS } from './EL400Simulator';

describe('EL400Simulator power-on sequence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows model and version on power-on', () => {
    vi.useFakeTimers();
    renderSimulator({ searchParams: 'forcePowerOn=1' });

    expect(getAxisDisplayPureTextValue('X')).toBe('EL400');
    expect(getAxisDisplayPureTextValue('Y')).toBe('vEr 1.0.0');

    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('transitions to counting mode after timeout', async () => {
    vi.useFakeTimers();
    renderSimulator({ searchParams: 'forcePowerOn=1' });

    await act(async () => {
      vi.advanceTimersByTime(POWER_ON_DISPLAY_DURATION_MS);
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
    const user = userEvent.setup();
    renderSimulator({ searchParams: 'forcePowerOn=1' });

    await user.click(screen.getByTestId('key-clear'));

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
  });
});
