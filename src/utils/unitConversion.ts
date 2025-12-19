/**
 * Unit conversion utilities for inch/mm display
 * 
 * Internal storage is always in millimeters (mm)
 * Display conversion is applied based on user's unit preference
 */

/** Conversion factor: 1 inch = 25.4 mm */
const MM_PER_INCH = 25.4;

/**
 * Convert a value from any unit to mm (internal storage)
 * @param value - The value to convert
 * @param unit - The unit of the input value ('inch' or 'mm')
 * @returns The value in millimeters
 */
export function fromAnyUnitToMm(value: number, unit: 'inch' | 'mm'): number {
  return unit === 'inch' ? value * MM_PER_INCH : value;
}

/**
 * Convert a value from mm (internal storage) to any unit
 * @param valueMm - The value in millimeters
 * @param unit - The target unit ('inch' or 'mm')
 * @returns The value in the target unit
 */
export function fromMmToAnyUnit(valueMm: number, unit: 'inch' | 'mm'): number {
  return unit === 'inch' ? valueMm / MM_PER_INCH : valueMm;
}
