/**
 * Custom hook for center finding operations.
 * Provides convenient access to center finding context.
 */

import { useCenterFinding } from '../context/CenterFindingContext';

export function useCenterFindingOperations() {
  return useCenterFinding();
}
