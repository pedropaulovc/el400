import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderSimulator, emitPosition, getAxisDisplayPureNumberValue } from '../../../tests/helpers/integration-test-utils';

describe('SDM front-panel coordinate preservation', () => {
  beforeEach(() => { localStorage.clear(); });

  it('captures XYZ with X/X and reads every coordinate back before editing', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-toggle-unit'));
    emitPosition(24.96, 1, -3);
    await user.click(screen.getByTestId('btn-sdm'));
    await user.click(screen.getByTestId('key-4'));
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(1);
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-x'));
    await user.click(screen.getByTestId('axis-select-x'));
    await user.click(screen.getByTestId('key-clear'));
    await user.click(screen.getByTestId('btn-sdm'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(24.96, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBe(1);
    expect(getAxisDisplayPureNumberValue('Z')).toBe(-3);
    await user.click(screen.getByTestId('key-clear'));
    await user.click(screen.getByTestId('btn-sdm'));
    await user.click(screen.getByTestId('key-6'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('key-enter'));
    emitPosition(20, 2, -5);
    expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(4.96, 4);
    expect(getAxisDisplayPureNumberValue('Y')).toBe(-1);
    expect(getAxisDisplayPureNumberValue('Z')).toBe(2);
    await user.click(screen.getByTestId('key-clear'));
    expect(getAxisDisplayPureNumberValue('X')).toBe(20);
  });

  it('shows step1000 literally while coordinate rows retain their dP decimals', async () => {
    const { user } = await renderSimulator();
    await user.click(screen.getByTestId('btn-sdm'));
    await user.click(screen.getByTestId('key-enter'));
    await user.click(screen.getByTestId('axis-select-y'));
    for (const digit of '1000') await user.click(screen.getByTestId(`key-${digit}`));
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(1000);
    await user.click(screen.getByTestId('key-enter'));
    expect(getAxisDisplayPureNumberValue('Y', 4)).toBe(0);
  });
});
