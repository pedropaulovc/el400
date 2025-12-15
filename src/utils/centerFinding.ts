/**
 * Center Finding Utilities
 * 
 * Mathematical functions for finding centers of lines and circles
 * based on probing points.
 * 
 * @see project/user-stories/02-core-operations/US-007-center-finding.md
 */

/**
 * Epsilon value for floating point comparisons.
 * Used to determine if values are effectively zero or if lines are parallel.
 */
const EPSILON = 1e-10;

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculate the center point of a line given two endpoints.
 * 
 * @param p1 - First point on the line
 * @param p2 - Second point on the line
 * @returns The center point of the line
 * 
 * @example
 * const center = findLineCenter({ x: 0, y: 0 }, { x: 100, y: 0 });
 * // center = { x: 50, y: 0 }
 */
export function findLineCenter(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Calculate the center of a circle given three points on its circumference.
 * Uses the mathematical property that the center is equidistant from all three points.
 * 
 * Algorithm:
 * 1. Find the perpendicular bisectors of two chords
 * 2. The intersection of these bisectors is the center
 * 
 * @param p1 - First point on the circle
 * @param p2 - Second point on the circle
 * @param p3 - Third point on the circle
 * @returns The center point of the circle, or null if points are collinear
 * 
 * @example
 * const center = findCircleCenter(
 *   { x: 10, y: 0 },
 *   { x: 0, y: 10 },
 *   { x: -10, y: 0 }
 * );
 * // center = { x: 0, y: 0 }
 */
export function findCircleCenter(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): Point2D | null {
  // Calculate midpoints of two chords
  const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

  // Calculate slopes of the chords, handling vertical lines
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p3.x - p2.x;
  const dy2 = p3.y - p2.y;

  // Check if chords are vertical (dx = 0)
  const isVertical1 = Math.abs(dx1) < EPSILON;
  const isVertical2 = Math.abs(dx2) < EPSILON;

  // Calculate slopes (only if not vertical)
  const slope1 = isVertical1 ? Infinity : dy1 / dx1;
  const slope2 = isVertical2 ? Infinity : dy2 / dx2;

  // Check if points are collinear
  if (isVertical1 && isVertical2) {
    // Both chords vertical means all points on same vertical line
    return null;
  } else if (!isVertical1 && !isVertical2) {
    // Both chords have finite slope - check if parallel
    if (Math.abs(slope1 - slope2) < EPSILON) {
      return null; // Points are collinear, no unique circle
    }
  }

  // Calculate slopes of perpendicular bisectors
  // Perpendicular slope is negative reciprocal
  let perpSlope1: number;
  let perpSlope2: number;

  // Handle vertical chords (infinite slope -> horizontal bisector)
  if (isVertical1) {
    perpSlope1 = 0; // Horizontal bisector
  } else if (Math.abs(slope1) < EPSILON) {
    perpSlope1 = Infinity; // Vertical bisector
  } else {
    perpSlope1 = -1 / slope1;
  }

  if (isVertical2) {
    perpSlope2 = 0; // Horizontal bisector
  } else if (Math.abs(slope2) < EPSILON) {
    perpSlope2 = Infinity; // Vertical bisector
  } else {
    perpSlope2 = -1 / slope2;
  }

  // Find intersection of perpendicular bisectors
  let centerX: number;
  let centerY: number;

  if (!isFinite(perpSlope1)) {
    // First bisector is vertical: x = mid1.x
    centerX = mid1.x;
    centerY = perpSlope2 * (centerX - mid2.x) + mid2.y;
  } else if (!isFinite(perpSlope2)) {
    // Second bisector is vertical: x = mid2.x
    centerX = mid2.x;
    centerY = perpSlope1 * (centerX - mid1.x) + mid1.y;
  } else {
    // Both bisectors have finite slope
    // Solve system of equations:
    // y - mid1.y = perpSlope1 * (x - mid1.x)
    // y - mid2.y = perpSlope2 * (x - mid2.x)
    centerX =
      (mid2.y - mid1.y + perpSlope1 * mid1.x - perpSlope2 * mid2.x) /
      (perpSlope1 - perpSlope2);
    centerY = perpSlope1 * (centerX - mid1.x) + mid1.y;
  }

  return { x: centerX, y: centerY };
}

/**
 * Calculate the radius of a circle given its center and a point on the circumference.
 * 
 * @param center - The center point of the circle
 * @param point - A point on the circle's circumference
 * @returns The radius of the circle
 */
export function calculateRadius(center: Point2D, point: Point2D): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the distance-to-go vector from current position to target.
 * Returns negative values to indicate direction (as per EL400 convention).
 * 
 * @param current - Current position
 * @param target - Target position (center)
 * @returns Distance-to-go vector (negative when target is behind current position)
 */
export function calculateDistanceToGo(
  current: Point2D,
  target: Point2D
): Point2D {
  return {
    x: target.x - current.x,
    y: target.y - current.y,
  };
}
