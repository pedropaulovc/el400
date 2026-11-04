import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import Index from './Index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('replaces the instruction below the physical panel without remounting it or intercepting panel keys', async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: request });
  Object.defineProperties(document, {
    fullscreenEnabled: { configurable: true, value: true },
    fullscreenElement: { configurable: true, value: null },
    exitFullscreen: { configurable: true, value: vi.fn().mockResolvedValue(undefined) },
  });
  render(<MemoryRouter initialEntries={['/?source=manual']}><Index /></MemoryRouter>);
  const simulator = screen.getByTestId('el400-simulator');
  const entry = screen.getByRole('button', { name: 'Enter fullscreen' });
  expect(simulator).not.toContainElement(entry);
  const controls = screen.getByRole('region', { name: 'Display controls' });
  expect(simulator.nextElementSibling).toBe(controls);
  expect(controls).toContainElement(entry);
  expect(screen.getAllByRole('region', { name: 'Display controls' })).toHaveLength(1);
  expect(screen.queryByText('Click axis buttons to select, then use keypad to enter values')).not.toBeInTheDocument();
  fireEvent.keyDown(simulator, { key: 'f' });
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(entry);
  expect(request).toHaveBeenCalledOnce();
  act(() => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement });
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeEnabled(); });
  expect(screen.getByTestId('el400-simulator')).toBe(simulator);
  expect(screen.getByTestId('key-9')).toBeVisible();
});

it.each(['blocked', 'unsupported', 'rejected'] as const)('keeps %s fullscreen feedback and fallback below the face', async (failure) => {
  const request = vi.fn().mockRejectedValue(new TypeError('Permission denied'));
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true,
    value: failure === 'unsupported' ? undefined : request,
  });
  Object.defineProperties(document, {
    fullscreenEnabled: { configurable: true, value: failure !== 'blocked' },
    fullscreenElement: { configurable: true, value: null },
    exitFullscreen: { configurable: true, value: vi.fn().mockResolvedValue(undefined) },
  });
  render(<MemoryRouter initialEntries={['/?source=manual']}><Index /></MemoryRouter>);
  const simulator = screen.getByTestId('el400-simulator');
  const controls = screen.getByRole('region', { name: 'Display controls' });
  const entry = screen.getByRole('button', { name: 'Enter fullscreen' });
  if (failure === 'rejected') {
    fireEvent.click(entry);
    await waitFor(() => { expect(screen.getByRole('status')).toHaveTextContent('did not allow fullscreen'); });
    expect(entry).toBeEnabled();
  } else {
    expect(entry).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(failure === 'blocked' ? 'blocked by this page’s permissions' : 'not supported');
    expect(request).not.toHaveBeenCalled();
  }
  expect(simulator.nextElementSibling).toBe(controls);
  expect(controls).toContainElement(screen.getByRole('status'));
  expect(controls).toContainElement(screen.getByRole('link', { name: 'Open EL400 in new tab' }));
  expect(screen.getAllByRole('region', { name: 'Display controls' })).toHaveLength(1);
  expect(screen.getByTestId('el400-simulator')).toBe(simulator);
});
