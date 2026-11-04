import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import Index from './Index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('integrates fullscreen outside the physical panel without remounting it or intercepting panel keys', async () => {
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
  fireEvent.keyDown(simulator, { key: 'f' });
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(entry);
  expect(request).toHaveBeenCalledOnce();
  act(() => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement });
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeEnabled());
  expect(screen.getByTestId('el400-simulator')).toBe(simulator);
  expect(screen.getByTestId('key-9')).toBeVisible();
});
