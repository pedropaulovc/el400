import DROButton from "./DROButton";
import { Wrench, RotateCcw, Crosshair, ArrowRightToLine, Grid3X3, Ruler, Target, Settings } from "lucide-react";

interface FunctionButtonsProps {
  isInch: boolean;
  isAbs: boolean;
  onToggleUnit: () => void;
  onSettings: () => void;
  onCalibrate: () => void;
  onCenter: () => void;
  onZeroAll: () => void;
  onToolOffset: () => void;
  onBoltCircle: () => void;
  onLinearPattern: () => void;
  onHalf: () => void;
  onSDM: () => void;
  onFunction: () => void;
}

const FunctionButtons = ({
  onSettings,
  onCalibrate,
  onToggleUnit,
  onCenter,
  onZeroAll,
  onToolOffset,
  onBoltCircle,
  onLinearPattern,
  onHalf,
  onSDM,
  onFunction,
}: FunctionButtonsProps) => {
  return (
    <div className="flex gap-6">
      {/* Left function buttons row */}
      <div className="flex gap-1.5">
        <DROButton onClick={onSettings} size="lg">
          <Wrench className="w-5 h-5" />
        </DROButton>
        <DROButton onClick={onCalibrate} size="lg">
          <RotateCcw className="w-5 h-5" />
        </DROButton>
        <DROButton onClick={onToggleUnit} size="lg">
          <div className="flex flex-col items-center leading-none">
            <span className="text-[9px] font-bold">in</span>
            <span className="text-[9px] font-bold">mm</span>
          </div>
        </DROButton>
        <DROButton onClick={onCenter} size="lg">
          <Crosshair className="w-5 h-5" />
        </DROButton>
        <DROButton onClick={onZeroAll} size="lg">
          <span className="flex items-center gap-0.5">
            <ArrowRightToLine className="w-3 h-3" />
            <span className="text-sm font-bold">0</span>
          </span>
        </DROButton>
      </div>

      {/* Right side function buttons - 2 rows */}
      <div className="flex flex-col gap-1.5 ml-auto">
        {/* Top row */}
        <div className="flex gap-1.5">
          <DROButton onClick={onToolOffset} variant="dark" size="lg">
            <Target className="w-4 h-4 text-white" />
          </DROButton>
          <DROButton onClick={onBoltCircle} variant="dark" size="lg">
            <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </DROButton>
          <DROButton onClick={onLinearPattern} variant="dark" size="lg">
            <Ruler className="w-4 h-4 text-white" />
          </DROButton>
          <DROButton onClick={() => {}} variant="dark" size="lg">
            <Settings className="w-4 h-4 text-white" />
          </DROButton>
        </div>
        
        {/* Bottom row */}
        <div className="flex gap-1.5">
          <DROButton onClick={() => {}} variant="dark" size="lg">
            <Grid3X3 className="w-4 h-4 text-white" />
          </DROButton>
          <DROButton onClick={onHalf} variant="dark" size="lg">
            <span className="text-sm font-bold text-white">½</span>
          </DROButton>
          <DROButton onClick={onSDM} variant="dark" size="lg">
            <span className="text-[7px] font-bold text-white">SDM</span>
          </DROButton>
          <DROButton onClick={onFunction} variant="dark" size="lg">
            <span className="text-xs text-white">f<sup>n</sup></span>
          </DROButton>
        </div>
      </div>
    </div>
  );
};

export default FunctionButtons;
