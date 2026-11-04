import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Index from './Index';

vi.mock('@/components/EL400Simulator', () => ({
  default: () => <div data-testid="face">EL400 face</div>,
}));
vi.mock('@/components/FullscreenControl', () => ({
  FullscreenControl: () => <button>Enter fullscreen</button>,
}));
vi.mock('@/hooks/useDataSourceConfig', () => ({
  useDataSourceConfig: () => ({ type: 'manual' }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('reserves scaled visual bounds without zooming the face or fullscreen controls', () => {
  let width = 780;
  let height = 400;
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
  let resized: () => void = () => {};
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback; }
    observe = observe;
    disconnect = disconnect;
  });

  const { unmount } = render(<Index />);
  const panel = screen.getByTestId('face').parentElement!;
  const bounds = panel.parentElement!;
  expect(panel.style.transform).toBe('scale(1.2)');
  expect(panel.style.getPropertyValue('zoom')).toBe('');
  expect(bounds.style.width).toBe('936px');
  expect(bounds.style.height).toBe('480px');
  expect(observe).toHaveBeenCalledWith(panel);
  expect(bounds).not.toContainElement(screen.getByRole('button', { name: 'Enter fullscreen' }));

  act(() => {
    width = 800;
    height = 450;
    resized();
  });
  expect(bounds.style.width).toBe('960px');
  expect(bounds.style.height).toBe('540px');
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});
