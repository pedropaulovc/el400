/**
 * Unit conversion utilities for inch/mm display
 * 
 * Internal storage is always in millimeters (mm)
 * Display conversion is applied based on user's unit preference
 */

/** Conversion factor: 1 inch = 25.4 mm */
export const MM_PER_INCH = 25.4;

/**
 * Convert millimeters to inches
 */
export function mmToInch(mm: number): number {
  return mm / MM_PER_INCH;
}

/**
 * Convert inches to millimeters
 */
export function inchToMm(inch: number): number {
  return inch * MM_PER_INCH;
}

/**
 * Convert a value from the display unit to mm (internal storage)
 */
export function toMm(value: number, isInch: boolean): number {
  return isInch ? inchToMm(value) : value;
}

/**
 * Convert a value from mm (internal storage) to the display unit
 */
export function fromMm(valueMm: number, isInch: boolean): number {
  return isInch ? mmToInch(valueMm) : valueMm;
}
