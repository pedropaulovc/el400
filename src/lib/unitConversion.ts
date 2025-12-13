/**
 * Unit conversion utilities for DRO display
 * 
 * Internal storage: All values stored in millimeters (mm)
 * Display: Convert to inches when needed
 */

/** Standard conversion factor: 1 inch = 25.4 mm */
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
export function inchToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

/**
 * Convert a value for display based on the selected unit
 * 
 * @param valueInMm - Value in millimeters (internal storage unit)
 * @param displayUnit - Unit to display ('inch' or 'mm')
 * @returns Value in the requested display unit
 */
export function convertForDisplay(valueInMm: number, displayUnit: 'inch' | 'mm'): number {
  return displayUnit === 'inch' ? mmToInch(valueInMm) : valueInMm;
}

/**
 * Convert a value from display unit to internal storage (mm)
 * 
 * @param value - Value in the current display unit
 * @param currentUnit - Current display unit ('inch' or 'mm')
 * @returns Value in millimeters
 */
export function convertFromDisplay(value: number, currentUnit: 'inch' | 'mm'): number {
  return currentUnit === 'inch' ? inchToMm(value) : value;
}
