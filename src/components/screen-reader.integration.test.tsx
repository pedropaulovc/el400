import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderSimulator } from '../tests/helpers/integration-test-utils';

/**
 * US-048 Screen Reader Support — integration regression suite.
 *
 * These tests render the REAL simulator (no backdoors) and assert the
 * accessibility semantics a screen-reader actually consumes: accessible names,
 * aria-live regions, fieldset/legend grouping, disabled-radio LED state,
 * aria-pressed selection state, sr-only section headings, and aria-hidden on
 * decorative chrome.
 *
 * Most assertions characterize behavior that already exists and must NOT
 * regress. The aria-hidden decorative-chrome block is RED until the Task 1
 * fix lands (PowerLED / HousingEdge).
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

describe('US-048 Screen Reader Support (integration)', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('AC: sr-only accessible names on interactive controls', () => {
    it('exposes axis select buttons by accessible name', async () => {
      await renderSimulator();

      expect(screen.getByRole('button', { name: /select x axis/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select y axis/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select z axis/i })).toBeInTheDocument();
    });

    it('exposes axis zero buttons by accessible name', async () => {
      await renderSimulator();

      expect(screen.getByRole('button', { name: /zero x axis/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zero y axis/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zero z axis/i })).toBeInTheDocument();
    });

    it('exposes numeric keypad buttons by accessible name with directional hints', async () => {
      await renderSimulator();

      // Plain digits.
      expect(screen.getByRole('button', { name: /^1$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^5$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^7$/ })).toBeInTheDocument();

      // Directional arrow keys carry the hint in their accessible name.
      expect(screen.getByRole('button', { name: /8 \(up\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /2 \(down\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /4 \(left\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /6 \(right\)/i })).toBeInTheDocument();
    });

    it('exposes primary function buttons by accessible name', async () => {
      await renderSimulator();

      expect(screen.getByRole('button', { name: /^settings$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /abs\/inc/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle units/i })).toBeInTheDocument();
    });
  });

  describe('AC: aria-live axis position table', () => {
    it('renders an sr-only table labelled for axis positions', async () => {
      await renderSimulator();

      const table = screen.getByRole('table', { name: /axis positions/i });
      expect(table).toBeInTheDocument();
    });

    it('exposes each axis position cell as a polite, atomic live region', async () => {
      await renderSimulator();

      for (const axis of ['x', 'y', 'z'] as const) {
        const cell = screen.getByTestId(`axis-value-${axis}`);
        expect(cell).toHaveAttribute('aria-live', 'polite');
        expect(cell).toHaveAttribute('aria-atomic', 'true');
        // The cell is a real table cell holding the announced value.
        expect(cell.tagName).toBe('TD');
      }
    });

    it('updates the live region value when an axis is zeroed', async () => {
      const { user } = await renderSimulator();

      const xCell = screen.getByTestId('axis-value-x');
      // After zeroing X, its announced value is a formatted zero (e.g. 0.0000).
      await user.click(screen.getByRole('button', { name: /zero x axis/i }));

      expect(Number(xCell.textContent)).toBe(0);
    });

    it('keeps the visual seven-segment display hidden from screen readers', async () => {
      await renderSimulator();

      // The decorative seven-segment display duplicates the live-region value
      // and must be aria-hidden so it is not announced twice.
      for (const axis of ['x', 'y', 'z'] as const) {
        const visual = screen.getByTestId(`axis-display-${axis}`);
        expect(visual).toHaveAttribute('aria-hidden', 'true');
      }
    });
  });

  describe('AC: fieldset + legend grouping for indicators', () => {
    it('groups indicators into three labelled fieldsets', async () => {
      await renderSimulator();

      const positioning = screen.getByRole('group', { name: /positioning mode/i });
      const units = screen.getByRole('group', { name: /measurement units/i });
      const status = screen.getByRole('group', { name: /^status$/i });

      expect(positioning.tagName).toBe('FIELDSET');
      expect(units.tagName).toBe('FIELDSET');
      expect(status.tagName).toBe('FIELDSET');
    });

    it('renders the legends as the accessible group names', async () => {
      await renderSimulator();

      // getByRole('group', {name}) resolves via the <legend>; assert all three
      // are distinct groups (no duplicate-name collision).
      const groups = screen.getAllByRole('group');
      const names = groups.map((g) => within(g).queryByText(/positioning mode|measurement units|status|axis selection and zeroing/i));
      // At least the three indicator legends plus the axis-selection group.
      expect(groups.length).toBeGreaterThanOrEqual(3);
      expect(names.filter(Boolean).length).toBeGreaterThanOrEqual(3);
    });

    it('places the abs+inc radios INSIDE the positioning-mode fieldset', async () => {
      await renderSimulator();

      const positioning = screen.getByRole('group', { name: /positioning mode/i });
      // Membership: both mode radios must live within this fieldset, not merely
      // somewhere on the page. A regression relocating a radio breaks this.
      const radios = within(positioning).getAllByRole('radio', { hidden: true });
      expect(radios).toHaveLength(2);
      expect(within(positioning).getByTestId('led-abs')).toBeInTheDocument();
      expect(within(positioning).getByTestId('led-inc')).toBeInTheDocument();
    });

    it('places the inch+mm radios INSIDE the measurement-units fieldset', async () => {
      await renderSimulator();

      const units = screen.getByRole('group', { name: /measurement units/i });
      const radios = within(units).getAllByRole('radio', { hidden: true });
      expect(radios).toHaveLength(2);
      expect(within(units).getByTestId('led-inch')).toBeInTheDocument();
      expect(within(units).getByTestId('led-mm')).toBeInTheDocument();
    });
  });

  describe('AC: LED indicators as disabled radios', () => {
    it('renders mode/units/status LEDs as disabled radio inputs', async () => {
      await renderSimulator();

      const radios = screen.getAllByRole('radio', { hidden: true });
      // ABS, INC, INCH, MM, FN, SDM, PRB, SLP = 8 indicators.
      expect(radios.length).toBeGreaterThanOrEqual(8);
      radios.forEach((r) => {
        expect(r).toBeDisabled();
        expect(r.tagName).toBe('INPUT');
      });
    });

    it('reflects ABS mode as the checked positioning radio at startup', async () => {
      await renderSimulator();

      const absRadio = within(screen.getByTestId('led-abs')).getByRole('radio', { hidden: true });
      const incRadio = within(screen.getByTestId('led-inc')).getByRole('radio', { hidden: true });

      expect(absRadio).toBeChecked();
      expect(incRadio).not.toBeChecked();
    });

    it('moves the checked radio when positioning mode toggles to INC', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-abs-inc'));

      const absRadio = within(screen.getByTestId('led-abs')).getByRole('radio', { hidden: true });
      const incRadio = within(screen.getByTestId('led-inc')).getByRole('radio', { hidden: true });

      expect(absRadio).not.toBeChecked();
      expect(incRadio).toBeChecked();
    });

    it('reflects inch units as the checked units radio at startup', async () => {
      await renderSimulator();

      const inchRadio = within(screen.getByTestId('led-inch')).getByRole('radio', { hidden: true });
      const mmRadio = within(screen.getByTestId('led-mm')).getByRole('radio', { hidden: true });

      expect(inchRadio).toBeChecked();
      expect(mmRadio).not.toBeChecked();
    });

    it('moves the checked units radio when toggling to mm', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByTestId('btn-toggle-unit'));

      const inchRadio = within(screen.getByTestId('led-inch')).getByRole('radio', { hidden: true });
      const mmRadio = within(screen.getByTestId('led-mm')).getByRole('radio', { hidden: true });

      expect(inchRadio).not.toBeChecked();
      expect(mmRadio).toBeChecked();
    });
  });

  describe('AC: aria-pressed selection state on axis buttons', () => {
    it('starts with no axis pressed', async () => {
      await renderSimulator();

      for (const axis of ['x', 'y', 'z'] as const) {
        expect(screen.getByTestId(`axis-select-${axis}`)).toHaveAttribute('aria-pressed', 'false');
      }
    });

    it('sets aria-pressed=true only on the selected axis', async () => {
      const { user } = await renderSimulator();

      await user.click(screen.getByRole('button', { name: /select y axis/i }));

      expect(screen.getByTestId('axis-select-y')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('axis-select-x')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('axis-select-z')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('AC: sr-only section headings', () => {
    it('renders an sr-only heading for every major section', async () => {
      await renderSimulator();

      const expected = [
        /axis display/i,
        /axis selection/i,
        /numeric keypad/i,
        /primary functions/i,
        /secondary functions/i,
      ];

      for (const name of expected) {
        const heading = screen.getByRole('heading', { name });
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H2');
      }
    });
  });

  describe('AC: aria-hidden on decorative chrome (RED until Task 1)', () => {
    it('hides the brand logo image is NOT hidden but decorative housing edges are', async () => {
      const { container } = await renderSimulator();

      // BrandLogo must stay announced.
      const logo = screen.getByRole('img', { name: /electronica logo/i });
      expect(hasAriaHiddenAncestor(logo)).toBe(false);

      // The decorative clip-path housing edge must be pruned from the a11y tree.
      const topEdge = Array.from(
        container.querySelectorAll<HTMLElement>('div')
      ).find((d) => d.style.clipPath && d.style.clipPath.length > 0);
      expect(topEdge).toBeDefined();
      expect(hasAriaHiddenAncestor(topEdge!)).toBe(true);
    });

    it('hides the decorative PowerLED from screen readers', async () => {
      const { container } = await renderSimulator();

      const lamp = Array.from(
        container.querySelectorAll<HTMLElement>('div')
      ).find((d) => d.style.background.includes('radial-gradient'));
      expect(lamp).toBeDefined();
      expect(hasAriaHiddenAncestor(lamp!)).toBe(true);
    });
  });
});
