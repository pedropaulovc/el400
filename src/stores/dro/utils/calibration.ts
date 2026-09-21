import type { NonVolatileMemory } from '../../../types/nonVolatileMemory';
import type { VolatileMemoryState } from '../../../types/volatileMemory';
import type { CalibrationPoint } from '../../../types/calibration';

type Axis = 'X' | 'Y' | 'Z';

/** Each cumulative point must advance in the same direction as its standard. */
export function validCalibrationPoints(points: readonly CalibrationPoint[]): boolean {
  const first = points[0];
  if (first === undefined || points.length > 99) return false;
  const direction = Math.sign(first.measuredMm);
  let measured = 0;
  let reference = 0;
  for (const point of points) {
    if (!Number.isFinite(point.measuredMm) || !Number.isFinite(point.referenceMm)
      || (point.measuredMm - measured) * direction <= 0
      || (point.referenceMm - reference) * direction <= 0) return false;
    measured = point.measuredMm;
    reference = point.referenceMm;
  }
  return true;
}

/** Machine coordinates before datum subtraction. PPR decoding belongs to the encoder boundary. */
export function applyAxisCalibration(
  axis: Axis, positionMm: number, vMem: VolatileMemoryState, nvMem: NonVolatileMemory,
): number {
  const calibration = nvMem.calibration[axis];
  if (calibration.kind === 'none' || calibration.kind === 'ppr') return positionMm;
  if (calibration.kind === 'lec' || calibration.kind === 'angular') return positionMm * calibration.factor;
  const mark = vMem.referenceMarks[axis];
  const first = calibration.points[0];
  if (mark === undefined || first === undefined) return positionMm;
  const origin = mark + calibration.originMm;
  const relative = positionMm - origin;
  const points = calibration.points;
  const direction = Math.sign(first.measuredMm);
  let beforeMeasured = 0;
  let beforeReference = 0;
  // Use the nearest segment's slope outside the calibrated interval as well.
  // At every join both segments reproduce the same reference coordinate.
  let index = 0;
  for (const point of points) {
    if (relative * direction <= point.measuredMm * direction || index === points.length - 1) {
      const slope = (point.referenceMm - beforeReference) / (point.measuredMm - beforeMeasured);
      return origin + beforeReference + (relative - beforeMeasured) * slope;
    }
    beforeMeasured = point.measuredMm;
    beforeReference = point.referenceMm;
    index++;
  }
  return positionMm;
}
