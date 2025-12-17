import HousingEdge from "./HousingEdge";
import BrandLogo from "./BrandLogo";
import MultiAxisSection from "./MultiAxisSection";
import AxisSelectionSection from "./AxisSelectionSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import {
  useDROState,
  useDRODispatch,
  useDROContext,
  isFunctionMenuSelectionState,
  isCollectingPoints,
  isResultState,
} from "../dro-state-machine";
import { useNonVolatileMemoryContext } from "../context/NonVolatileMemoryContext";
import { useBootSequence, MODEL_NUMBER, SOFTWARE_VERSION } from "../dro-state-machine/features/boot";

/** Menu text displayed for each function menu state */
const MENU_TEXT_MAP: Record<string, string> = {
  'function-menu-center': 'CEntrE',
  'function-menu-circle': 'CirCLE',
  'function-menu-line': 'LinE',
  'function-menu-linear': 'LinEAr',
  'function-menu-polar': 'PoLAr',
};

const EL400Simulator = () => {
  const vMem = useVolatileMemory();
  const droState = useDROState();
  const droCtx = useDROContext();
  const dispatch = useDRODispatch();
  const { nvMem } = useNonVolatileMemoryContext();

  // Boot sequence logic
  useBootSequence(dispatch, droState, nvMem);

  // Determine what to show on the display
  let axisDisplayValues;

  if (droState === 'showMessage') {
    // Boot message
    axisDisplayValues = { X: MODEL_NUMBER, Y: SOFTWARE_VERSION, Z: '' };
  } else if (isFunctionMenuSelectionState(droState)) {
    // Show menu option text
    const menuText = MENU_TEXT_MAP[droState] ?? '';
    axisDisplayValues = { X: menuText, Y: '', Z: '' };
  } else if (isCollectingPoints(droState)) {
    // While collecting points, show current position (normal display)
    axisDisplayValues = vMem.displayValues;
  } else if (isResultState(droState) && droCtx.stateDataType === 'center-finding' && droCtx.centerResult) {
    // Show distance-to-go when center is calculated
    const center = droCtx.centerResult;
    const current = vMem.displayValues;
    axisDisplayValues = {
      X: center.X - current.X,
      Y: center.Y - current.Y,
      Z: center.Z - current.Z,
    };
  } else {
    // Normal operation (idle, boot, transitional states)
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
