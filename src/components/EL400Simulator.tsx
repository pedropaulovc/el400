import HousingEdge from "./HousingEdge";
import BrandLogo from "./BrandLogo";
import AxisDisplaySection from "./AxisDisplaySection";
import AxisSelectionSection from "./AxisSelectionSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";
import { useVolatileMemory, type Axis } from "../hooks/useVolatileMemory";
import { useNonVolatileMemoryContext } from "../context/NonVolatileMemoryContext";
import { usePowerOnSequence } from "../hooks/usePowerOnSequence";

const noop = () => {};
export const MODEL_NUMBER = 'EL400';
export const SOFTWARE_VERSION = 'vEr 1.0.0';
export const POWER_ON_DISPLAY_DURATION_MS = 1000;

const EL400Simulator = () => {
  // Unified volatile memory (machine state + DRO memory)
  const vMem = useVolatileMemory();

  // Non-volatile memory (persisted settings)
  const { memory: nvMem, updateMemory } = useNonVolatileMemoryContext();

  // Power-on sequence
  const { showPowerOnMessage, dismissPowerOnMessage } = usePowerOnSequence(POWER_ON_DISPLAY_DURATION_MS);

  // Handlers
  const handleToggleUnit = () => {
    updateMemory({ defaultUnit: nvMem.defaultUnit === 'inch' ? 'mm' : 'inch' });
  };

  const handleHalf = () => {
    if (vMem.activeAxis) {
      vMem.halfAxis(vMem.activeAxis);
    }
  };

  const handleClear = () => {
    if (showPowerOnMessage) {
      dismissPowerOnMessage();
    }
  };

  const axisDisplayValues = showPowerOnMessage
    ? { X: MODEL_NUMBER, Y: SOFTWARE_VERSION, Z: '' }
    : vMem.displayValues;

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
          <AxisDisplaySection
            axisValues={axisDisplayValues}
            isAbs={vMem.mode === 'abs'}
            isInch={nvMem.defaultUnit === 'inch'}
          />

          <AxisSelectionSection
            activeAxis={vMem.activeAxis}
            onAxisSelect={vMem.selectAxis}
            onAxisZero={vMem.zeroAxis}
          />

          <KeypadSection onClear={handleClear} />
        </div>

        {/* Bottom section */}
        <div className="mt-5 flex items-end justify-between">
          <PrimaryFunctionSection
            isInch={nvMem.defaultUnit === 'inch'}
            isAbs={vMem.mode === 'abs'}
            onToggleUnit={handleToggleUnit}
            onSettings={noop}
            onToggleAbs={vMem.toggleMode}
            onCenter={noop}
            onZeroAll={vMem.zeroAll}
          />

          <SecondaryFunctionSection
            onBoltCircle={noop}
            onArcContour={noop}
            onAngleHole={noop}
            onGridHole={noop}
            onCalculator={noop}
            onHalf={handleHalf}
            onSDM={noop}
            onFunction={noop}
          />
        </div>
      </div>

      {/* Bottom raised edge */}
      <HousingEdge position="bottom" />
    </div>
  );
};

export default EL400Simulator;
