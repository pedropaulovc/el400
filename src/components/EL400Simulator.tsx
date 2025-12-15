import HousingEdge from "./HousingEdge";
import BrandLogo from "./BrandLogo";
import MultiAxisSection from "./MultiAxisSection";
import AxisSelectionSection from "./AxisSelectionSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { useCenterFinding } from "../context/CenterFindingContext";

export const MODEL_NUMBER = 'EL400';
export const SOFTWARE_VERSION = 'vEr 1.0.0';

const EL400Simulator = () => {
  const vMem = useVolatileMemory();
  const centerFinding = useCenterFinding();

  const showBootMessage = vMem.bootStage === 'showMessage';
  const centerFindingMode = centerFinding.mode;

  // Determine what to show on the display
  let axisDisplayValues;
  
  if (showBootMessage) {
    // Boot message
    axisDisplayValues = { X: MODEL_NUMBER, Y: SOFTWARE_VERSION, Z: '' };
  } else if (centerFindingMode === 'menu') {
    // Show menu option text
    const menuText = centerFinding.menuOption === 'center' ? 'CEntrE' :
                     centerFinding.menuOption === 'line' ? 'LinE' : 'CirCLE';
    axisDisplayValues = { X: menuText, Y: '', Z: '' };
  } else if (centerFindingMode === 'line' && centerFinding.storedPoints.length < 2) {
    // Show "LinE" while collecting points
    axisDisplayValues = { X: 'LinE', Y: '', Z: '' };
  } else if (centerFindingMode === 'circle' && centerFinding.storedPoints.length < 3) {
    // Show "CirCLE" while collecting points
    axisDisplayValues = { X: 'CirCLE', Y: '', Z: '' };
  } else if ((centerFindingMode === 'line' || centerFindingMode === 'circle') && centerFinding.centerResult) {
    // Show distance-to-go when center is calculated
    const center = centerFinding.centerResult;
    const current = vMem.displayValues;
    axisDisplayValues = {
      X: center.X - current.X,
      Y: center.Y - current.Y,
      Z: center.Z - current.Z,
    };
  } else {
    // Normal operation
    axisDisplayValues = vMem.displayValues;
  }

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
