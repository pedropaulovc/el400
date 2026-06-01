/**
 * AC 2.6 — negative-value rendering regression.
 *
 * A negative value is shown with a leading '-'; positive values carry no sign.
 * This is verified in BOTH render paths:
 *  - the seven-segment digit row, via the pure `formatNumberValue` sign cell
 *    (the first glyph fed into SevenSegmentDigit);
 *  - the screen-reader `axis-value-*` cell, via a rendered MultiAxisSection.
 * Includes a case where the negative arises from a Direction flip of a positive
 * stored value, tying AC 2.6 to AC 2.2.
 */
import { describe, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { render, screen } from '@/tests/helpers/render-utils';
import MultiAxisSection from './MultiAxisSection';
import { formatNumberValue } from './axisDigits';
import { useDROStore } from '../stores/droStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  computeNormalDisplay,
  type DisplayState,
} from '../stores/dro/utils/displayComputation';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../types/volatileMemory';
import { DEFAULT_NON_VOLATILE_MEMORY } from '../types/nonVolatileMemory';
import { createDefaultMillState } from '../types/millState';

describe('formatNumberValue - sign cell (AC 2.6, seven-segment row)', () => {
  it('prefixes a leading minus glyph for a negative value', () => {
    expect(formatNumberValue(-3.25)[0]?.char).toBe('-');
  });

  it('prefixes a blank (no sign) for a positive value', () => {
    expect(formatNumberValue(3.25)[0]?.char).toBe(' ');
  });

  it('prefixes a blank (no sign) for zero', () => {
    expect(formatNumberValue(0)[0]?.char).toBe(' ');
  });

  it('renders the magnitude digits after the sign cell (sign is display-only)', () => {
    const neg = formatNumberValue(-3.25).map((d) => d.char).join('');
    const pos = formatNumberValue(3.25).map((d) => d.char).join('');
    // Same magnitude glyphs; only the leading sign cell differs.
    expect(neg.slice(1)).toBe(pos.slice(1));
    expect(neg[0]).toBe('-');
    expect(pos[0]).toBe(' ');
  });
});

/** Set the rendered DRO display to a known state (bypasses the reducer). */
function setDisplay(display: DisplayState): void {
  act(() => {
    useDROStore.getState()._setState({
      stateName: 'idle',
      stateData: { stateDataType: 'none' },
      vMem: INITIAL_VOLATILE_MEMORY_STATE,
      display,
    });
  });
}

describe('MultiAxisSection sr-only axis-value cell (AC 2.6)', () => {
  it('shows a leading minus for a negative value', () => {
    render(<MultiAxisSection />);
    setDisplay({ X: -3.25, Y: 0, Z: 0 });
    expect(screen.getByTestId('axis-value-x')).toHaveTextContent('-3.2500');
  });

  it('shows no sign for a positive value', () => {
    render(<MultiAxisSection />);
    setDisplay({ X: 3.25, Y: 0, Z: 0 });
    const cell = screen.getByTestId('axis-value-x');
    expect(cell).toHaveTextContent('3.2500');
    expect(cell.textContent.startsWith('-')).toBe(false);
  });
});

describe('Angular DMS rendering on the seven-segment row (US-040 AC 40.3)', () => {
  it('renders the angular axis DMS string verbatim in the screen-reader cell', () => {
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      countingMode: { X: 'angular' as const, Y: 'linear' as const, Z: 'linear' as const },
    };
    act(() => {
      useSettingsStore.setState({ nvMem });
    });
    render(<MultiAxisSection />);
    // The reducer emits the pre-formatted DMS string for an angular axis; the
    // dP decimals must NOT re-pad "90.00" to "90.0000".
    setDisplay({ X: '90.00', Y: 0, Z: 0 });
    const cell = screen.getByTestId('axis-value-x');
    expect(cell).toHaveTextContent('90.00');
    expect(cell.textContent).not.toContain('0000');
  });

  it('renders a dd.mn.SS angular value with both group separators verbatim', () => {
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      countingMode: { X: 'angular' as const, Y: 'linear' as const, Z: 'linear' as const },
    };
    act(() => {
      useSettingsStore.setState({ nvMem });
    });
    render(<MultiAxisSection />);
    setDisplay({ X: '12.30.00', Y: 0, Z: 0 });
    expect(screen.getByTestId('axis-value-x')).toHaveTextContent('12.30.00');
  });
});

describe('AC 2.6 ties to AC 2.2 — negative produced by a Direction flip', () => {
  it('a reversed-X positive position renders a leading minus in both paths', () => {
    // Positive stored X (10mm) with axisDirection.X='reversed' yields a negative
    // displayed value -> AC 2.6 sign must appear (this is how AC 2.2 surfaces).
    const nvMem = {
      ...DEFAULT_NON_VOLATILE_MEMORY,
      defaultUnit: 'mm' as const,
      axisDirection: { X: 'reversed' as const, Y: 'normal' as const, Z: 'normal' as const },
    };
    const vMem = {
      ...INITIAL_VOLATILE_MEMORY_STATE,
      mode: 'abs' as const,
      manualAbsoluteValues: { X: 10, Y: 0, Z: 0 },
    };
    const display = computeNormalDisplay(vMem, {
      millState: createDefaultMillState('noop'),
      nvMem,
    });
    expect(display.X).toBe(-10);

    // Seven-segment row: leading minus glyph.
    expect(formatNumberValue(display.X as number)[0]?.char).toBe('-');

    // Screen-reader cell: leading minus text.
    render(<MultiAxisSection />);
    setDisplay(display);
    expect(screen.getByTestId('axis-value-x')).toHaveTextContent('-10.0000');
  });
});
