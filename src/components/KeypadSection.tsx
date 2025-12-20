import { useCallback } from "react";
import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";
import { useDRODispatch } from "../stores/dro";

/** Map digit to KEY event name */
const DIGIT_TO_EVENT: Record<string, Parameters<ReturnType<typeof useDRODispatch>>[0]> = {
  '0': { eventName: 'KEY_0' },
  '1': { eventName: 'KEY_1' },
  '2': { eventName: 'KEY_2_DOWN' },
  '3': { eventName: 'KEY_3' },
  '4': { eventName: 'KEY_4_LEFT' },
  '5': { eventName: 'KEY_5' },
  '6': { eventName: 'KEY_6_RIGHT' },
  '7': { eventName: 'KEY_7' },
  '8': { eventName: 'KEY_8_UP' },
  '9': { eventName: 'KEY_9' },
};

/**
 * Numeric keypad section.
 *
 * This component emits raw key events - it has no knowledge of the current
 * DRO state or mode. The state machine reducers interpret the meaning of
 * each key based on the current state (idle, calculator, menu, etc.).
 */
const KeypadSection = () => {
  const dispatch = useDRODispatch();

  const handleNumber = useCallback((num: string) => {
    const event = DIGIT_TO_EVENT[num];
    if (event) {
      dispatch(event);
    }
  }, [dispatch]);

  const handleDecimal = useCallback(() => {
    dispatch({ eventName: 'KEY_DECIMAL' });
  }, [dispatch]);

  const handleSign = useCallback(() => {
    dispatch({ eventName: 'KEY_SIGN' });
  }, [dispatch]);

  const handleClear = useCallback(() => {
    dispatch({ eventName: 'KEY_CLEAR' });
  }, [dispatch]);

  const handleEnter = useCallback(() => {
    dispatch({ eventName: 'KEY_ENTER' });
  }, [dispatch]);

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
            <DROButton size="square" onClick={() => { handleNumber('1'); }} className="p-0 row-start-3 col-start-1" data-testid="key-1" title="1">
              <Icon name="number-1" /><span className="sr-only">1</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('2'); }} className="p-0 row-start-3 col-start-2" data-testid="key-2" title="2 (Down)">
              <Icon name="number-2" /><span className="sr-only">2 (Down)</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('3'); }} className="p-0 row-start-3 col-start-3" data-testid="key-3" title="3">
              <Icon name="number-3" /><span className="sr-only">3</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('4'); }} className="p-0 row-start-2 col-start-1" data-testid="key-4" title="4 (Left)">
              <Icon name="number-4" /><span className="sr-only">4 (Left)</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('5'); }} className="p-0 row-start-2 col-start-2" data-testid="key-5" title="5">
              <Icon name="number-5" /><span className="sr-only">5</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('6'); }} className="p-0 row-start-2 col-start-3" data-testid="key-6" title="6 (Right)">
              <Icon name="number-6" /><span className="sr-only">6 (Right)</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('7'); }} className="p-0 row-start-1 col-start-1" data-testid="key-7" title="7">
              <Icon name="number-7" /><span className="sr-only">7</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('8'); }} className="p-0 row-start-1 col-start-2" data-testid="key-8" title="8 (Up)">
              <Icon name="number-8" /><span className="sr-only">8 (Up)</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('9'); }} className="p-0 row-start-1 col-start-3" data-testid="key-9" title="9">
              <Icon name="number-9" /><span className="sr-only">9</span>
            </DROButton>
            <DROButton size="square" onClick={() => { handleNumber('0'); }} className="p-0 row-start-4 col-start-2" data-testid="key-0" title="0">
              <Icon name="number-0" /><span className="sr-only">0</span>
            </DROButton>
            <DROButton size="square" onClick={handleSign} className="p-0 row-start-4 col-start-1" data-testid="key-sign" title="Toggle sign">
              <Icon name="toggle-sign" /><span className="sr-only">Toggle sign</span>
            </DROButton>
            <DROButton size="square" onClick={handleDecimal} className="p-0 row-start-4 col-start-3" data-testid="key-decimal" title=".">
              <Icon name="dot" /><span className="sr-only">.</span>
            </DROButton>
          </div>

          {/* Bottom row: C, Enter */}
          <div className="flex gap-3 mt-3">
            <DROButton size="square" onClick={handleClear} className="p-0" data-testid="key-clear" title="Clear">
              <Icon name="cancel" /><span className="sr-only">Clear</span>
            </DROButton>
            <DROButton size="enter" onClick={handleEnter} className="p-0" data-testid="key-enter" title="Enter">
              <Icon name="enter" /><span className="sr-only">Enter</span>
            </DROButton>
          </div>
        </div>
      </div>
    </BeveledFrame>
  );
};

export default KeypadSection;
