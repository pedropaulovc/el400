/**
 * Operation State Context
 *
 * React context provider and hooks for the operation state machine.
 */

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { OperationStateShape } from './types';
import type {
  OperationState,
  OperationContext,
  OperationEvent,
} from '../types/operationState';
import {
  INITIAL_OPERATION_STATE,
  INITIAL_OPERATION_CONTEXT,
} from '../types/operationState';
import type { AxisValues } from '../types/volatileMemory';
import { operationReducer } from './reducer';

// ─────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────

const INITIAL_STATE: OperationStateShape = {
  state: INITIAL_OPERATION_STATE,
  context: INITIAL_OPERATION_CONTEXT,
};

// ─────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────

interface OperationStateContextValue {
  state: OperationState;
  context: OperationContext;
  dispatch: Dispatch<OperationEvent>;
}

const OperationStateContext = createContext<OperationStateContextValue | null>(
  null
);

// ─────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────

export interface OperationStateProviderProps {
  children: ReactNode;
  initialState?: OperationStateShape;
}

export function OperationStateProvider({
  children,
  initialState = INITIAL_STATE,
}: OperationStateProviderProps) {
  const [{ state, context }, dispatch] = useReducer(
    operationReducer,
    initialState
  );

  return (
    <OperationStateContext.Provider value={{ state, context, dispatch }}>
      {children}
    </OperationStateContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────

function useOperationStateContext(): OperationStateContextValue {
  const context = useContext(OperationStateContext);
  if (!context) {
    throw new Error(
      'useOperationState must be used within an OperationStateProvider'
    );
  }
  return context;
}

/** Get current operation state */
export function useOperationState(): OperationState {
  return useOperationStateContext().state;
}

/** Get operation context data (stored points, results, etc.) */
export function useOperationContext(): OperationContext {
  return useOperationStateContext().context;
}

/** Get dispatch function for sending events */
export function useOperationDispatch(): Dispatch<OperationEvent> {
  return useOperationStateContext().dispatch;
}

/**
 * Get center finding result if in a result state
 */
export function useCenterResult(): AxisValues | null {
  const context = useOperationContext();
  if (context.type === 'center-finding') {
    return context.centerResult;
  }
  return null;
}

/**
 * Get stored points count for center finding
 */
export function useStoredPointsCount(): number {
  const context = useOperationContext();
  if (context.type === 'center-finding') {
    return context.storedPoints.length;
  }
  return 0;
}
