import HousingEdge from "./HousingEdge";
import BrandLogo from "./BrandLogo";
import MultiAxisSection from "./MultiAxisSection";
import AxisSelectionSection from "./AxisSelectionSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";
import { useDROState, useDRODispatch, useBootSequence } from "../dro-state-machine";
import { useNonVolatileMemoryContext } from "../context/NonVolatileMemoryContext";
import { useDisplayValues } from "../hooks/useDisplayValues";
import { useZeroApproachWarning } from "../hooks/useZeroApproachWarning";

const EL400Simulator = () => {
  const droState = useDROState();
  const dispatch = useDRODispatch();
  const { nvMem } = useNonVolatileMemoryContext();
  const axisDisplayValues = useDisplayValues();

  // Boot sequence logic
  useBootSequence(dispatch, droState, nvMem);
  
  // Zero approach warning monitoring
  useZeroApproachWarning();

  return (
    <div
      className="relative rounded-2xl select-none overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #5a5a5a 0%, #404040 20%, #353535 50%, #2a2a2a 80%, #1a1a1a 100%)',
        border: '2px solid transparent',
        boxShadow: `
          0 25px 80px rgba(0,0,0,0.6),
          0 8px 32px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.15),
          inset 0 -1px 0 rgba(0,0,0,0.4)
        `,
        minWidth: '780px',
      }}
    >
      {/* Top raised edge */}
      <HousingEdge position="top">
        <BrandLogo />
      </HousingEdge>

      {/* Main content area */}
      <div className="px-14 pb-2 pt-4">
        <div className="flex gap-5 items-stretch">
          <MultiAxisSection axisValues={axisDisplayValues} />
          <AxisSelectionSection />
          <KeypadSection />
        </div>

        {/* Bottom section */}
        <div className="mt-5 flex items-end justify-between">
          <PrimaryFunctionSection />
          <SecondaryFunctionSection />
        </div>
      </div>

      {/* Bottom raised edge */}
      <HousingEdge position="bottom" />
    </div>
  );
};

export default EL400Simulator;
