import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderSimulator, getAxisDisplayPureNumberValue, getAxisDisplayPureTextValue } from '../../../tests/helpers/integration-test-utils';
import { initializeDROMillConnection } from '../../droStore';
import { initializeMillStore } from '../../millStore';
import { DebugMillAdapter } from '../../../adapters/DebugMillAdapter';

describe('Reference with simulated encoder index pulses', () => {
  let cleanup: (() => void) | undefined;
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup?.(); cleanup = undefined; });

  it('homes, sets arbitrary machine datum, and recalls after a reverse index crossing', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    initializeDROMillConnection();
    const adapter = new DebugMillAdapter();
    await act(async () => { cleanup = await initializeMillStore(adapter); });
    await user.click(screen.getByTestId('btn-toggle-unit'));
    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    act(() => { adapter.getServer().setPosition('x', 9); });
    expect(getAxisDisplayPureNumberValue('X')).toBe(0);
    act(() => { adapter.getServer().setPosition('x', 12); });
    expect(getAxisDisplayPureNumberValue('X')).toBe(2);
    act(() => { adapter.getServer().setPosition('x', 37.25); });
    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureTextValue('X')).toBe('SEt nC');
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    expect(getAxisDisplayPureNumberValue('X')).toBe(0);
    await user.click(screen.getByTestId('btn-reference'));
    await user.click(screen.getByTestId('key-4'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    act(() => { adapter.getServer().setPosition('x', 9); });
    expect(getAxisDisplayPureNumberValue('X')).toBe(-28.25);
    act(() => { adapter.getServer().setPosition('x', 37.25); });
    expect(getAxisDisplayPureNumberValue('X')).toBe(0);
  });
});
