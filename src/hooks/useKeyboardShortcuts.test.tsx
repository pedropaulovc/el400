import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NonVolatileMemoryProvider } from '../context/NonVolatileMemoryContext';
import { MillStateProvider } from '../context/MillStateContext';
import { VolatileMemoryProvider } from '../context/VolatileMemoryContext';
import { InputBufferProvider, useInputBufferContext } from '../context/InputBufferContext';
import { DROProvider } from '../dro-state-machine';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useVolatileMemory } from './useVolatileMemory';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../types/nonVolatileMemory';

// Mock audio
vi.mock('../utils/audio', () => ({
  playClickSound: vi.fn().mockResolvedValue(undefined),
}));

// Test component that uses the keyboard shortcuts hook
function TestComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vMem = useVolatileMemory();
  const inputBuffer = useInputBufferContext();
  useKeyboardShortcuts(containerRef);

  return (
    <div ref={containerRef} tabIndex={0} data-testid="container">
      <div data-testid="active-axis">{vMem.activeAxis ?? 'none'}</div>
      <div data-testid="mode">{vMem.mode}</div>
      <div data-testid="display-x">{vMem.displayValues.X}</div>
      <div data-testid="display-y">{vMem.displayValues.Y}</div>
      <div data-testid="display-z">{vMem.displayValues.Z}</div>
      <div data-testid="input-buffer">{inputBuffer.buffer}</div>
    </div>
  );
}

function renderTestComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NonVolatileMemoryProvider>
          <MillStateProvider>
            <VolatileMemoryProvider>
              <InputBufferProvider>
                <DROProvider>
                  <TestComponent />
                </DROProvider>
              </InputBufferProvider>
            </VolatileMemoryProvider>
          </MillStateProvider>
        </NonVolatileMemoryProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Skip boot message for faster tests
    localStorage.setItem(NON_VOLATILE_MEMORY_STORAGE_KEY, JSON.stringify({
      bootMessageMode: 'skip',
      defaultUnit: 'inch',
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Axis Selection', () => {
    it('selects X axis when X key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      fireEvent.keyDown(container, { code: 'KeyX' });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('X');
    });

    it('selects Y axis when Y key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      fireEvent.keyDown(container, { code: 'KeyY' });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('Y');
    });

    it('selects Z axis when Z key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      fireEvent.keyDown(container, { code: 'KeyZ' });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('Z');
    });
  });

  describe('Mode Toggle', () => {
    it('toggles ABS/INC mode when A key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      expect(screen.getByTestId('mode')).toHaveTextContent('abs');

      fireEvent.keyDown(container, { code: 'KeyA' });

      expect(screen.getByTestId('mode')).toHaveTextContent('inc');

      fireEvent.keyDown(container, { code: 'KeyA' });

      expect(screen.getByTestId('mode')).toHaveTextContent('abs');
    });
  });

  describe('Digit Input', () => {
    it('appends digits to input buffer when numpad keys are pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Select an axis first
      fireEvent.keyDown(container, { code: 'KeyX' });

      // Enter digits
      fireEvent.keyDown(container, { code: 'Numpad1' });
      fireEvent.keyDown(container, { code: 'Numpad2' });
      fireEvent.keyDown(container, { code: 'Numpad3' });

      expect(screen.getByTestId('input-buffer')).toHaveTextContent('123');
    });

    it('appends digits to input buffer when top row digit keys are pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Select an axis first
      fireEvent.keyDown(container, { code: 'KeyX' });

      // Enter digits
      fireEvent.keyDown(container, { code: 'Digit4' });
      fireEvent.keyDown(container, { code: 'Digit5' });
      fireEvent.keyDown(container, { code: 'Digit6' });

      expect(screen.getByTestId('input-buffer')).toHaveTextContent('456');
    });

    it('appends decimal point when Period key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Select an axis first
      fireEvent.keyDown(container, { code: 'KeyX' });

      // Enter digits with decimal
      fireEvent.keyDown(container, { code: 'Numpad1' });
      fireEvent.keyDown(container, { code: 'Period' });
      fireEvent.keyDown(container, { code: 'Numpad5' });

      expect(screen.getByTestId('input-buffer')).toHaveTextContent('1.5');
    });

    it('toggles sign when Minus key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Select an axis first
      fireEvent.keyDown(container, { code: 'KeyX' });

      // Enter digits
      fireEvent.keyDown(container, { code: 'Numpad1' });
      fireEvent.keyDown(container, { code: 'Numpad2' });

      // Toggle sign
      fireEvent.keyDown(container, { code: 'Minus' });

      expect(screen.getByTestId('input-buffer')).toHaveTextContent('-12');
    });

    it('clears input buffer when Escape key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Select an axis first
      fireEvent.keyDown(container, { code: 'KeyX' });

      // Enter digits
      fireEvent.keyDown(container, { code: 'Numpad1' });
      fireEvent.keyDown(container, { code: 'Numpad2' });
      fireEvent.keyDown(container, { code: 'Numpad3' });

      expect(screen.getByTestId('input-buffer')).toHaveTextContent('123');

      // Clear
      fireEvent.keyDown(container, { code: 'Escape' });

      expect(screen.getByTestId('input-buffer')).toHaveTextContent('');
    });

    it('does not accept digits when no axis is selected', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Try to enter digits without selecting axis
      fireEvent.keyDown(container, { code: 'Numpad1' });
      fireEvent.keyDown(container, { code: 'Numpad2' });

      expect(screen.getByTestId('input-buffer')).toHaveTextContent('');
    });
  });

  describe('Value Entry', () => {
    it('sets axis value when Enter key is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Select X axis
      fireEvent.keyDown(container, { code: 'KeyX' });

      // Enter value
      fireEvent.keyDown(container, { code: 'Numpad5' });
      fireEvent.keyDown(container, { code: 'Numpad0' });

      // Press Enter
      fireEvent.keyDown(container, { code: 'Enter' });

      // Check X display value (should be 50 in inches = 1270mm internally)
      expect(screen.getByTestId('display-x')).toHaveTextContent('1270');
    });
  });

  describe('Axis Zeroing', () => {
    it('zeros X axis when Shift+X is pressed', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Set a value first
      fireEvent.keyDown(container, { code: 'KeyX' });
      fireEvent.keyDown(container, { code: 'Numpad5' });
      fireEvent.keyDown(container, { code: 'Enter' });

      // Zero with Shift+X
      fireEvent.keyDown(container, { code: 'KeyX', shiftKey: true });

      expect(screen.getByTestId('display-x')).toHaveTextContent('0');
    });
  });

  describe('Focus Behavior', () => {
    it('does not handle keys when container is not focused', () => {
      renderTestComponent();

      // Don't focus the container - just verify it exists
      expect(screen.getByTestId('container')).toBeInTheDocument();

      fireEvent.keyDown(document, { code: 'KeyX' });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('none');
    });

    it('handles keys when container is focused', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      fireEvent.keyDown(container, { code: 'KeyX' });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('X');
    });
  });

  describe('Modifier Keys', () => {
    it('does not trigger shortcuts when Ctrl is held', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      // Ctrl+X should not select axis (common cut shortcut)
      fireEvent.keyDown(container, { code: 'KeyX', ctrlKey: true });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('none');
    });

    it('does not trigger shortcuts when Alt is held', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      fireEvent.keyDown(container, { code: 'KeyX', altKey: true });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('none');
    });

    it('does not trigger shortcuts when Meta is held', () => {
      renderTestComponent();

      const container = screen.getByTestId('container');
      container.focus();

      fireEvent.keyDown(container, { code: 'KeyX', metaKey: true });

      expect(screen.getByTestId('active-axis')).toHaveTextContent('none');
    });
  });
});
