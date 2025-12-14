import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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

const noop = () => {};
export const MODEL_NUMBER = 'EL400';
export const SOFTWARE_VERSION = 'vEr 1.0.0';
export const POWER_ON_DISPLAY_DURATION_MS = 1000;

const EL400Simulator = () => {
  // Get machine state from context (may be from CNCjs, LinuxCNC, mock, or manual)
  const machineState = useMachineState();

  // DRO memory manages ABS/INC values and mode switching
  const droMemory = useDROMemory(machineState.connected ? machineState : null);

  // Settings from context (persisted to localStorage)
  const { settings, updateSettings } = useSettingsContext();

  // Local UI state
  const [activeAxis, setActiveAxis] = useState<Axis | null>(null);
  const [inputBuffer, setInputBuffer] = useState('');
  const powerOnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const shouldBypassPowerOn = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const bypassParam = params.get('bypassPowerOn');
      const forceParam = params.get('forcePowerOn');

      if (forceParam === '1' || forceParam === 'true') {
        return false;
      }

      if (bypassParam === '1' || bypassParam === 'true') {
        return true;
      }
    }

    return import.meta.env.MODE === 'test';
  }, []);

  const [showPowerOnMessage, setShowPowerOnMessage] = useState(!shouldBypassPowerOn);

  useEffect(() => {
    if (!showPowerOnMessage) {
      return;
    }

    powerOnTimerRef.current = setTimeout(() => {
      setShowPowerOnMessage(false);
    }, POWER_ON_DISPLAY_DURATION_MS);

    return () => {
      if (powerOnTimerRef.current) {
        clearTimeout(powerOnTimerRef.current);
        powerOnTimerRef.current = null;
      }
    };
  }, [showPowerOnMessage]);

  const handleAxisSelect = (axis: Axis) => {
    setActiveAxis(axis);
    setInputBuffer('');
  };

  const handleAxisZero = (axis: Axis) => {
    droMemory.zeroAxis(axis);
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
    if (showPowerOnMessage) {
      if (powerOnTimerRef.current) {
        clearTimeout(powerOnTimerRef.current);
        powerOnTimerRef.current = null;
      }
      setShowPowerOnMessage(false);
      return;
    }
    setInputBuffer('');
  }, [showPowerOnMessage]);

  const handleEnter = useCallback(() => {
    if (!activeAxis || !inputBuffer) {
      return;
    }
    const value = parseFloat(inputBuffer);
    if (!isNaN(value)) {
      droMemory.setAxisValue(activeAxis, value);
    }
    setInputBuffer('');
  }, [activeAxis, inputBuffer, droMemory]);


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

  const axisDisplayValues = showPowerOnMessage
    ? { X: MODEL_NUMBER, Y: SOFTWARE_VERSION, Z: droMemory.displayValues.Z }
    : droMemory.displayValues;

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
            axisValues={axisDisplayValues}
            isAbs={droMemory.mode === 'abs'}
            isInch={settings.defaultUnit === 'inch'}
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
