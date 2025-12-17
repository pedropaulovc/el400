import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureNumberValue,
} from '../tests/helpers/integration-test-utils';

describe('EL400Simulator Keyboard Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  // Helper to focus the simulator container
  const focusSimulator = () => {
    // The simulator container has focus:outline-none and tabIndex={0}
    const container = document.querySelector('[tabindex="0"]');
    if (container instanceof HTMLElement) {
      container.focus();
    }
    return container;
  };

  describe('Axis Selection via Keyboard', () => {
    it('selects X axis when X key is pressed', async () => {
      renderSimulator();
      const container = focusSimulator();
      expect(container).not.toBeNull();

      fireEvent.keyDown(container!, { code: 'KeyX' });

      const xButton = screen.getByTestId('axis-select-x');
      expect(xButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('selects Y axis when Y key is pressed', async () => {
      renderSimulator();
      const container = focusSimulator();

      fireEvent.keyDown(container!, { code: 'KeyY' });

      const yButton = screen.getByTestId('axis-select-y');
      expect(yButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('selects Z axis when Z key is pressed', async () => {
      renderSimulator();
      const container = focusSimulator();

      fireEvent.keyDown(container!, { code: 'KeyZ' });

      const zButton = screen.getByTestId('axis-select-z');
      expect(zButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Value Entry via Keyboard', () => {
    it('enters a value using numpad keys', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Select X axis
      fireEvent.keyDown(container!, { code: 'KeyX' });

      // Enter 12.5
      fireEvent.keyDown(container!, { code: 'Numpad1' });
      fireEvent.keyDown(container!, { code: 'Numpad2' });
      fireEvent.keyDown(container!, { code: 'NumpadDecimal' });
      fireEvent.keyDown(container!, { code: 'Numpad5' });
      fireEvent.keyDown(container!, { code: 'NumpadEnter' });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(12.5, 4);
    });

    it('enters a negative value using minus key', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Select Y axis
      fireEvent.keyDown(container!, { code: 'KeyY' });

      // Enter -25.5
      fireEvent.keyDown(container!, { code: 'Minus' });
      fireEvent.keyDown(container!, { code: 'Digit2' });
      fireEvent.keyDown(container!, { code: 'Digit5' });
      fireEvent.keyDown(container!, { code: 'Period' });
      fireEvent.keyDown(container!, { code: 'Digit5' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(-25.5, 4);
    });

    it('clears input buffer with Escape key', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Select X axis and set a value
      fireEvent.keyDown(container!, { code: 'KeyX' });
      fireEvent.keyDown(container!, { code: 'Numpad5' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);

      // Try to enter a new value
      fireEvent.keyDown(container!, { code: 'Numpad9' });
      fireEvent.keyDown(container!, { code: 'Numpad9' });

      // Clear with Escape
      fireEvent.keyDown(container!, { code: 'Escape' });

      // Press Enter (should do nothing since buffer is empty)
      fireEvent.keyDown(container!, { code: 'Enter' });

      // Value should remain 50
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);
    });

    it('clears input buffer with Backspace key', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Select Z axis and set a value
      fireEvent.keyDown(container!, { code: 'KeyZ' });
      fireEvent.keyDown(container!, { code: 'Numpad3' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(30, 4);

      // Try to enter a new value
      fireEvent.keyDown(container!, { code: 'Numpad1' });
      fireEvent.keyDown(container!, { code: 'Numpad1' });

      // Clear with Backspace
      fireEvent.keyDown(container!, { code: 'Backspace' });

      // Press Enter
      fireEvent.keyDown(container!, { code: 'Enter' });

      // Value should remain 30
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(30, 4);
    });
  });

  describe('Axis Zeroing via Keyboard', () => {
    it('zeros X axis with Shift+X', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Set X to a value
      fireEvent.keyDown(container!, { code: 'KeyX' });
      fireEvent.keyDown(container!, { code: 'Numpad5' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);

      // Zero with Shift+X
      fireEvent.keyDown(container!, { code: 'KeyX', shiftKey: true });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    });

    it('zeros Y axis with Shift+Y', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Set Y to a value
      fireEvent.keyDown(container!, { code: 'KeyY' });
      fireEvent.keyDown(container!, { code: 'Numpad2' });
      fireEvent.keyDown(container!, { code: 'Numpad5' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(25, 4);

      // Zero with Shift+Y
      fireEvent.keyDown(container!, { code: 'KeyY', shiftKey: true });

      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
    });

    it('zeros Z axis with Shift+Z', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Set Z to a value
      fireEvent.keyDown(container!, { code: 'KeyZ' });
      fireEvent.keyDown(container!, { code: 'Numpad1' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(10, 4);

      // Zero with Shift+Z
      fireEvent.keyDown(container!, { code: 'KeyZ', shiftKey: true });

      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
    });

    it('zeros all axes with Shift+0', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Set all axes to values
      fireEvent.keyDown(container!, { code: 'KeyX' });
      fireEvent.keyDown(container!, { code: 'Numpad1' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      fireEvent.keyDown(container!, { code: 'KeyY' });
      fireEvent.keyDown(container!, { code: 'Numpad2' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      fireEvent.keyDown(container!, { code: 'KeyZ' });
      fireEvent.keyDown(container!, { code: 'Numpad3' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(10, 4);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(20, 4);
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(30, 4);

      // Zero all with Shift+0
      fireEvent.keyDown(container!, { code: 'Digit0', shiftKey: true });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(0, 4);
      expect(getAxisDisplayPureNumberValue('Z')).toBeCloseTo(0, 4);
    });
  });

  describe('Mode Toggle via Keyboard', () => {
    it('toggles ABS/INC mode with A key', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Check initial mode is ABS
      const absLed = screen.getByTestId('led-abs');
      expect(absLed.querySelector('input')).toBeChecked();

      // Toggle to INC
      fireEvent.keyDown(container!, { code: 'KeyA' });

      const incLed = screen.getByTestId('led-inc');
      expect(incLed.querySelector('input')).toBeChecked();

      // Toggle back to ABS
      fireEvent.keyDown(container!, { code: 'KeyA' });

      expect(absLed.querySelector('input')).toBeChecked();
    });
  });

  describe('Combined Mouse and Keyboard Input', () => {
    it('works with mouse axis selection and keyboard value entry', async () => {
      const user = userEvent.setup();
      renderSimulator();
      const container = focusSimulator();

      // Select axis with mouse
      await user.click(screen.getByTestId('axis-select-x'));

      // Enter value with keyboard
      fireEvent.keyDown(container!, { code: 'Numpad7' });
      fireEvent.keyDown(container!, { code: 'Numpad5' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(75, 4);
    });

    it('works with keyboard axis selection and mouse value entry', async () => {
      const user = userEvent.setup();
      renderSimulator();
      const container = focusSimulator();

      // Select axis with keyboard
      fireEvent.keyDown(container!, { code: 'KeyY' });

      // Enter value with mouse clicks
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-3'));
      await user.click(screen.getByTestId('key-enter'));

      expect(getAxisDisplayPureNumberValue('Y')).toBeCloseTo(33, 4);
    });
  });

  describe('Function Keys', () => {
    it('opens calculator with K key', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Press K to open calculator
      fireEvent.keyDown(container!, { code: 'KeyK' });

      // Verify calculator mode by checking for operation display
      // The X display should show 0 (calculator initial value)
      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(0, 4);
    });

    it('half function works with H key when axis selected', async () => {
      renderSimulator();
      const container = focusSimulator();

      // Set X to 100
      fireEvent.keyDown(container!, { code: 'KeyX' });
      fireEvent.keyDown(container!, { code: 'Numpad1' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Numpad0' });
      fireEvent.keyDown(container!, { code: 'Enter' });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(100, 4);

      // Half with H key
      fireEvent.keyDown(container!, { code: 'KeyH' });

      expect(getAxisDisplayPureNumberValue('X')).toBeCloseTo(50, 4);
    });
  });

  describe('Browser Default Prevention', () => {
    it('prevents default for handled keys', () => {
      renderSimulator();
      const container = focusSimulator();

      const event = new KeyboardEvent('keydown', {
        code: 'Backspace',
        bubbles: true,
        cancelable: true,
      });

      // Mock preventDefault
      const preventDefaultMock = vi.fn();
      Object.defineProperty(event, 'preventDefault', {
        value: preventDefaultMock,
      });

      container!.dispatchEvent(event);

      // preventDefault should have been called
      expect(preventDefaultMock).toHaveBeenCalled();
    });
  });
});
