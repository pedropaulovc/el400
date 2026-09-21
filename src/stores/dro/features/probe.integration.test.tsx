import { describe, it, expect, afterEach, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { renderSimulator, getAxisDisplayPureTextValue, getAxisDisplayPureNumberValue } from '../../../tests/helpers/integration-test-utils';
import { useDROStore } from '../../droStore';
import { useMillStore } from '../../millStore';
import { useSettingsStore } from '../../settingsStore';
import { createDefaultMillState, createProbeState } from '../../../types/millState';

function setMill(x: number, pinState = ''): void {
  act(() => {
    useMillStore.setState({ millState: { ...createDefaultMillState('mock'), connected: true, position: { x, y: 0, z: 0 }, probe: createProbeState(pinState) } });
    useDROStore.getState().dispatch({ eventName: 'MILL_STATE_CHANGED' });
  });
}
async function openProbeMenu(user: UserEvent) {
  await user.click(screen.getByTestId('btn-function'));
  for (let i = 0; i < 12 && getAxisDisplayPureTextValue('X') !== 'ProbE'; i++) await user.click(screen.getByTestId('key-6'));
  expect(getAxisDisplayPureTextValue('X')).toBe('ProbE');
  await user.click(screen.getByTestId('key-enter'));
}
afterEach(() => { vi.restoreAllMocks(); });

describe('Touch Probe front-panel integration', () => {
  it('captures an edge then applies the operator coordinate to the captured point', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    act(() => { useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm' }); });
    await openProbeMenu(user);
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    await user.click(screen.getByTestId('key-enter'));
    setMill(50, 'P');
    await user.click(screen.getByTestId('key-5'));
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureNumberValue('X')).toBe(5);
    setMill(60);
    expect(getAxisDisplayPureNumberValue('X')).toBe(15);
    await user.click(screen.getByTestId('key-clear'));
    expect(getAxisDisplayPureNumberValue('X')).toBe(15);
  });

  it('shows both inside width and center, preserving datum', async () => {
    const { user } = await renderSimulator({ millSource: 'noop' });
    act(() => { useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm', probeDiameterMm: 6 }); });
    await openProbeMenu(user);
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    setMill(10, 'P');
    setMill(10);
    clock.mockReturnValue(101_000);
    setMill(60, 'P');
    expect(getAxisDisplayPureNumberValue('X')).toBe(56);
    await user.click(screen.getByTestId('key-6'));
    expect(getAxisDisplayPureNumberValue('X')).toBe(35);
    await user.click(screen.getByTestId('key-clear'));
    expect(getAxisDisplayPureNumberValue('X')).toBe(60);
  });

  it('freezes while held then resumes current counting on release', async () => {
    await renderSimulator({ millSource: 'noop' });
    act(() => { useSettingsStore.getState().updateNvMem({ defaultUnit: 'mm', probeDroType: 'freeze' }); });
    setMill(25, 'P');
    setMill(30, 'P');
    expect(getAxisDisplayPureNumberValue('X')).toBe(25);
    setMill(30);
    expect(getAxisDisplayPureNumberValue('X')).toBe(30);
  });
});
