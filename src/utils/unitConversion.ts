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
 * Convert a value from any unit to mm (internal storage)
 * @param value - The value to convert
 * @param unit - The unit of the input value ('inch' or 'mm')
 * @returns The value in millimeters
 */
export function fromAnyUnitToMm(value: number, unit: 'inch' | 'mm'): number {
  return unit === 'inch' ? inchToMm(value) : value;
}

/**
 * Convert a value from mm (internal storage) to any unit
 * @param valueMm - The value in millimeters
 * @param unit - The target unit ('inch' or 'mm')
 * @returns The value in the target unit
 */
export function fromMmToAnyUnit(valueMm: number, unit: 'inch' | 'mm'): number {
  return unit === 'inch' ? mmToInch(valueMm) : valueMm;
}
