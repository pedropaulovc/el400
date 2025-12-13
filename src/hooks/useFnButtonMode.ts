/**
 * Hook for managing DRO Fn button modes (Center Finding, Calculator, etc.)
 */

import { useState, useCallback } from 'react';
import type { Axis } from './useDROMemory';

/**
 * Point coordinates for center finding
 */
export interface Point {
  x: number;
  y: number;
  z: number;
}

/**
 * Function modes available in the DRO
 */
export type FunctionMode = 'none' | 'center-menu' | 'center-line' | 'center-circle';

/**
 * Submenu option for center finding
 */
export type CenterMenuOption = 'line' | 'circle';

/**
 * State for center finding operations
 */
export interface CenterFindingState {
  type: 'line' | 'circle';
  points: Point[];
  expectedPoints: number;
  centerPoint: Point | null;
}

/**
 * Function mode state and operations
 */
export interface FunctionModeState {
  /** Current function mode */
  mode: FunctionMode;
  /** Selected menu option */
  menuSelection: CenterMenuOption | null;
  /** Center finding state (if in center mode) */
  centerFinding: CenterFindingState | null;
  /** Whether function mode is active (for LED) */
  isFnActive: boolean;
}

export interface UseFunctionModeReturn extends FunctionModeState {
  /** Enter center menu directly */
  enterCenterMenu: () => void;
  /** Select a menu option */
  selectMenuOption: (option: CenterMenuOption) => void;
  /** Confirm current selection (ENT key) */
  confirmSelection: () => void;
  /** Navigate menu (Right arrow) */
  navigateNext: () => void;
  /** Store a point in center finding */
  storePoint: (point: Point) => void;
  /** Exit function mode */
  exitFunctionMode: () => void;
  /** Calculate distance to go from current position */
  calculateDistanceToGo: (currentPoint: Point) => Point | null;
  /** Get display text for current mode */
  getDisplayText: () => { x: string; y: string; z: string } | null;
}

/**
 * Hook for managing Fn button modes
 */
export function useFnButtonMode(): UseFunctionModeReturn {
  const [mode, setMode] = useState<FunctionMode>('none');
  const [menuSelection, setMenuSelection] = useState<CenterMenuOption | null>(null);
  const [centerFinding, setCenterFinding] = useState<CenterFindingState | null>(null);

  const isFnActive = mode !== 'none';

  const enterCenterMenu = useCallback(() => {
    setMode('center-menu');
    setMenuSelection('line');
  }, []);

  const selectMenuOption = useCallback((option: CenterMenuOption) => {
    setMenuSelection(option);
  }, []);

  const confirmSelection = useCallback(() => {
    if (mode === 'center-menu') {
      if (menuSelection === 'line') {
        setMode('center-line');
        setCenterFinding({
          type: 'line',
          points: [],
          expectedPoints: 2,
          centerPoint: null,
        });
      } else if (menuSelection === 'circle') {
        setMode('center-circle');
        setCenterFinding({
          type: 'circle',
          points: [],
          expectedPoints: 3,
          centerPoint: null,
        });
      }
    }
  }, [mode, menuSelection]);

  const navigateNext = useCallback(() => {
    if (mode === 'center-menu') {
      // Toggle between line and circle
      setMenuSelection(menuSelection === 'line' ? 'circle' : 'line');
    }
  }, [mode, menuSelection]);

  const storePoint = useCallback((point: Point) => {
    if (!centerFinding) return;

    const newPoints = [...centerFinding.points, point];
    
    if (newPoints.length === centerFinding.expectedPoints) {
      // Calculate center
      const center = calculateCenter(centerFinding.type, newPoints);
      setCenterFinding({
        ...centerFinding,
        points: newPoints,
        centerPoint: center,
      });
    } else {
      setCenterFinding({
        ...centerFinding,
        points: newPoints,
      });
    }
  }, [centerFinding]);

  const calculateDistanceToGo = useCallback((currentPoint: Point): Point | null => {
    if (!centerFinding?.centerPoint) return null;

    return {
      x: centerFinding.centerPoint.x - currentPoint.x,
      y: centerFinding.centerPoint.y - currentPoint.y,
      z: centerFinding.centerPoint.z - currentPoint.z,
    };
  }, [centerFinding]);

  const exitFunctionMode = useCallback(() => {
    setMode('none');
    setMenuSelection(null);
    setCenterFinding(null);
  }, []);

  const getDisplayText = useCallback((): { x: string; y: string; z: string } | null => {
    switch (mode) {
      case 'center-menu':
        if (menuSelection === 'line') {
          return { x: 'LinE', y: '', z: '' };
        } else if (menuSelection === 'circle') {
          return { x: 'CirCLE', y: '', z: '' };
        }
        return null;
      
      case 'center-line':
      case 'center-circle':
        // When collecting points or showing distance-to-go, return null to show numeric display
        return null;
      
      default:
        return null;
    }
  }, [mode, menuSelection]);

  return {
    mode,
    menuSelection,
    centerFinding,
    isFnActive,
    enterCenterMenu,
    selectMenuOption,
    confirmSelection,
    navigateNext,
    storePoint,
    exitFunctionMode,
    calculateDistanceToGo,
    getDisplayText,
  };
}

/**
 * Calculate center point based on type and stored points
 */
function calculateCenter(type: 'line' | 'circle', points: Point[]): Point | null {
  if (type === 'line' && points.length === 2) {
    // Center of line: midpoint
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
      z: (points[0].z + points[1].z) / 2,
    };
  } else if (type === 'circle' && points.length === 3) {
    // Center of circle: using 3-point circle calculation
    return calculateCircleCenter(points[0], points[1], points[2]);
  }
  return null;
}

/**
 * Threshold for detecting collinear points in circle calculation
 * Set to 0.01mm (10 microns) to account for realistic DRO measurement precision (~5 microns).
 * This prevents calculation errors when measured points are nearly collinear due to
 * physical measurement limitations. The determinant in the circumcenter formula becomes
 * unreliable when points are effectively collinear within measurement precision.
 */
const COLLINEAR_THRESHOLD = 0.01;

/**
 * Calculate center of circle from 3 points using the circumcenter formula
 * This uses 2D calculation on X-Y plane, preserving Z from the first point
 */
function calculateCircleCenter(p1: Point, p2: Point, p3: Point): Point {
  const ax = p1.x, ay = p1.y;
  const bx = p2.x, by = p2.y;
  const cx = p3.x, cy = p3.y;

  // Calculate the determinant
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

  if (Math.abs(d) < COLLINEAR_THRESHOLD) {
    // Points are collinear, return midpoint of first two points
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      z: p1.z,
    };
  }

  // Calculate center coordinates
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

  return {
    x: ux,
    y: uy,
    z: p1.z, // Preserve Z coordinate from first point
  };
}
