/**
 * Convenience hook for accessing mill state.
 * Re-exports useMillStateContext for cleaner imports.
 */

import { useMillStateContext } from '../context/MillStateContext';

export const useMillState = useMillStateContext;
