const TRANSPARENT_REGEX = /rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0(?:\.\d+)?\s*\)/;

export const MIN_HIGH_CONTRAST_RATIO = 20;
export const MIN_ACCESSIBLE_CONTRAST_RATIO = 17;
export const APPROX_EQUAL_CONTRAST_RATIO = 1.5;

export const isTransparentColor = (color: string): boolean => {
  return color === "none" || color === "transparent" || TRANSPARENT_REGEX.test(color);
};

export const parseColor = (color: string): [number, number, number] => {
  if (isTransparentColor(color)) {
    return [0, 0, 0];
  }

  const rgbMatch = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\s*\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  throw new Error(`Cannot parse color: ${color}`);
};

export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
  const l1 = getLuminance(...rgb1);
  const l2 = getLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};
