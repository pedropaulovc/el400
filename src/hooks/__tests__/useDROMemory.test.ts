import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDROMemory } from '../useDROMemory';
import type { MachineState } from '../../types/machine';
import { createDefaultMachineState } from '../../types/machine';

describe('useDROMemory', () => {
  const createConnectedMachineState = (
    x: number,
    y: number,
    z: number
  ): MachineState => ({
    ...createDefaultMachineState('mock'),
    position: { x, y, z },
    connected: true,
  });

  describe('initialization', () => {
    it('should initialize with ABS mode', () => {
      const { result } = renderHook(() => useDROMemory(null));

      expect(result.current.mode).toBe('abs');
    });

    it('should initialize with zero values', () => {
      const { result } = renderHook(() => useDROMemory(null));

      expect(result.current.displayValues).toEqual({ X: 0, Y: 0, Z: 0 });
      expect(result.current.absolute).toEqual({ X: 0, Y: 0, Z: 0 });
      expect(result.current.incremental).toEqual({ X: 0, Y: 0, Z: 0 });
    });
  });

  describe('mode switching', () => {
    it('should toggle between ABS and INC modes', () => {
      const { result } = renderHook(() => useDROMemory(null));

      expect(result.current.mode).toBe('abs');

      act(() => {
        result.current.toggleMode();
      });
      expect(result.current.mode).toBe('inc');

      act(() => {
        result.current.toggleMode();
      });
      expect(result.current.mode).toBe('abs');
    });

    it('should set specific mode', () => {
      const { result } = renderHook(() => useDROMemory(null));

      act(() => {
        result.current.setMode('inc');
      });
      expect(result.current.mode).toBe('inc');

      act(() => {
        result.current.setMode('abs');
      });
      expect(result.current.mode).toBe('abs');
    });

    it('should return correct displayValues based on mode', () => {
      const { result } = renderHook(() => useDROMemory(null));

      // Set ABS value
      act(() => {
        result.current.setAxisValue('X', 10);
      });

      // Switch to INC mode
      act(() => {
        result.current.setMode('inc');
      });

      // Set INC value
      act(() => {
        result.current.setAxisValue('X', 5);
      });

      // Check INC mode displays incremental value
      expect(result.current.displayValues.X).toBe(5);

      // Switch to ABS mode - should display absolute value
      act(() => {
        result.current.setMode('abs');
      });
      expect(result.current.displayValues.X).toBe(10);
    });
  });

  describe('track separate ABS and INC values', () => {
    it('should maintain separate ABS and INC values', () => {
      const { result } = renderHook(() => useDROMemory(null));

      // Set absolute values
      act(() => {
        result.current.setAxisValue('X', 100);
        result.current.setAxisValue('Y', 200);
        result.current.setAxisValue('Z', 300);
      });

      // Switch to INC mode
      act(() => {
        result.current.setMode('inc');
      });

      // Set incremental values
      act(() => {
        result.current.setAxisValue('X', 10);
        result.current.setAxisValue('Y', 20);
        result.current.setAxisValue('Z', 30);
      });

      expect(result.current.incremental).toEqual({ X: 10, Y: 20, Z: 30 });

      // Switch back to ABS - should still have original values
      act(() => {
        result.current.setMode('abs');
      });
      expect(result.current.absolute).toEqual({ X: 100, Y: 200, Z: 300 });
    });
  });

  describe('zero axis', () => {
    it('should zero single axis in current mode (ABS)', () => {
      const { result } = renderHook(() => useDROMemory(null));

      act(() => {
        result.current.setAxisValue('X', 100);
        result.current.setAxisValue('Y', 200);
      });

      act(() => {
        result.current.zeroAxis('X');
      });

      expect(result.current.absolute.X).toBe(0);
      expect(result.current.absolute.Y).toBe(200);
    });

    it('should zero single axis in current mode (INC)', () => {
      const { result } = renderHook(() => useDROMemory(null));

      // Switch to INC mode
      act(() => {
        result.current.setMode('inc');
      });

      // Set values
      act(() => {
        result.current.setAxisValue('X', 100);
        result.current.setAxisValue('Y', 200);
      });

      // Zero X
      act(() => {
        result.current.zeroAxis('X');
      });

      expect(result.current.incremental.X).toBe(0);
      expect(result.current.incremental.Y).toBe(200);
    });

    it('should zero all axes in current mode', () => {
      const { result } = renderHook(() => useDROMemory(null));

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

    it('should preserve other mode values when zeroing', () => {
      const { result } = renderHook(() => useDROMemory(null));

      // Set ABS value
      act(() => {
        result.current.setAxisValue('X', 100);
      });

      // Switch to INC mode
      act(() => {
        result.current.setMode('inc');
      });

      // Set INC value
      act(() => {
        result.current.setAxisValue('X', 50);
      });

      // Zero INC mode
      act(() => {
        result.current.zeroAll();
      });

      expect(result.current.incremental).toEqual({ X: 0, Y: 0, Z: 0 });

      // ABS values should be preserved
      act(() => {
        result.current.setMode('abs');
      });
      expect(result.current.absolute.X).toBe(100);
    });
  });

  describe('with external machine state', () => {
    it('should use machine position for ABS values when connected', () => {
      const machineState = createConnectedMachineState(10, 20, 30);
      const { result } = renderHook(() => useDROMemory(machineState));

      expect(result.current.absolute).toEqual({ X: 10, Y: 20, Z: 30 });
      expect(result.current.displayValues).toEqual({ X: 10, Y: 20, Z: 30 });
    });

    it('should update ABS values when machine state changes', () => {
      let machineState = createConnectedMachineState(10, 20, 30);
      const { result, rerender } = renderHook(
        ({ state }) => useDROMemory(state),
        { initialProps: { state: machineState } }
      );

      expect(result.current.absolute).toEqual({ X: 10, Y: 20, Z: 30 });

      // Update machine position
      machineState = createConnectedMachineState(15, 25, 35);
      rerender({ state: machineState });

      expect(result.current.absolute).toEqual({ X: 15, Y: 25, Z: 35 });
    });

    it('should apply work offset when zeroing in ABS mode (connected)', () => {
      const machineState = createConnectedMachineState(100, 200, 300);
      const { result } = renderHook(() => useDROMemory(machineState));

      // Zero X axis - should set work offset to current machine position
      act(() => {
        result.current.zeroAxis('X');
      });

      // Display should now show 0 for X (machine pos - offset = 100 - 100 = 0)
      expect(result.current.absolute.X).toBe(0);
      // Y and Z should still show machine position
      expect(result.current.absolute.Y).toBe(200);
      expect(result.current.absolute.Z).toBe(300);
    });

    it('should allow setting specific value in ABS mode (adjusts offset)', () => {
      const machineState = createConnectedMachineState(100, 200, 300);
      const { result } = renderHook(() => useDROMemory(machineState));

      // Set X to display 50 (offset = 100 - 50 = 50)
      act(() => {
        result.current.setAxisValue('X', 50);
      });

      expect(result.current.absolute.X).toBe(50);
    });

    it('should maintain work offset when machine moves', () => {
      let machineState = createConnectedMachineState(100, 200, 300);
      const { result, rerender } = renderHook(
        ({ state }) => useDROMemory(state),
        { initialProps: { state: machineState } }
      );

      // Zero X axis at position 100
      act(() => {
        result.current.zeroAxis('X');
      });
      expect(result.current.absolute.X).toBe(0);

      // Machine moves to 110
      machineState = createConnectedMachineState(110, 200, 300);
      rerender({ state: machineState });

      // Display should show 10 (110 - 100 offset = 10)
      expect(result.current.absolute.X).toBe(10);
    });
  });

  describe('disconnected/manual mode', () => {
    it('should use manual values when not connected', () => {
      const disconnectedState: MachineState = {
        ...createDefaultMachineState('mock'),
        connected: false,
      };
      const { result } = renderHook(() => useDROMemory(disconnectedState));

      act(() => {
        result.current.setAxisValue('X', 42);
      });

      expect(result.current.absolute.X).toBe(42);
    });

    it('should use manual values when machineState is null', () => {
      const { result } = renderHook(() => useDROMemory(null));

      act(() => {
        result.current.setAxisValue('X', 42);
      });

      expect(result.current.absolute.X).toBe(42);
    });
  });
});
