import { describe, it, expect } from 'vitest';
import { render } from '@/tests/helpers/render-utils';
import PowerLED from './PowerLED';

describe('PowerLED Accessibility', () => {
  it('marks the decorative root element as aria-hidden', () => {
    const { container } = render(<PowerLED />);

    // The PowerLED is purely decorative chrome (a glowing lamp). Its outermost
    // rendered element must be hidden from the accessibility tree so screen
    // readers do not announce noise.
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('contributes no accessible content to the tree', () => {
    const { container } = render(<PowerLED />);

    // No text, no roles, no images: a screen reader walking this subtree
    // should find nothing meaningful.
    expect(container.textContent).toBe('');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role]')).toBeNull();
  });

  it('hides the entire subtree, not just a nested child', () => {
    const { container } = render(<PowerLED />);

    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();

    // Walking up from the innermost lamp glow, an aria-hidden ancestor must
    // exist so the whole decoration is pruned in one cut.
    const innermost = container.querySelector('div div div') ?? root;
    let node: HTMLElement | null = innermost as HTMLElement;
    let foundHidden = false;
    while (node) {
      if (node.getAttribute('aria-hidden') === 'true') {
        foundHidden = true;
        break;
      }
      node = node.parentElement;
      if (node === container) break;
    }
    expect(foundHidden).toBe(true);
  });
});
