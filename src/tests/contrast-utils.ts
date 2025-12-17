/**
 * Utility functions for color contrast calculations in accessibility tests.
 * Implements WCAG 2.1 contrast ratio algorithm for validating forced-colors mode.
 * @see https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */

/** Matches fully transparent rgba colors (alpha = 0 or 0.0, 0.00, etc.) */
const TRANSPARENT_REGEX = /rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0(?:\.0+)?\s*\)/;

/**
 * Minimum contrast ratio for DRO display segments (near-black/white pairs).
 * Higher than WCAG AAA (7:1) to ensure visibility on seven-segment displays.
 */
export const MIN_HIGH_CONTRAST_RATIO = 20;

/**
 * Minimum contrast ratio for buttons matching Windows High Contrast defaults (~17:1).
 * Exceeds WCAG AAA requirements for enhanced accessibility.
 */
export const MIN_ACCESSIBLE_CONTRAST_RATIO = 17;

/**
 * Maximum contrast ratio for "off" or inactive elements that should be nearly invisible.
 * Used to verify that disabled segments blend with the background.
 */
export const APPROX_EQUAL_CONTRAST_RATIO = 1.2;

/**
 * Checks if a color string represents a transparent color.
 * @param color - CSS color string (e.g., "transparent", "none", "rgba(0,0,0,0)")
 * @returns true if the color is fully transparent
 */
export const isTransparentColor = (color: string): boolean => {
  return color === "none" || color === "transparent" || TRANSPARENT_REGEX.test(color);
};

/**
 * Parses a CSS color string into RGB components.
 * @param color - CSS color string in rgb() or rgba() format
 * @returns RGB tuple [r, g, b] or null if transparent
 * @throws Error if color format cannot be parsed
 */
export const parseColor = (color: string): [number, number, number] | null => {
  if (isTransparentColor(color)) {
    return null;
  }

  const rgbMatch = /rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\s*\)/.exec(color);
  if (rgbMatch?.[1] !== undefined && rgbMatch[2] !== undefined && rgbMatch[3] !== undefined) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  throw new Error(`Cannot parse color: ${color}`);
};

/**
 * Calculates relative luminance of an RGB color per WCAG 2.1.
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Relative luminance value (0-1)
 * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export const getLuminance = (r: number, g: number, b: number): number => {
  const adjusted = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  const rs = adjusted[0] ?? 0;
  const gs = adjusted[1] ?? 0;
  const bs = adjusted[2] ?? 0;
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculates WCAG 2.1 contrast ratio between two colors.
 * @param rgb1 - First color as RGB tuple
 * @param rgb2 - Second color as RGB tuple
 * @returns Contrast ratio (1:1 to 21:1)
 * @see https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
export const getContrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Resolves the effective background color, handling transparent backgrounds
 * by falling back to the Canvas system color in forced-colors mode.
 * @param element - DOM element to get background from
 * @returns Resolved background color string
 */
export const getEffectiveBackgroundColor = (element: HTMLElement): string => {
  const bgColor = getComputedStyle(element.parentElement ?? element).backgroundColor;

  if (!isTransparentColor(bgColor)) {
    return bgColor;
  }

  // In forced-colors mode, resolve Canvas system color
  const temp = document.createElement("div");
  temp.style.backgroundColor = "Canvas";
  temp.style.display = "none";
  document.body.appendChild(temp);
  const canvasColor = getComputedStyle(temp).backgroundColor;
  document.body.removeChild(temp);

  if (!isTransparentColor(canvasColor)) {
    return canvasColor;
  }

  // Final fallback to body background
  return getComputedStyle(document.body).backgroundColor;
};
