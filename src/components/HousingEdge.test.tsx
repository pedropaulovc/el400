import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/helpers/render-utils';
import HousingEdge from './HousingEdge';
import BrandLogo from './BrandLogo';

/**
 * Returns true if `el` or any of its ancestors (up to but excluding `stop`)
 * carries aria-hidden="true". This is the predicate assistive tech uses to
 * prune a node from the accessibility tree.
 */
function isInAriaHiddenSubtree(el: HTMLElement | null, stop: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node && node !== stop) {
    if (node.getAttribute('aria-hidden') === 'true') {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

describe('HousingEdge Accessibility', () => {
  describe('bottom edge (purely decorative)', () => {
    it('marks the decorative root as aria-hidden', () => {
      const { container } = render(<HousingEdge position="bottom" />);
      expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    });

    it('exposes no accessible content', () => {
      const { container } = render(<HousingEdge position="bottom" />);
      expect(container.textContent).toBe('');
      expect(container.querySelector('[role]')).toBeNull();
    });
  });

  describe('top edge with logo slot', () => {
    it('hides the decorative gradient panel from screen readers', () => {
      const { container } = render(
        <HousingEdge position="top">
          <BrandLogo />
        </HousingEdge>
      );

      // The raised metal edge is drawn with a clip-path gradient div. That
      // decorative div must be aria-hidden. We locate it by its inline
      // clip-path style (the children wrapper has no clip-path).
      const decorativePanel = Array.from(
        container.querySelectorAll<HTMLElement>('div')
      ).find((d) => d.style.clipPath && d.style.clipPath.length > 0);

      expect(decorativePanel).toBeDefined();
      expect(decorativePanel).toHaveAttribute('aria-hidden', 'true');
    });

    it('keeps the BrandLogo image reachable in the accessibility tree', () => {
      render(
        <HousingEdge position="top">
          <BrandLogo />
        </HousingEdge>
      );

      // getByRole excludes aria-hidden subtrees by default. If a naive
      // implementation hid the whole top container (or the children slot),
      // this query would throw — exactly the regression we guard against.
      const logo = screen.getByRole('img', { name: /electronica logo/i });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('alt', 'Electronica Logo');
    });

    it('does not nest the logo inside any aria-hidden ancestor', () => {
      const { container } = render(
        <HousingEdge position="top">
          <BrandLogo />
        </HousingEdge>
      );

      const root = container.firstElementChild as HTMLElement;
      const logo = container.querySelector('img');
      expect(logo).not.toBeNull();

      // Strongest assertion: walk the real ancestor chain from the img up to
      // the HousingEdge root. None of them may be aria-hidden, otherwise the
      // alt text is silenced even though getByRole sometimes still resolves.
      expect(isInAriaHiddenSubtree(logo as HTMLElement, root)).toBe(false);
      // The root itself must NOT be hidden either (it contains meaningful content).
      expect(root).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('renders the logo container slot without aria-hidden', () => {
      const { container } = render(
        <HousingEdge position="top">
          <BrandLogo />
        </HousingEdge>
      );

      // The wrapper that holds {children} must remain in the a11y tree.
      const logo = container.querySelector('img') as HTMLElement;
      const slot = logo.closest('div')!.parentElement!;
      expect(slot).not.toHaveAttribute('aria-hidden', 'true');
    });
  });
});
