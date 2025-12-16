/**
 * Operation State Context
 *
 * Unified state machine for DRO operation modes, boot sequence,
 * and function menu states. Replaces the simple bootStage and
 * merges CenterFindingContext functionality.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from 'react';
import type { AxisValues } from '../types/volatileMemory';
import {
  type OperationState,
  type OperationContext,
  type OperationEvent,
  type CenterFindingContext,
  type StoredPoint,
  INITIAL_OPERATION_STATE,
  INITIAL_OPERATION_CONTEXT,
  INITIAL_CENTER_FINDING_CONTEXT,
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCenterLineState,
  isCenterCircleState,
  isResultState,
  isFunctionActive,
} from '../types/operationState';
import { findLineCenter, findCircleCenter } from '../utils/centerFinding';

// ─────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────

export interface OperationStateShape {
  state: OperationState;
  context: OperationContext;
}

const INITIAL_STATE: OperationStateShape = {
  state: INITIAL_OPERATION_STATE,
  context: INITIAL_OPERATION_CONTEXT,
};

// ─────────────────────────────────────────────────────────────────
// MENU NAVIGATION RING
// ─────────────────────────────────────────────────────────────────

const MENU_RING: OperationState[] = [
  'function-menu-center',
  'function-menu-circle',
  'function-menu-line',
  'function-menu-linear',
  'function-menu-polar',
];

function getNextMenuState(current: OperationState): OperationState {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  return MENU_RING[(idx + 1) % MENU_RING.length];
}

function getPrevMenuState(current: OperationState): OperationState {
  const idx = MENU_RING.indexOf(current);
  if (idx === -1) return current;
  return MENU_RING[(idx - 1 + MENU_RING.length) % MENU_RING.length];
}

// ─────────────────────────────────────────────────────────────────
// CENTER FINDING HELPERS
// ─────────────────────────────────────────────────────────────────

function addPointToContext(
  context: OperationContext,
  point: StoredPoint
): CenterFindingContext {
  if (context.type === 'center-finding') {
    return {
      ...context,
      storedPoints: [...context.storedPoints, point],
    };
  }
  return {
    ...INITIAL_CENTER_FINDING_CONTEXT,
    storedPoints: [point],
  };
}

function calculateLineCenterResult(points: StoredPoint[]): AxisValues | null {
  if (points.length < 2) return null;
  const center = findLineCenter(
    { x: points[0].X, y: points[0].Y },
    { x: points[1].X, y: points[1].Y }
  );
  return {
    X: center.x,
    Y: center.y,
    Z: (points[0].Z + points[1].Z) / 2,
  };
}

function calculateCircleCenterResult(points: StoredPoint[]): AxisValues | null {
  if (points.length < 3) return null;
  const center = findCircleCenter(
    { x: points[0].X, y: points[0].Y },
    { x: points[1].X, y: points[1].Y },
    { x: points[2].X, y: points[2].Y }
  );
  if (!center) return null;
  return {
    X: center.x,
    Y: center.y,
    Z: (points[0].Z + points[1].Z + points[2].Z) / 3,
  };
}

// ─────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────

function operationReducer(
  current: OperationStateShape,
  event: OperationEvent
): OperationStateShape {
  const { state, context } = current;

  switch (state) {
    // ─────────────────────────────────────────────────────────────
    // BOOT STATES
    // ─────────────────────────────────────────────────────────────
    case 'boot':
      if (event.type === 'BOOT_COMPLETE') {
        return {
          state: event.skipMessage ? 'idle' : 'showMessage',
          context: INITIAL_OPERATION_CONTEXT,
        };
      }
      return current;

    case 'showMessage':
      if (event.type === 'BOOT_MESSAGE_TIMEOUT' || event.type === 'KEY_CLEAR') {
        return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
      }
      return current;

    // ─────────────────────────────────────────────────────────────
    // IDLE STATE
    // ─────────────────────────────────────────────────────────────
    case 'idle':
      switch (event.type) {
        case 'BTN_ABS_INC':
          return { state: 'abs-inc-mode', context };
        case 'BTN_INCH_MM':
          return { state: 'inch-mm-mode', context };
        case 'BTN_FUNCTION':
          return { state: 'function-menu-center', context: INITIAL_OPERATION_CONTEXT };
        default:
          return current;
      }

    // ─────────────────────────────────────────────────────────────
    // TRANSITIONAL TOGGLE STATES
    // ─────────────────────────────────────────────────────────────
    case 'abs-inc-mode':
    case 'inch-mm-mode':
      if (event.type === 'MODE_TOGGLE_COMPLETE') {
        return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
      }
      return current;

    // ─────────────────────────────────────────────────────────────
    // FUNCTION MENU SELECTION STATES
    // ─────────────────────────────────────────────────────────────
    case 'function-menu-center':
    case 'function-menu-circle':
    case 'function-menu-line':
    case 'function-menu-linear':
    case 'function-menu-polar':
      switch (event.type) {
        case 'KEY_CLEAR':
          return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
        case 'KEY_6':
          return { state: getNextMenuState(state), context };
        case 'KEY_4':
          return { state: getPrevMenuState(state), context };
        case 'KEY_ENTER':
          return handleMenuEnter(state);
        default:
          return current;
      }

    // ─────────────────────────────────────────────────────────────
    // CENTER LINE POINT COLLECTION
    // ─────────────────────────────────────────────────────────────
    case 'function-menu-center-line-point-1':
      switch (event.type) {
        case 'KEY_CLEAR':
          return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
        case 'POINT_DATA':
          return {
            state: 'function-menu-center-line-point-2',
            context: addPointToContext(context, event.point),
          };
        default:
          return current;
      }

    case 'function-menu-center-line-point-2':
      switch (event.type) {
        case 'KEY_CLEAR':
          return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
        case 'POINT_DATA': {
          const newContext = addPointToContext(context, event.point);
          const centerResult = calculateLineCenterResult(newContext.storedPoints);
          return {
            state: 'function-menu-center-line-result',
            context: { ...newContext, centerResult },
          };
        }
        default:
          return current;
      }

    case 'function-menu-center-line-result':
      if (event.type === 'KEY_CLEAR') {
        return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
      }
      return current;

    // ─────────────────────────────────────────────────────────────
    // CENTER CIRCLE POINT COLLECTION
    // ─────────────────────────────────────────────────────────────
    case 'function-menu-center-circle-point-1':
      switch (event.type) {
        case 'KEY_CLEAR':
          return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
        case 'POINT_DATA':
          return {
            state: 'function-menu-center-circle-point-2',
            context: addPointToContext(context, event.point),
          };
        default:
          return current;
      }

    case 'function-menu-center-circle-point-2':
      switch (event.type) {
        case 'KEY_CLEAR':
          return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
        case 'POINT_DATA':
          return {
            state: 'function-menu-center-circle-point-3',
            context: addPointToContext(context, event.point),
          };
        default:
          return current;
      }

    case 'function-menu-center-circle-point-3':
      switch (event.type) {
        case 'KEY_CLEAR':
          return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
        case 'POINT_DATA': {
          const newContext = addPointToContext(context, event.point);
          const centerResult = calculateCircleCenterResult(newContext.storedPoints);
          return {
            state: 'function-menu-center-circle-result',
            context: { ...newContext, centerResult },
          };
        }
        default:
          return current;
      }

    case 'function-menu-center-circle-result':
      if (event.type === 'KEY_CLEAR') {
        return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
      }
      return current;

    default:
      return current;
  }
}

function handleMenuEnter(menuState: OperationState): OperationStateShape {
  switch (menuState) {
    case 'function-menu-center':
    case 'function-menu-line':
      // Center and Line both go to line center finding (2 points)
      return {
        state: 'function-menu-center-line-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };
    case 'function-menu-circle':
      return {
        state: 'function-menu-center-circle-point-1',
        context: INITIAL_CENTER_FINDING_CONTEXT,
      };
    case 'function-menu-linear':
    case 'function-menu-polar':
      // TODO: implement linear and polar
      return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
    default:
      return { state: 'idle', context: INITIAL_OPERATION_CONTEXT };
  }
}

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

// Re-export type guards for convenience
export {
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isCenterLineState,
  isCenterCircleState,
  isResultState,
  isFunctionActive,
};

// Re-export types
export type { OperationState, OperationContext, OperationEvent, StoredPoint };
