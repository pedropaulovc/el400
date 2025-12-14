/**
 * Hook for accessing unified volatile memory.
 * This is a convenience re-export of the context hook.
 */

import { useVolatileMemoryContext, type VolatileMemoryContextValue } from '../context/VolatileMemoryContext';
import type {
  VolatileMemory,
  VolatileMemoryActions,
  AxisValues,
  Axis,
  DatumMode,
} from '../types/volatileMemory';

export type { VolatileMemory, VolatileMemoryActions, AxisValues, Axis, DatumMode };

/**
 * Hook for accessing unified volatile memory.
 * Provides machine state from adapter combined with DRO memory management.
 *
 * In ABS mode:
 * - Displays machine position (from external source or manual entry)
 * - Zero sets the reference point (offset from machine position)
 *
 * In INC mode:
 * - Displays incremental/work position
 * - Zero resets incremental counter
 */
export function useVolatileMemory(): VolatileMemoryContextValue {
  return useVolatileMemoryContext();
}
