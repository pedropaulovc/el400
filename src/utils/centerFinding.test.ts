import { describe, it, expect } from 'vitest';
import {
  findLineCenter,
  findCircleCenter,
  type Point2D,
} from './centerFinding';

// Helper functions for testing (not exported from module)
function calculateRadius(center: Point2D, point: Point2D): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateDistanceToGo(current: Point2D, target: Point2D): Point2D {
  return {
    x: target.x - current.x,
    y: target.y - current.y,
  };
}

/**
 * Unit tests for center finding utility functions
 * 
 * @see project/user-stories/02-core-operations/US-007-center-finding.md
 */
describe('centerFinding utilities', () => {
  describe('findLineCenter', () => {
    it('should find center of horizontal line', () => {
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 100, y: 0 };
      
      const center = findLineCenter(p1, p2);
      
      expect(center.x).toBe(50);
      expect(center.y).toBe(0);
    });

    it('should find center of vertical line', () => {
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 0, y: 100 };
      
      const center = findLineCenter(p1, p2);
      
      expect(center.x).toBe(0);
      expect(center.y).toBe(50);
    });

    it('should find center of diagonal line', () => {
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 100, y: 100 };
      
      const center = findLineCenter(p1, p2);
      
      expect(center.x).toBe(50);
      expect(center.y).toBe(50);
    });

    it('should handle negative coordinates', () => {
      const p1: Point2D = { x: -50, y: -30 };
      const p2: Point2D = { x: 50, y: 30 };
      
      const center = findLineCenter(p1, p2);
      
      expect(center.x).toBe(0);
      expect(center.y).toBe(0);
    });

    it('should handle decimal values', () => {
      const p1: Point2D = { x: 1.5, y: 2.5 };
      const p2: Point2D = { x: 3.5, y: 4.5 };
      
      const center = findLineCenter(p1, p2);
      
      expect(center.x).toBeCloseTo(2.5, 5);
      expect(center.y).toBeCloseTo(3.5, 5);
    });
  });

  describe('findCircleCenter', () => {
    it('should find center of circle at origin', () => {
      // Three points on a circle with center (0, 0) and radius 10
      const p1: Point2D = { x: 10, y: 0 };
      const p2: Point2D = { x: 0, y: 10 };
      const p3: Point2D = { x: -10, y: 0 };
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).not.toBeNull();
      expect(center!.x).toBeCloseTo(0, 5);
      expect(center!.y).toBeCloseTo(0, 5);
    });

    it('should find center of circle not at origin', () => {
      // Three points on a circle with center (5, 5) and radius 5
      const p1: Point2D = { x: 10, y: 5 };  // Right
      const p2: Point2D = { x: 5, y: 10 };  // Top
      const p3: Point2D = { x: 0, y: 5 };   // Left
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).not.toBeNull();
      expect(center!.x).toBeCloseTo(5, 5);
      expect(center!.y).toBeCloseTo(5, 5);
    });

    it('should handle points not at cardinal positions', () => {
      // Three arbitrary points on a circle
      const p1: Point2D = { x: 8, y: 2 };
      const p2: Point2D = { x: 2, y: 8 };
      const p3: Point2D = { x: 2, y: 2 };
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).not.toBeNull();
      expect(center!.x).toBeCloseTo(5, 1);
      expect(center!.y).toBeCloseTo(5, 1);
    });

    it('should return null for collinear points', () => {
      // Three points on a straight line
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 5, y: 0 };
      const p3: Point2D = { x: 10, y: 0 };
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).toBeNull();
    });

    it('should handle negative coordinates', () => {
      // Circle centered at (-10, -10) with radius 5
      const p1: Point2D = { x: -5, y: -10 };   // Right
      const p2: Point2D = { x: -10, y: -5 };   // Top
      const p3: Point2D = { x: -15, y: -10 };  // Left
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).not.toBeNull();
      expect(center!.x).toBeCloseTo(-10, 5);
      expect(center!.y).toBeCloseTo(-10, 5);
    });

    it('should handle vertical chord', () => {
      // Points that create a vertical chord
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 0, y: 10 };
      const p3: Point2D = { x: 5, y: 5 };
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).not.toBeNull();
      // The center should be somewhere that's equidistant from all three points
      const r1 = calculateRadius(center!, p1);
      const r2 = calculateRadius(center!, p2);
      const r3 = calculateRadius(center!, p3);
      
      expect(r1).toBeCloseTo(r2, 5);
      expect(r2).toBeCloseTo(r3, 5);
    });

    it('should handle horizontal chord', () => {
      // Points that create a horizontal chord
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 10, y: 0 };
      const p3: Point2D = { x: 5, y: 5 };
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).not.toBeNull();
      // The center should be somewhere that's equidistant from all three points
      const r1 = calculateRadius(center!, p1);
      const r2 = calculateRadius(center!, p2);
      const r3 = calculateRadius(center!, p3);
      
      expect(r1).toBeCloseTo(r2, 5);
      expect(r2).toBeCloseTo(r3, 5);
    });
  });


  describe('integration: line center from user story example', () => {
    it('should match US-007 example: center of line from 0 to 100', () => {
      // From US-007: Point 1 at 0, Point 2 at 100
      const p1: Point2D = { x: 0, y: 0 };
      const p2: Point2D = { x: 100, y: 0 };
      
      const center = findLineCenter(p1, p2);
      
      expect(center.x).toBe(50);
      
      // Distance to go from Point 2 (100) to center (50) is -50
      const dtg = calculateDistanceToGo(p2, center);
      expect(dtg.x).toBe(-50);
    });
  });

  describe('integration: circle center calculation', () => {
    it('should verify radius is consistent for all three points', () => {
      const p1: Point2D = { x: 10, y: 0 };
      const p2: Point2D = { x: 0, y: 10 };
      const p3: Point2D = { x: -10, y: 0 };
      
      const center = findCircleCenter(p1, p2, p3);
      
      expect(center).not.toBeNull();
      
      const r1 = calculateRadius(center!, p1);
      const r2 = calculateRadius(center!, p2);
      const r3 = calculateRadius(center!, p3);
      
      // All radii should be equal
      expect(r1).toBeCloseTo(10, 5);
      expect(r2).toBeCloseTo(10, 5);
      expect(r3).toBeCloseTo(10, 5);
    });
  });
});
