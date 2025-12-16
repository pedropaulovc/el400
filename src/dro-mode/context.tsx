/**
 * DRO Mode Context
 *
 * React context provider and hooks for the DRO mode state machine.
 */

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { DROModeShape } from './types';
import type {
  DROModeState,
  DROModeData,
  DROModeEvent,
} from '../types/droMode';
import {
  INITIAL_DRO_MODE_STATE,
  INITIAL_DRO_MODE_DATA,
} from '../types/droMode';
import type { AxisValues } from '../types/volatileMemory';
import { droModeReducer } from './reducer';

// ─────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────

const INITIAL_STATE: DROModeShape = {
  state: INITIAL_DRO_MODE_STATE,
  data: INITIAL_DRO_MODE_DATA,
};

// ─────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────

interface DROModeContextValue {
  state: DROModeState;
  data: DROModeData;
  dispatch: Dispatch<DROModeEvent>;
}

const DROModeContext = createContext<DROModeContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────

export interface DROModeProviderProps {
  children: ReactNode;
  initialState?: DROModeShape;
}

export function DROModeProvider({
  children,
  initialState = INITIAL_STATE,
}: DROModeProviderProps) {
  const [{ state, data }, dispatch] = useReducer(droModeReducer, initialState);

  return (
    <DROModeContext.Provider value={{ state, data, dispatch }}>
      {children}
    </DROModeContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────

function useDROModeContext(): DROModeContextValue {
  const context = useContext(DROModeContext);
  if (!context) {
    throw new Error('useDROModeState must be used within a DROModeProvider');
  }
  return context;
}

/** Get current DRO mode state */
export function useDROModeState(): DROModeState {
  return useDROModeContext().state;
}

/** Get DRO mode data (stored points, results, etc.) */
export function useDROModeData(): DROModeData {
  return useDROModeContext().data;
}

/** Get dispatch function for sending events */
export function useDROModeDispatch(): Dispatch<DROModeEvent> {
  return useDROModeContext().dispatch;
}

/**
 * Get center finding result if in a result state
 */
export function useCenterResult(): AxisValues | null {
  const data = useDROModeData();
  if (data.type === 'center-finding') {
    return data.centerResult;
  }
  return null;
}

/**
 * Get stored points count for center finding
 */
export function useStoredPointsCount(): number {
  const data = useDROModeData();
  if (data.type === 'center-finding') {
    return data.storedPoints.length;
  }
  return 0;
}
