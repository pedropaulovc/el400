import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";

interface SecondaryFunctionSectionProps {
  onBoltCircle: () => void;
  onArcContour: () => void;
  onAngleHole: () => void;
  onGridHole: () => void;
  onCalculator: () => void;
  onHalf: () => void;
  onSDM: () => void;
  onFunction: () => void;
}

const SecondaryFunctionSection = ({
  onBoltCircle,
  onArcContour,
  onAngleHole,
  onGridHole,
  onCalculator,
  onHalf,
  onSDM,
  onFunction,
}: SecondaryFunctionSectionProps) => {
  return (
    <>
      <h2 className="sr-only">Secondary functions</h2>
      <BeveledFrame style={{ width: '280px' }}>
      <div style={{ background: '#000000' }} className="p-3 rounded-lg h-full">
        <div className="flex flex-col gap-4 h-full justify-center">
          {/* Top row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={onBoltCircle} variant="dark" size="secondary" className="p-0" data-testid="btn-bolt-circle">
              <Icon name="bolt-hole-pcd-function" /><span className="sr-only">Bolt hole</span>
            </DROButton>
            <DROButton onClick={onArcContour} variant="dark" size="secondary" className="p-0" data-testid="btn-arc-contour">
              <Icon name="arc-contouring-function" /><span className="sr-only">Arc contour</span>
            </DROButton>
            <DROButton onClick={onAngleHole} variant="dark" size="secondary" className="p-0" data-testid="btn-angle-hole">
              <Icon name="angle-hole-function" /><span className="sr-only">Angle hole</span>
            </DROButton>
            <DROButton onClick={onGridHole} variant="dark" size="secondary" className="p-0" data-testid="btn-grid-hole">
              <Icon name="grid-hole-function" /><span className="sr-only">Grid hole</span>
            </DROButton>
          </div>

          {/* Bottom row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={onCalculator} variant="dark" size="secondary" className="p-0" data-testid="btn-calculator">
              <Icon name="calculator" /><span className="sr-only">Calculator</span>
            </DROButton>
            <DROButton onClick={onHalf} variant="dark" size="secondary" className="p-0" data-testid="btn-half">
              <Icon name="half-function" /><span className="sr-only">Half</span>
            </DROButton>
            <DROButton onClick={onSDM} variant="dark" size="secondary" className="p-0" data-testid="btn-sdm">
              <Icon name="sdm-function" /><span className="sr-only">SDM</span>
            </DROButton>
            <DROButton onClick={onFunction} variant="dark" size="secondary" className="p-0" data-testid="btn-function">
              <Icon name="function" /><span className="sr-only">Function</span>
            </DROButton>
          </div>
        </div>
      </div>
    </BeveledFrame>
    </>
  );
};

export default SecondaryFunctionSection;
