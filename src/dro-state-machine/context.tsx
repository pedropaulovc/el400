/**
 * DRO State Machine Context
 *
 * React context provider and hooks for the DRO state machine.
 */

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { DROShape } from './types';
import type {
  DROState,
  DROContext as DROContextType,
  DROEvent,
} from '../types/droStateMachine';
import {
  INITIAL_DRO_STATE,
  INITIAL_DRO_CONTEXT,
} from '../types/droStateMachine';
import type { AxisValues } from '../types/volatileMemory';
import { droReducer } from './reducer';

// ─────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────

const INITIAL_SHAPE: DROShape = {
  state: INITIAL_DRO_STATE,
  data: INITIAL_DRO_CONTEXT,
};

// ─────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────

interface DROContextValue {
  state: DROState;
  data: DROContextType;
  dispatch: Dispatch<DROEvent>;
}

const DROReactContext = createContext<DROContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────

export interface DROProviderProps {
  children: ReactNode;
  initialState?: DROShape;
}

export function DROProvider({
  children,
  initialState = INITIAL_SHAPE,
}: DROProviderProps) {
  const [{ state, data }, dispatch] = useReducer(droReducer, initialState);

  return (
    <DROReactContext.Provider value={{ state, data, dispatch }}>
      {children}
    </DROReactContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────

function useDROContextInternal(): DROContextValue {
  const context = useContext(DROReactContext);
  if (!context) {
    throw new Error('useDROState must be used within a DROProvider');
  }
  return context;
}

/** Get current DRO state */
export function useDROState(): DROState {
  return useDROContextInternal().state;
}

/** Get DRO context data (stored points, results, etc.) */
export function useDROContext(): DROContextType {
  return useDROContextInternal().data;
}

/** Get dispatch function for sending events */
export function useDRODispatch(): Dispatch<DROEvent> {
  return useDROContextInternal().dispatch;
}

/**
 * Get center finding result if in a result state
 */
export function useCenterResult(): AxisValues | null {
  const data = useDROContext();
  if (data.type === 'center-finding') {
    return data.centerResult;
  }
  return null;
}

/**
 * Get stored points count for center finding
 */
export function useStoredPointsCount(): number {
  const data = useDROContext();
  if (data.type === 'center-finding') {
    return data.storedPoints.length;
  }
  return 0;
}
