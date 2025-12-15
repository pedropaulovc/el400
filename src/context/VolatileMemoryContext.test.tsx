import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  VolatileMemoryProvider,
  useVolatileMemoryContext,
  BOOT_MESSAGE_DURATION_MS,
} from './VolatileMemoryContext';
import { NonVolatileMemoryProvider } from './NonVolatileMemoryContext';
import { MockAdapter } from '../adapters/MockAdapter';

// Wrapper with both providers (NonVolatileMemory required by VolatileMemory)
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NonVolatileMemoryProvider>
        <VolatileMemoryProvider>{children}</VolatileMemoryProvider>
      </NonVolatileMemoryProvider>
    );
  };
}

function createWrapperWithAdapter(adapter: MockAdapter) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NonVolatileMemoryProvider>
        <VolatileMemoryProvider initialAdapter={adapter}>
          {children}
        </VolatileMemoryProvider>
      </NonVolatileMemoryProvider>
    );
  };
}

describe('VolatileMemoryContext', () => {
  describe('Context hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useVolatileMemoryContext());
      }).toThrow('useVolatileMemoryContext must be used within a VolatileMemoryProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Default state', () => {
    it('starts in ABS mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe('abs');
    });

    it('starts with no active axis', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.activeAxis).toBeNull();
    });

    it('starts disconnected in manual mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.connected).toBe(false);
      expect(result.current.controllerType).toBe('manual');
    });

    it('starts with zero display values', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.displayValues).toEqual({ X: 0, Y: 0, Z: 0 });
    });

    it('starts with zero absolute and incremental values', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.absolute).toEqual({ X: 0, Y: 0, Z: 0 });
      expect(result.current.incremental).toEqual({ X: 0, Y: 0, Z: 0 });
    });
  });

  describe('Mode switching', () => {
    it('toggles from ABS to INC mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleMode();
      });

      expect(result.current.mode).toBe('inc');
    });

    it('toggles from INC back to ABS mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleMode();
        result.current.toggleMode();
      });

      expect(result.current.mode).toBe('abs');
    });

    it('setMode sets specific mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('inc');
      });

      expect(result.current.mode).toBe('inc');

      act(() => {
        result.current.setMode('abs');
      });

      expect(result.current.mode).toBe('abs');
    });
  });

  describe('Axis selection', () => {
    it('selects X axis', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.selectAxis('X');
      });

      expect(result.current.activeAxis).toBe('X');
    });

    it('selects Y axis', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.selectAxis('Y');
      });

      expect(result.current.activeAxis).toBe('Y');
    });

    it('selects Z axis', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.selectAxis('Z');
      });

      expect(result.current.activeAxis).toBe('Z');
    });

    it('deselects axis when set to null', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.selectAxis('X');
        result.current.selectAxis(null);
      });

      expect(result.current.activeAxis).toBeNull();
    });

    it('changes selection between axes', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.selectAxis('X');
      });
      expect(result.current.activeAxis).toBe('X');

      act(() => {
        result.current.selectAxis('Y');
      });
      expect(result.current.activeAxis).toBe('Y');
    });
  });

  describe('Zeroing axes in ABS mode (manual)', () => {
    it('zeros X axis value', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      // Set a value first (value is converted from inch to mm internally)
      act(() => {
        result.current.setAxisValue('X', 100);
      });
      expect(result.current.absolute.X).not.toBe(0);

      // Zero it
      act(() => {
        result.current.zeroAxis('X');
      });

      expect(result.current.absolute.X).toBe(0);
      expect(result.current.displayValues.X).toBe(0);
    });

    it('zeros Y axis without affecting other axes', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('X', 100);
        result.current.setAxisValue('Y', 200);
        result.current.setAxisValue('Z', 300);
      });

      const xBefore = result.current.absolute.X;
      const zBefore = result.current.absolute.Z;

      act(() => {
        result.current.zeroAxis('Y');
      });

      expect(result.current.absolute.X).toBe(xBefore);
      expect(result.current.absolute.Y).toBe(0);
      expect(result.current.absolute.Z).toBe(zBefore);
    });

    it('zeros all axes', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('X', 100);
        result.current.setAxisValue('Y', 200);
        result.current.setAxisValue('Z', 300);
      });

      act(() => {
        result.current.zeroAll();
      });

      expect(result.current.absolute).toEqual({ X: 0, Y: 0, Z: 0 });
    });
  });

  describe('Zeroing axes in INC mode', () => {
    it('zeros X axis incremental value', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('inc');
      });
      act(() => {
        result.current.setAxisValue('X', 50);
      });
      expect(result.current.incremental.X).not.toBe(0);

      act(() => {
        result.current.zeroAxis('X');
      });

      expect(result.current.incremental.X).toBe(0);
    });

    it('zeros INC without affecting ABS values', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      // Set ABS values
      act(() => {
        result.current.setAxisValue('X', 100);
      });
      const absValue = result.current.absolute.X;

      // Switch to INC and set value
      act(() => {
        result.current.setMode('inc');
      });
      act(() => {
        result.current.setAxisValue('X', 50);
      });

      // Zero INC
      act(() => {
        result.current.zeroAxis('X');
      });

      // Check INC is zeroed but ABS is unchanged
      expect(result.current.incremental.X).toBe(0);
      expect(result.current.absolute.X).toBe(absValue);
    });

    it('zeros all incremental values', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('inc');
        result.current.setAxisValue('X', 10);
        result.current.setAxisValue('Y', 20);
        result.current.setAxisValue('Z', 30);
      });

      act(() => {
        result.current.zeroAll();
      });

      expect(result.current.incremental).toEqual({ X: 0, Y: 0, Z: 0 });
    });
  });

  describe('Setting axis values', () => {
    it('sets X axis value in ABS mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('X', 123.456);
      });

      // Value is stored in mm (converted from inch)
      expect(result.current.absolute.X).toBeGreaterThan(0);
    });

    it('sets negative values', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('Y', -50.5);
      });

      expect(result.current.absolute.Y).toBeLessThan(0);
    });

    it('sets axis value in INC mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('inc');
      });
      act(() => {
        result.current.setAxisValue('Z', 75.25);
      });

      expect(result.current.incremental.Z).toBeGreaterThan(0);
    });
  });

  describe('Half axis function', () => {
    it('halves X axis value in ABS mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('X', 100);
      });
      const valueBefore = result.current.absolute.X;

      act(() => {
        result.current.halfAxis('X');
      });

      expect(result.current.absolute.X).toBeCloseTo(valueBefore / 2);
    });

    it('halves negative values correctly', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('Y', -80);
      });
      const valueBefore = result.current.absolute.Y;

      act(() => {
        result.current.halfAxis('Y');
      });

      expect(result.current.absolute.Y).toBeCloseTo(valueBefore / 2);
    });

    it('halves axis value in INC mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('inc');
        result.current.setAxisValue('Z', 60);
      });
      const valueBefore = result.current.incremental.Z;

      act(() => {
        result.current.halfAxis('Z');
      });

      expect(result.current.incremental.Z).toBeCloseTo(valueBefore / 2);
    });

    it('can be applied multiple times', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('X', 100);
      });
      const valueBefore = result.current.absolute.X;

      act(() => {
        result.current.halfAxis('X');
      });
      act(() => {
        result.current.halfAxis('X');
      });

      expect(result.current.absolute.X).toBeCloseTo(valueBefore / 4);
    });
  });

  describe('Display values', () => {
    it('shows ABS values when in ABS mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAxisValue('X', 100);
      });

      expect(result.current.mode).toBe('abs');
      expect(result.current.displayValues.X).toBe(result.current.absolute.X);
    });

    it('shows INC values when in INC mode', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('inc');
        result.current.setAxisValue('X', 50);
      });

      expect(result.current.mode).toBe('inc');
      expect(result.current.displayValues.X).toBe(result.current.incremental.X);
    });

    it('switches display when mode changes', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      // Set different values in each mode
      act(() => {
        result.current.setAxisValue('X', 100); // ABS mode
        result.current.setMode('inc');
        result.current.setAxisValue('X', 50); // INC mode
      });

      const incValue = result.current.incremental.X;
      expect(result.current.displayValues.X).toBe(incValue);

      act(() => {
        result.current.setMode('abs');
      });

      const absValue = result.current.absolute.X;
      expect(result.current.displayValues.X).toBe(absValue);
    });
  });

  describe('Adapter management', () => {
    let adapter: MockAdapter;

    beforeEach(() => {
      adapter = new MockAdapter();
    });

    it('connects with initial adapter', async () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(result.current.controllerType).toBe('mock');
    });

    it('receives position updates from adapter', async () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      act(() => {
        adapter.setPosition(10, 20, 30);
      });

      await waitFor(() => {
        expect(result.current.machinePosition.x).toBe(10);
        expect(result.current.machinePosition.y).toBe(20);
        expect(result.current.machinePosition.z).toBe(30);
      });
    });

    it('calculates absolute values with work offsets', async () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Set machine to position 100
      act(() => {
        adapter.setPosition(100, 100, 100);
      });

      await waitFor(() => {
        expect(result.current.machinePosition.x).toBe(100);
      });

      // Zero the axis (creates work offset)
      act(() => {
        result.current.zeroAxis('X');
      });

      // Display should be 0, work offset should be 100
      expect(result.current.displayValues.X).toBe(0);
      expect(result.current.workOffsets.X).toBe(100);

      // Move machine to 150
      act(() => {
        adapter.setPosition(150, 100, 100);
      });

      await waitFor(() => {
        expect(result.current.machinePosition.x).toBe(150);
      });

      // Display should be 50 (150 - 100 offset)
      expect(result.current.displayValues.X).toBe(50);
    });

    it('exposes adapter via setAdapter', async () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.adapter).toBeNull();

      act(() => {
        result.current.setAdapter(adapter);
      });

      await waitFor(() => {
        expect(result.current.adapter).toBe(adapter);
      });
    });

    it('setAxisValue adjusts work offset when connected', async () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Set machine to position 100
      act(() => {
        adapter.setPosition(100, 200, 300);
      });

      await waitFor(() => {
        expect(result.current.machinePosition.x).toBe(100);
      });

      // Set X axis value to 50 (should create offset of 100 - 50*25.4 in mm)
      // Since we're in inch mode by default, 50 inches = 1270 mm
      // offset = machinePos - valueMm = 100 - 1270 = -1170
      act(() => {
        result.current.setAxisValue('X', 50);
      });

      // The work offset should be adjusted so display shows the set value
      expect(result.current.workOffsets.X).toBe(100 - 50 * 25.4);

      // Set Y axis value (tests Y branch)
      act(() => {
        result.current.setAxisValue('Y', 25);
      });
      expect(result.current.workOffsets.Y).toBe(200 - 25 * 25.4);

      // Set Z axis value (tests Z branch)
      act(() => {
        result.current.setAxisValue('Z', 10);
      });
      expect(result.current.workOffsets.Z).toBe(300 - 10 * 25.4);
    });

    it('halfAxis adjusts work offset when connected', async () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapperWithAdapter(adapter),
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Set machine to position 100
      act(() => {
        adapter.setPosition(100, 200, 300);
      });

      await waitFor(() => {
        expect(result.current.machinePosition.x).toBe(100);
      });

      // Current display value is 100 (machine pos - 0 offset)
      // Halving should adjust offset so display shows 50
      // New offset = machinePos - halfValue = 100 - 50 = 50
      act(() => {
        result.current.halfAxis('X');
      });

      expect(result.current.workOffsets.X).toBe(50);
      expect(result.current.displayValues.X).toBe(50);

      // Test Y axis (200 -> 100)
      act(() => {
        result.current.halfAxis('Y');
      });
      expect(result.current.workOffsets.Y).toBe(100);
      expect(result.current.displayValues.Y).toBe(100);

      // Test Z axis (300 -> 150)
      act(() => {
        result.current.halfAxis('Z');
      });
      expect(result.current.workOffsets.Z).toBe(150);
      expect(result.current.displayValues.Z).toBe(150);
    });
  });

  describe('Boot sequence state machine', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('transitions to showMessage when bootMessageMode is show (default)', async () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      // Should transition from boot to showMessage
      expect(result.current.bootStage).toBe('showMessage');
    });

    it('transitions to run when bootMessageMode is skip', async () => {
      localStorage.setItem('el400-dro-non-volatile-memory', JSON.stringify({
        bootMessageMode: 'skip',
      }));

      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      // Should transition from boot to run
      expect(result.current.bootStage).toBe('run');
    });

    it('URL param bootMessageMode=skip overrides localStorage show setting', async () => {
      // Set localStorage to 'show'
      localStorage.setItem('el400-dro-non-volatile-memory', JSON.stringify({
        bootMessageMode: 'show',
      }));

      // Mock URL param to 'skip'
      const originalSearch = window.location.search;
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search: '?bootMessageMode=skip' },
        writable: true,
      });

      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      // URL param should override localStorage - should skip to run
      expect(result.current.bootStage).toBe('run');

      // Restore
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search: originalSearch },
        writable: true,
      });
    });

    it('transitions from showMessage to run after timeout', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.bootStage).toBe('showMessage');

      act(() => {
        vi.advanceTimersByTime(BOOT_MESSAGE_DURATION_MS);
      });

      expect(result.current.bootStage).toBe('run');

      vi.useRealTimers();
    });

    it('allows manual dismissal from showMessage stage', () => {
      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.bootStage).toBe('showMessage');

      act(() => {
        result.current.clearKeyPressed();
      });

      expect(result.current.bootStage).toBe('run');
    });

    it('does nothing when clearKeyPressed called in run stage', () => {
      localStorage.setItem('el400-dro-non-volatile-memory', JSON.stringify({
        bootMessageMode: 'skip',
      }));

      const { result } = renderHook(() => useVolatileMemoryContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.bootStage).toBe('run');

      act(() => {
        result.current.clearKeyPressed();
      });

      expect(result.current.bootStage).toBe('run');
    });
  });
});
