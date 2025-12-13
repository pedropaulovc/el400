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
    <BeveledFrame style={{ width: '280px' }}>
      <div style={{ background: '#000000' }} className="p-3 rounded-lg h-full">
        <div className="flex flex-col gap-4 h-full justify-center">
          {/* Top row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={onBoltCircle} variant="dark" size="secondary" className="p-0" data-testid="btn-bolt-circle">
              <Icon name="bolt-hole-pcd-function" alt="Bolt hole" />
            </DROButton>
            <DROButton onClick={onArcContour} variant="dark" size="secondary" className="p-0" data-testid="btn-arc-contour">
              <Icon name="arc-contouring-function" alt="Arc contour" />
            </DROButton>
            <DROButton onClick={onAngleHole} variant="dark" size="secondary" className="p-0" data-testid="btn-angle-hole">
              <Icon name="angle-hole-function" alt="Angle hole" />
            </DROButton>
            <DROButton onClick={onGridHole} variant="dark" size="secondary" className="p-0" data-testid="btn-grid-hole">
              <Icon name="grid-hole-function" alt="Grid hole" />
            </DROButton>
          </div>

          {/* Bottom row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={onCalculator} variant="dark" size="secondary" className="p-0" data-testid="btn-calculator">
              <Icon name="calculator" alt="Calculator" />
            </DROButton>
            <DROButton onClick={onHalf} variant="dark" size="secondary" className="p-0" data-testid="btn-half">
              <Icon name="half-function" alt="Half" />
            </DROButton>
            <DROButton onClick={onSDM} variant="dark" size="secondary" className="p-0" data-testid="btn-sdm">
              <Icon name="sdm-function" alt="SDM" />
            </DROButton>
            <DROButton onClick={onFunction} variant="dark" size="secondary" className="p-0" data-testid="btn-function">
              <Icon name="function" alt="Function" />
            </DROButton>
          </div>
        </div>
      </div>
    </BeveledFrame>
  );
};

export default SecondaryFunctionSection;
