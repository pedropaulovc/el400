/**
 * Boot Feature Integration Tests
 *
 * Integration tests for boot sequence behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { BOOT_MESSAGE_DURATION_MS } from '../index';
import {
  getAxisDisplayPureNumberValue,
  getAxisDisplayPureTextValue,
  renderSimulator,
} from '../../../tests/helpers/integration-test-utils';

describe('Boot sequence integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows model and version on power-on', async () => {
    vi.useFakeTimers();
    await renderSimulator({ bootMessageMode: 'show', millSource: 'noop' });

    expect(getAxisDisplayPureTextValue('X')).toBe('EL400');
    expect(getAxisDisplayPureTextValue('Y')).toBe('vEr 1.0.0');
    expect(getAxisDisplayPureTextValue('Z')).toBe('');

    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('transitions to counting mode after timeout', async () => {
    vi.useFakeTimers();
    await renderSimulator({ bootMessageMode: 'show', millSource: 'noop' });

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
    const { user } = await renderSimulator({ bootMessageMode: 'show', millSource: 'noop' });

    await user.click(screen.getByTestId('key-clear'));

    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
  });
});
