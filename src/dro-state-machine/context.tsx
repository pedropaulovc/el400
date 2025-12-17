/**
 * DRO State Machine Context
 *
 * React context provider and hooks for the DRO state machine.
 */
/* eslint-disable react-refresh/only-export-components -- Context files commonly export both Provider and hooks */

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { DROStatePayload } from './types';
import type {
  DROStateName,
  DROStateData as DROContextType,
  DROEventPayload,
} from './droStateMachine';
import {
  INITIAL_DRO_STATE,
  INITIAL_DRO_STATE_DATA,
} from './droStateMachine';
import type { AxisValues } from '../types/volatileMemory';
import { droReducer } from './reducer';

// ─────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────

const INITIAL_SHAPE: DROStatePayload = {
  stateName: INITIAL_DRO_STATE,
  stateData: INITIAL_DRO_STATE_DATA,
};

// ─────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────

interface DROContextValue {
  state: DROStateName;
  data: DROContextType;
  dispatch: Dispatch<DROEventPayload>;
}

const DROReactContext = createContext<DROContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────

export interface DROProviderProps {
  children: ReactNode;
  initialState?: DROStatePayload | undefined;
}

export function DROProvider({
  children,
  initialState = INITIAL_SHAPE,
}: DROProviderProps) {
  const [{ stateName: state, stateData: data }, dispatch] = useReducer(droReducer, initialState);

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
export function useDROState(): DROStateName {
  return useDROContextInternal().state;
}

/** Get DRO context data (stored points, results, etc.) */
export function useDROContext(): DROContextType {
  return useDROContextInternal().data;
}

/** Get dispatch function for sending events */
export function useDRODispatch(): Dispatch<DROEventPayload> {
  return useDROContextInternal().dispatch;
}

/**
 * Get center finding result if in a result state
 */
export function useCenterResult(): AxisValues | null {
  const data = useDROContext();
  if (data.stateDataType === 'center-finding') {
    return data.centerResult;
  }
  return null;
}

/**
 * Get stored points count for center finding
 */
export function useStoredPointsCount(): number {
  const data = useDROContext();
  if (data.stateDataType === 'center-finding') {
    return data.storedPoints.length;
  }
  return 0;
}
