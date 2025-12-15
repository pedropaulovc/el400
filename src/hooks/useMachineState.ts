/**
 * Convenience hook for accessing machine state.
 * Re-exports useMachineStateContext for cleaner imports.
 */

import { useMachineStateContext } from '../context/MachineStateContext';

export const useMachineState = useMachineStateContext;
