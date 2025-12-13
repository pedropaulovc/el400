import { useState, useCallback } from "react";
import HousingEdge from "./HousingEdge";
import BrandLogo from "./BrandLogo";
import AxisDisplaySection from "./AxisDisplaySection";
import AxisSelectionSection from "./AxisSelectionSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";
import { useMachineState } from "../hooks/useMachineState";
import { useDROMemory, type Axis } from "../hooks/useDROMemory";
import { useSettingsContext } from "../context/SettingsContext";
import { useFunctionMode } from "../hooks/useFunctionMode";

const noop = () => {};

const EL400Simulator = () => {
  // Get machine state from context (may be from CNCjs, LinuxCNC, mock, or manual)
  const machineState = useMachineState();

  // DRO memory manages ABS/INC values and mode switching
  const droMemory = useDROMemory(machineState.connected ? machineState : null);

  // Function mode for center finding and other advanced features
  const functionMode = useFunctionMode();

  // Settings from context (persisted to localStorage)
  const { settings, updateSettings } = useSettingsContext();

  // Local UI state
  const [activeAxis, setActiveAxis] = useState<Axis | null>(null);
  const [inputBuffer, setInputBuffer] = useState('');

  const handleAxisSelect = (axis: Axis) => {
    setActiveAxis(axis);
    setInputBuffer('');
  };

  const handleAxisZero = (axis: Axis) => {
    // In function menu modes, first zero button press navigates to next option
    if (functionMode.mode === 'function-menu' || functionMode.mode === 'center-menu') {
      functionMode.navigateNext();
      return;
    }
    
    // In center finding mode, zero buttons store points
    if (functionMode.mode === 'center-line' || functionMode.mode === 'center-circle') {
      const point = {
        x: droMemory.displayValues.X,
        y: droMemory.displayValues.Y,
        z: droMemory.displayValues.Z,
      };
      functionMode.storePoint(point);
    } else {
      // Normal mode: zero the axis
      droMemory.zeroAxis(axis);
    }
  };

  const handleNumber = useCallback((num: string) => {
    if (!activeAxis) {
      return;
    }
    setInputBuffer(prev => prev + num);
  }, [activeAxis]);

  const handleDecimal = useCallback(() => {
    if (!activeAxis) {
      return;
    }
    if (!inputBuffer.includes('.')) {
      setInputBuffer(prev => prev + '.');
    }
  }, [activeAxis, inputBuffer]);

  const handleSign = useCallback(() => {
    if (!activeAxis) {
      return;
    }
    setInputBuffer(prev => {
      if (prev.startsWith('-')) {
        return prev.slice(1);
      }
      return '-' + prev;
    });
  }, [activeAxis]);

  const handleClear = useCallback(() => {
    setInputBuffer('');
  }, []);

  const handleEnter = useCallback(() => {
    // In function menu modes (not data collection), ENT confirms selection
    if (functionMode.mode === 'function-menu' || functionMode.mode === 'center-menu') {
      functionMode.confirmSelection();
      return;
    }

    // In center finding mode during data collection, ENT works normally to enter values
    // Normal entry mode
    if (!activeAxis || !inputBuffer) {
      return;
    }
    const value = parseFloat(inputBuffer);
    if (!isNaN(value)) {
      droMemory.setAxisValue(activeAxis, value);
    }
    setInputBuffer('');
  }, [activeAxis, inputBuffer, droMemory, functionMode]);


  const handleToggleUnit = () => {
    updateSettings({ defaultUnit: settings.defaultUnit === 'inch' ? 'mm' : 'inch' });
  };

  const handleZeroAll = () => {
    droMemory.zeroAll();
  };

  const handleToggleAbs = () => {
    droMemory.toggleMode();
  };

  const handleHalf = () => {
    if (activeAxis) {
      const currentValue = droMemory.displayValues[activeAxis];
      droMemory.setAxisValue(activeAxis, currentValue / 2);
    }
  };

  const handleFunction = () => {
    if (functionMode.isFnActive) {
      functionMode.exitFunctionMode();
    } else {
      functionMode.enterFunctionMenu();
    }
  };

  // Calculate display values (numeric or text)
  const textDisplay = functionMode.getDisplayText();
  
  // If in center finding mode with all points stored, show distance-to-go
  let displayValues = droMemory.displayValues;
  if (functionMode.centerFinding?.centerPoint && 
      functionMode.centerFinding.points.length === functionMode.centerFinding.expectedPoints) {
    const distanceToGo = functionMode.calculateDistanceToGo({
      x: droMemory.displayValues.X,
      y: droMemory.displayValues.Y,
      z: droMemory.displayValues.Z,
    });
    if (distanceToGo) {
      displayValues = {
        X: distanceToGo.x,
        Y: distanceToGo.y,
        Z: distanceToGo.z,
      };
    }
  }

  return (
    <div
      className="relative rounded-2xl select-none overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #5a5a5a 0%, #404040 20%, #353535 50%, #2a2a2a 80%, #1a1a1a 100%)',
        border: '2px solid transparent', // Visible in forced-colors mode
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
            axisValues={displayValues}
            isAbs={droMemory.mode === 'abs'}
            isInch={settings.defaultUnit === 'inch'}
            textDisplay={textDisplay}
            isFnActive={functionMode.isFnActive}
          />

          <AxisSelectionSection 
            activeAxis={activeAxis}
            onAxisSelect={handleAxisSelect}
            onAxisZero={handleAxisZero}
          />

          <KeypadSection 
            onNumber={handleNumber}
            onClear={handleClear}
            onEnter={handleEnter}
            onSign={handleSign}
            onDecimal={handleDecimal}
          />
        </div>

        {/* Bottom section */}
        <div className="mt-5 flex items-end justify-between">
          <PrimaryFunctionSection
            isInch={settings.defaultUnit === 'inch'}
            isAbs={droMemory.mode === 'abs'}
            onToggleUnit={handleToggleUnit}
            onSettings={noop}
            onToggleAbs={handleToggleAbs}
            onCenter={noop}
            onZeroAll={handleZeroAll}
          />

          <SecondaryFunctionSection
            onBoltCircle={noop}
            onArcContour={noop}
            onAngleHole={noop}
            onGridHole={noop}
            onCalculator={noop}
            onHalf={handleHalf}
            onSDM={noop}
            onFunction={handleFunction}
          />
        </div>

        
      </div>

      {/* Bottom raised edge */}
      <HousingEdge position="bottom" />
    </div>
  );
};

export default EL400Simulator;
