import { SecondaryFunctionButtons } from "./FunctionButtons";
import BeveledFrame from "./BeveledFrame";
interface SecondaryFunctionSectionProps {
  onToolOffset: () => void;
  onBoltCircle: () => void;
  onLinearPattern: () => void;
  onHalf: () => void;
  onSDM: () => void;
  onFunction: () => void;
}
const SecondaryFunctionSection = ({
  onToolOffset,
  onBoltCircle,
  onLinearPattern,
  onHalf,
  onSDM,
  onFunction
}: SecondaryFunctionSectionProps) => {
  return <BeveledFrame style={{ width: '280px' }}>
      <div style={{
      background: '#000000'
    }} className="p-2 rounded-lg h-full">
        <SecondaryFunctionButtons onToolOffset={onToolOffset} onBoltCircle={onBoltCircle} onLinearPattern={onLinearPattern} onHalf={onHalf} onSDM={onSDM} onFunction={onFunction} />
      </div>
    </BeveledFrame>;
};
export default SecondaryFunctionSection;