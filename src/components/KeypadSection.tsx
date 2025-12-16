import { useCallback } from "react";
import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { useInputBuffer } from "../hooks/useInputBuffer";
import {
  useDROState,
  useDRODispatch,
  isFunctionMenuSelectionState,
  isCollectingPoints,
} from "../dro-state-machine";

const KeypadSection = () => {
  const vMem = useVolatileMemory();
  const inputBuffer = useInputBuffer();
  const droState = useDROState();
  const dispatch = useDRODispatch();

  const handleNumber = useCallback((num: string) => {
    // Dispatch raw key events to the operation state machine
    // The reducer interprets them based on current state

    if (num === '4') {
      // Key 4: In function menu, navigate left; otherwise digit entry
      if (isFunctionMenuSelectionState(droState)) {
        dispatch({ eventName: 'KEY_4_LEFT' });
        return;
      }
    }

    if (num === '6') {
      // Key 6: In function menu, navigate right; in collecting mode, store point
      if (isFunctionMenuSelectionState(droState)) {
        dispatch({ eventName: 'KEY_6_RIGHT' });
        return;
      }
      if (isCollectingPoints(droState)) {
        // Attach current position data for point storage
        dispatch({
          eventName: 'POINT_DATA',
          point: {
            X: vMem.displayValues.X,
            Y: vMem.displayValues.Y,
            Z: vMem.displayValues.Z,
          },
        });
        return;
      }
    }

    // Normal mode: append digit if axis selected
    if (!vMem.activeAxis) {
      return;
    }
    inputBuffer.appendDigit(num);
  }, [droState, dispatch, vMem, inputBuffer]);

  const handleDecimal = useCallback(() => {
    if (!vMem.activeAxis) {
      return;
    }
    inputBuffer.appendDecimal();
  }, [vMem.activeAxis, inputBuffer]);

  const handleSign = useCallback(() => {
    if (!vMem.activeAxis) {
      return;
    }
    inputBuffer.toggleSign();
  }, [vMem.activeAxis, inputBuffer]);

  const handleClear = useCallback(() => {
    inputBuffer.clear();
    // Dispatch KEY_CLEAR to state machine - handles boot dismiss and menu exit
    dispatch({ eventName: 'KEY_CLEAR' });
  }, [inputBuffer, dispatch]);

  const handleEnter = useCallback(() => {
    // In function menu, ENT confirms the selection
    if (isFunctionMenuSelectionState(droState)) {
      dispatch({ eventName: 'KEY_ENTER' });
      return;
    }

    // Normal mode: handle numeric entry
    if (!vMem.activeAxis) {
      return;
    }
    const value = inputBuffer.getValue();
    if (value !== null) {
      vMem.setAxisValue(vMem.activeAxis, value);
      inputBuffer.clear();
    }
  }, [droState, dispatch, vMem, inputBuffer]);

  return (
    <BeveledFrame>
      <div
        className="p-2 rounded-lg h-full flex items-center"
        style={{
          background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
        }}
      >
        <div className="flex flex-col h-full">
          <h2 className="sr-only">Numeric keypad</h2>
          {/* Grid layout: visual order 7-8-9, 4-5-6, 1-2-3, ±-0-., C-Enter */}
          {/* HTML order: 1-9, 0, then modifiers for natural tab order */}
          <div className="grid grid-cols-3 gap-3 flex-1" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
            <DROButton size="square" onClick={() => handleNumber('1')} className="p-0 row-start-3 col-start-1" data-testid="key-1">
              <Icon name="number-1" /><span className="sr-only">1</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('2')} className="p-0 row-start-3 col-start-2" data-testid="key-2">
              <Icon name="number-2" /><span className="sr-only">2 (Down)</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('3')} className="p-0 row-start-3 col-start-3" data-testid="key-3">
              <Icon name="number-3" /><span className="sr-only">3</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('4')} className="p-0 row-start-2 col-start-1" data-testid="key-4">
              <Icon name="number-4" /><span className="sr-only">4 (Left)</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('5')} className="p-0 row-start-2 col-start-2" data-testid="key-5">
              <Icon name="number-5" /><span className="sr-only">5</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('6')} className="p-0 row-start-2 col-start-3" data-testid="key-6">
              <Icon name="number-6" /><span className="sr-only">6 (Right)</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('7')} className="p-0 row-start-1 col-start-1" data-testid="key-7">
              <Icon name="number-7" /><span className="sr-only">7</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('8')} className="p-0 row-start-1 col-start-2" data-testid="key-8">
              <Icon name="number-8" /><span className="sr-only">8 (Up)</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('9')} className="p-0 row-start-1 col-start-3" data-testid="key-9">
              <Icon name="number-9" /><span className="sr-only">9</span>
            </DROButton>
            <DROButton size="square" onClick={() => handleNumber('0')} className="p-0 row-start-4 col-start-2" data-testid="key-0">
              <Icon name="number-0" /><span className="sr-only">0</span>
            </DROButton>
            <DROButton size="square" onClick={handleSign} className="p-0 row-start-4 col-start-1" data-testid="key-sign">
              <Icon name="toggle-sign" /><span className="sr-only">Toggle sign</span>
            </DROButton>
            <DROButton size="square" onClick={handleDecimal} className="p-0 row-start-4 col-start-3" data-testid="key-decimal">
              <Icon name="dot" /><span className="sr-only">.</span>
            </DROButton>
          </div>

          {/* Bottom row: C, Enter */}
          <div className="flex gap-3 mt-3">
            <DROButton size="square" onClick={handleClear} className="p-0" data-testid="key-clear">
              <Icon name="cancel" /><span className="sr-only">Clear</span>
            </DROButton>
            <DROButton size="enter" onClick={handleEnter} className="p-0" data-testid="key-enter">
              <Icon name="enter" /><span className="sr-only">Enter</span>
            </DROButton>
          </div>
        </div>
      </div>
    </BeveledFrame>
  );
};

export default KeypadSection;
