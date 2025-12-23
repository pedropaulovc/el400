import SevenSegmentDigit from "./SevenSegmentDigit";
import { VALID_NUMBER_PATTERN } from "@/lib/patterns";
import { useDisplayX, useDisplayY, useDisplayZ, useStateName } from "../stores/droStore";

export type AxisDisplayValue = number | string;

/** Map axis to its corresponding hook */
const axisHooks = {
  X: useDisplayX,
  Y: useDisplayY,
  Z: useDisplayZ,
} as const;

interface AxisProps {
  axis: 'X' | 'Y' | 'Z';
}

const DISPLAY_WIDTH = 8;

const formatNumberValue = (num: number): { char: string; hasDecimal: boolean }[] => {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toFixed(4);

  const result: { char: string; hasDecimal: boolean }[] = [];

  result.push({ char: isNegative ? '-' : ' ', hasDecimal: false });

  const parts = formatted.split('.');
  const intPart = parts[0] ?? '';
  const decPart = parts[1] ?? '';
  const paddedInt = intPart.padStart(3, ' ');

  for (let i = 0; i < paddedInt.length; i++) {
    result.push({
      char: paddedInt[i] ?? ' ',
      hasDecimal: i === paddedInt.length - 1,
    });
  }

  for (const char of decPart) {
    result.push({ char, hasDecimal: false });
  }

  return result;
};

const formatTextValue = (text: string): { char: string; hasDecimal: boolean }[] => {
  const raw: { char: string; hasDecimal: boolean }[] = [];

  for (const char of text) {
    if (char === '.') {
      if (raw.length > 0) {
        const lastChar = raw[raw.length - 1];
        if (lastChar) {
          lastChar.hasDecimal = true;
        }
      }
      continue;
    }
    raw.push({ char, hasDecimal: false });
  }

  const truncated = raw.slice(-DISPLAY_WIDTH);
  const padded = Array.from({ length: DISPLAY_WIDTH - truncated.length }, () => ({ char: ' ', hasDecimal: false }));

  return padded.concat(truncated);
};

const Axis = ({ axis }: AxisProps) => {
  // Each axis subscribes to its own value only
  const useAxisValue = axisHooks[axis];
  const value = useAxisValue();
  const stateName = useStateName();

  // Check if in function mode (distance-to-go displays leading decimal on 2nd digit)
  const isFunctionMode = stateName === 'distance-to-go';

  const digits = typeof value === 'number' || (typeof value === 'string' && VALID_NUMBER_PATTERN.test(value.trim()))
    ? formatNumberValue(typeof value === 'number' ? value : parseFloat(value))
    : formatTextValue(value);

  // Add leading decimal to 2nd digit when in function mode
  if (isFunctionMode && digits.length >= 2) {
    const secondDigit = digits[1];
    if (secondDigit) {
      digits[1] = { ...secondDigit, hasDecimal: true };
    }
  }

  return (
    <div
      className="flex items-center gap-0.5 px-2"
      aria-hidden="true"
      data-testid={`axis-display-${axis.toLowerCase()}`}
    >
      <div className="flex items-center -space-x-1">
        {digits.map((digit, index) => (
          <div key={index} className="w-12 h-20">
            <SevenSegmentDigit value={digit.char} showDecimal={digit.hasDecimal} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Axis;
