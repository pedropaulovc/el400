/**
 * Center Finding Utilities
 * 
 * Mathematical functions for finding centers of lines and circles
 * based on probing points.
 * 
 * @see project/user-stories/02-core-operations/US-007-center-finding.md
 */

/**
 * Relative tolerance for a 2-D cross product. Scaling by the square of the
 * largest coordinate delta keeps the degeneracy decision independent of units
 * and coordinate magnitude.
 */
const CROSS_PRODUCT_EPSILON = Number.EPSILON * 16;

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
 * Calculate the circumcenter using translated vectors and a determinant.
 * Translation avoids the vertical/horizontal slope special cases, and the
 * determinant rejects every non-circle input: collinear points and repeated
 * points alike.
 *
 * @param p1 - First point on the circle
 * @param p2 - Second point on the circle
 * @param p3 - Third point on the circle
 * @returns The center point, or null when no unique finite circle exists
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
  const ax = p2.x - p1.x;
  const ay = p2.y - p1.y;
  const bx = p3.x - p1.x;
  const by = p3.y - p1.y;
  const scale = Math.max(Math.abs(ax), Math.abs(ay), Math.abs(bx), Math.abs(by));

  if (!Number.isFinite(scale) || scale === 0) return null;

  const cross = ax * by - ay * bx;
  if (Math.abs(cross) <= CROSS_PRODUCT_EPSILON * scale * scale) return null;

  const aSquared = ax * ax + ay * ay;
  const bSquared = bx * bx + by * by;
  const denominator = 2 * cross;
  const centerX = p1.x + (by * aSquared - ay * bSquared) / denominator;
  const centerY = p1.y + (ax * bSquared - bx * aSquared) / denominator;

  return Number.isFinite(centerX) && Number.isFinite(centerY)
    ? { x: centerX, y: centerY }
    : null;
}

