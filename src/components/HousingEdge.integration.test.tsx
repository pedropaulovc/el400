import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderSimulator } from '../tests/helpers/integration-test-utils';

/**
 * Walks ancestors of `el` up to <body>, returning true if any carries
 * aria-hidden="true".
 */
function hasAriaHiddenAncestor(el: HTMLElement | null): boolean {
  let node: HTMLElement | null = el;
  while (node && node.tagName !== 'BODY') {
    if (node.getAttribute('aria-hidden') === 'true') {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

describe('Decorative chrome accessibility (full simulator)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('keeps the brand logo reachable by role in the rendered app', async () => {
    await renderSimulator();

    // Even with the decorative housing edges hidden, the logo's alt text must
    // remain in the accessibility tree (getByRole prunes aria-hidden subtrees).
    const logo = screen.getByRole('img', { name: /electronica logo/i });
    expect(logo).toBeInTheDocument();
    expect(hasAriaHiddenAncestor(logo)).toBe(false);
  });

  it('hides the PowerLED decoration from screen readers in the rendered app', async () => {
    const { container } = await renderSimulator();

    // The PowerLED lamp is decorative. Find its glow element by inline radial
    // gradient and assert it sits inside an aria-hidden subtree.
    const lamp = Array.from(
      container.querySelectorAll<HTMLElement>('div')
    ).find((d) => d.style.background.includes('radial-gradient'));

    expect(lamp).toBeDefined();
    expect(hasAriaHiddenAncestor(lamp!)).toBe(true);
  });

  it('hides the decorative housing edges from screen readers', async () => {
    const { container } = await renderSimulator();

    // The clip-path raised top edge must be pruned from the a11y tree.
    const topEdge = Array.from(
      container.querySelectorAll<HTMLElement>('div')
    ).find((d) => d.style.clipPath && d.style.clipPath.length > 0);

    expect(topEdge).toBeDefined();
    expect(hasAriaHiddenAncestor(topEdge!)).toBe(true);
  });
});
