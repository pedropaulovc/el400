import SecondaryFunctionButtons from "./SecondaryFunctionButtons";
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
  onFunction
}: SecondaryFunctionSectionProps) => {
  return <BeveledFrame style={{ width: '280px' }}>
      <div style={{
      background: '#000000'
    }} className="p-3 rounded-lg h-full">
        <SecondaryFunctionButtons onBoltCircle={onBoltCircle} onArcContour={onArcContour} onAngleHole={onAngleHole} onGridHole={onGridHole} onCalculator={onCalculator} onHalf={onHalf} onSDM={onSDM} onFunction={onFunction} />
      </div>
    </BeveledFrame>;
};
export default SecondaryFunctionSection;