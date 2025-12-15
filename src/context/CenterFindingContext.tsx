/**
 * Center Finding Context - Business logic for center finding operations
 * 
 * Manages state and operations for the center finding feature (US-007).
 * Separated from VolatileMemoryContext to keep concerns isolated.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { AxisValues } from '../types/volatileMemory';
import { findLineCenter, findCircleCenter } from '../utils/centerFinding';

/**
 * Function mode for center finding workflow
 */
export type CenterFindingMode =
  | 'inactive'        // Not in center finding mode
  | 'menu'            // Showing "CEntrE" menu
  | 'line'            // Line center finding - collecting 2 points
  | 'circle';         // Circle center finding - collecting 3 points

/**
 * Stored point for center finding
 */
export interface StoredPoint {
  X: number;
  Y: number;
  Z: number;
}

/**
 * Menu option when in menu mode
 */
export type MenuOption = 'center' | 'line' | 'circle';

/**
 * Center finding state
 */
export interface CenterFindingState {
  mode: CenterFindingMode;
  menuOption: MenuOption;  // Which option is currently shown in menu
  storedPoints: StoredPoint[];
  centerResult: AxisValues | null;
}

/**
 * Center finding actions
 */
export interface CenterFindingActions {
  enterMenu: () => void;
  selectLine: () => void;
  selectCircle: () => void;
  cycleMenuOption: () => void;  // Cycle through menu options
  storePoint: (point: StoredPoint) => void;
  exit: () => void;
}

export interface CenterFindingContextValue extends CenterFindingState, CenterFindingActions {}

const CenterFindingContext = createContext<CenterFindingContextValue | null>(null);

export interface CenterFindingProviderProps {
  children: ReactNode;
}

/**
 * Provider component for center finding operations.
 * Manages all center finding business logic separately from DRO memory.
 */
export function CenterFindingProvider({ children }: CenterFindingProviderProps) {
  const [state, setState] = useState<CenterFindingState>({
    mode: 'inactive',
    menuOption: 'center',
    storedPoints: [],
    centerResult: null,
  });

  // Enter the center finding menu
  const enterMenu = useCallback(() => {
    setState({
      mode: 'menu',
      menuOption: 'center',
      storedPoints: [],
      centerResult: null,
    });
  }, []);

  // Select line center mode
  const selectLine = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'line',
      storedPoints: [],
      centerResult: null,
    }));
  }, []);

  // Select circle center mode
  const selectCircle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: 'circle',
      storedPoints: [],
      centerResult: null,
    }));
  }, []);

  // Store a point and calculate center if enough points collected
  const storePoint = useCallback((point: StoredPoint) => {
    setState((prev) => {
      const newPoints = [...prev.storedPoints, point];
      const isLine = prev.mode === 'line';
      const isCircle = prev.mode === 'circle';
      const hasEnoughPoints = 
        (isLine && newPoints.length === 2) || 
        (isCircle && newPoints.length === 3);

      if (!hasEnoughPoints) {
        return { ...prev, storedPoints: newPoints };
      }

      // Calculate center
      let centerResult: AxisValues | null = null;

      if (isLine && newPoints.length === 2) {
        const center = findLineCenter(
          { x: newPoints[0].X, y: newPoints[0].Y },
          { x: newPoints[1].X, y: newPoints[1].Y }
        );
        centerResult = { 
          X: center.x, 
          Y: center.y, 
          Z: (newPoints[0].Z + newPoints[1].Z) / 2 
        };
      } else if (isCircle && newPoints.length === 3) {
        const center = findCircleCenter(
          { x: newPoints[0].X, y: newPoints[0].Y },
          { x: newPoints[1].X, y: newPoints[1].Y },
          { x: newPoints[2].X, y: newPoints[2].Y }
        );
        if (center) {
          centerResult = { 
            X: center.x, 
            Y: center.y, 
            Z: (newPoints[0].Z + newPoints[1].Z + newPoints[2].Z) / 3 
          };
        }
      }

      return {
        ...prev,
        storedPoints: newPoints,
        centerResult,
      };
    });
  }, []);

  // Exit center finding mode
  const exit = useCallback(() => {
    setState({
      mode: 'inactive',
      menuOption: 'center',
      storedPoints: [],
      centerResult: null,
    });
  }, []);

  // Cycle through menu options (line <-> circle)
  const cycleMenuOption = useCallback(() => {
    setState((prev) => {
      if (prev.mode === 'menu') {
        // Cycle between line and circle when showing menu
        const nextOption = prev.menuOption === 'line' ? 'circle' : 'line';
        return { ...prev, menuOption: nextOption };
      }
      return prev;
    });
  }, []);

  const contextValue: CenterFindingContextValue = {
    // State
    mode: state.mode,
    menuOption: state.menuOption,
    storedPoints: state.storedPoints,
    centerResult: state.centerResult,

    // Actions
    enterMenu,
    selectLine,
    selectCircle,
    cycleMenuOption,
    storePoint,
    exit,
  };

  return (
    <CenterFindingContext.Provider value={contextValue}>
      {children}
    </CenterFindingContext.Provider>
  );
}

/**
 * Hook to access the center finding context.
 * Must be used within a CenterFindingProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCenterFinding(): CenterFindingContextValue {
  const context = useContext(CenterFindingContext);

  if (context === null) {
    throw new Error('useCenterFinding must be used within a CenterFindingProvider');
  }

  return context;
}
