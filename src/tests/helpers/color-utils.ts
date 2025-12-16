/**
 * Color utilities for accessibility testing
 * Used by Storybook stories to validate contrast ratios in forced-colors mode
 */

/**
 * Parse CSS color string to RGB tuple
 * Supports: rgb(), rgba(), transparent, and named colors
 * Handles flexible whitespace in CSS color values
 */
export function parseColor(color: string): [number, number, number] | null {
  // Handle rgb(r, g, b) format with flexible whitespace
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  
  // Handle rgba(r, g, b, a) format with flexible whitespace and decimal alpha
  const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
  }
  
  // Handle transparent/none
  // Note: Returns black (0, 0, 0) for transparent colors. When used in contrast
  // calculations, the caller should check isTransparent() first and use the
  // parent background color instead for accurate results.
  if (isTransparent(color)) {
    return [0, 0, 0]; // Return black for transparent
  }
  
  return null;
}

/**
 * Check if a color is transparent
 * Handles multiple browser representations of transparency
 */
export function isTransparent(color: string): boolean {
  return color === 'transparent' || 
         color === 'rgba(0, 0, 0, 0)' ||
         color === 'none';
}

/**
 * Calculate relative luminance from RGB values (0-255)
 * Per WCAG 2.1 formula
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio as X:1
 */
export function getContrastRatio(
  rgb1: [number, number, number], 
  rgb2: [number, number, number]
): number {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 contrast ratio requirements
 */
export const CONTRAST_RATIOS = {
  /** WCAG 2.1 Level AA - Normal text */
  WCAG_AA_NORMAL: 4.5,
  /** WCAG 2.1 Level AA - Large text */
  WCAG_AA_LARGE: 3,
  /** WCAG 2.1 Level AAA - Normal text */
  WCAG_AAA_NORMAL: 7,
  /** WCAG 2.1 Level AAA - Large text */
  WCAG_AAA_LARGE: 4.5,
  /** EL400 forced-colors requirement for buttons */
  FORCED_COLORS_BUTTON: 17,
  /** EL400 forced-colors requirement for segments */
  FORCED_COLORS_SEGMENT: 20,
} as const;
