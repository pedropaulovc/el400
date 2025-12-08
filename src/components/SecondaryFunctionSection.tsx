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
  return <BeveledFrame className="ml-auto">
      <div style={{
      background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)'
    }} className="p-2 rounded-lg bg-primary-foreground">
        <SecondaryFunctionButtons onToolOffset={onToolOffset} onBoltCircle={onBoltCircle} onLinearPattern={onLinearPattern} onHalf={onHalf} onSDM={onSDM} onFunction={onFunction} />
      </div>
    </BeveledFrame>;
};
export default SecondaryFunctionSection;