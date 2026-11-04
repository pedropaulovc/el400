import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FullscreenControl } from './FullscreenControl';

const request = vi.fn<() => Promise<void>>();
const exit = vi.fn<() => Promise<void>>();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function installFullscreen() {
  Object.defineProperties(document, {
    fullscreenEnabled: { configurable: true, value: true },
    fullscreenElement: { configurable: true, value: null },
    exitFullscreen: { configurable: true, value: exit },
  });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    configurable: true, value: request,
  });
  request.mockReset().mockResolvedValue(undefined);
  exit.mockReset().mockResolvedValue(undefined);
}

function changeFullscreen(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: element });
  document.dispatchEvent(new Event('fullscreenchange'));
}

describe('FullscreenControl', () => {
  beforeEach(installFullscreen);

  it('never enters automatically, requests the document root on click, and follows real state', async () => {
    render(<FullscreenControl />);
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.contexts[0]).toBe(document.documentElement);
    // A resolved promise alone is not proof of fullscreen.
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toHaveAttribute('aria-pressed', 'false');
    act(() => { changeFullscreen(document.documentElement); });
    await waitFor(() => { expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeEnabled(); });
    fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
    expect(exit).toHaveBeenCalledOnce();
    expect(exit.mock.contexts[0]).toBe(document);
    act(() => { changeFullscreen(null); });
    await waitFor(() => { expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeEnabled(); });
  });

  it('tracks browser-initiated entry/exit and removes its event listener on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<FullscreenControl />);
    act(() => { changeFullscreen(document.documentElement); });
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute('aria-pressed', 'true');
    act(() => { changeFullscreen(null); });
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toHaveAttribute('aria-pressed', 'false');
    unmount();
    expect(remove).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
  });

  it('reports rejected entry without claiming success and keeps retry available', async () => {
    request.mockRejectedValue(new TypeError('Permission denied'));
    render(<FullscreenControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    await waitFor(() => { expect(screen.getByRole('status')).toHaveTextContent('did not allow fullscreen'); });
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeEnabled();
    const link = screen.getByRole('link', { name: 'Open EL400 in new tab' });
    expect(link).toHaveAttribute('href', window.location.href);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('reports rejected exit and preserves active state', async () => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement });
    exit.mockRejectedValue(new Error('Cannot exit'));
    render(<FullscreenControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
    await waitFor(() => { expect(screen.getByRole('status')).toHaveTextContent('Use Esc'); });
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('explains permissions policy denial instead of offering an inoperative entry button', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    render(<FullscreenControl />);
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('blocked by this page’s permissions');
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
    expect(request).not.toHaveBeenCalled();
  });

  it('explains missing browser support', () => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: undefined });
    render(<FullscreenControl />);
    expect(screen.getByRole('button', { name: 'Enter fullscreen' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('not supported');
  });

  it('prevents overlapping requests while the browser prompt is pending', async () => {
    let resolve!: () => void;
    request.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
    render(<FullscreenControl />);
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
    const button = screen.getByRole('button', { name: 'Enter fullscreen' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(request).toHaveBeenCalledOnce();
    await act(async () => { resolve(); });
    expect(button).toBeEnabled();
  });
});
