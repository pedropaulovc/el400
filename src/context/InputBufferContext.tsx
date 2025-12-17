/**
 * Context for sharing numeric input buffer state between KeypadSection and keyboard shortcuts.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface InputBufferContextValue {
  /** Current buffer content as string */
  buffer: string;
  /** Append a digit (0-9) to the buffer */
  appendDigit: (digit: string) => void;
  /** Append a decimal point (if not already present) */
  appendDecimal: () => void;
  /** Toggle the sign (positive/negative) */
  toggleSign: () => void;
  /** Clear the buffer */
  clear: () => void;
  /** Get the buffer value as a number (or null if empty/invalid) */
  getValue: () => number | null;
}

const InputBufferContext = createContext<InputBufferContextValue | null>(null);

export interface InputBufferProviderProps {
  children: ReactNode;
}

/**
 * Provider component for input buffer state.
 * Used by KeypadSection to accumulate digit input before committing a value.
 */
export function InputBufferProvider({ children }: InputBufferProviderProps) {
  const [buffer, setBuffer] = useState('');

  const appendDigit = useCallback((digit: string) => {
    setBuffer((prev) => prev + digit);
  }, []);

  const appendDecimal = useCallback(() => {
    setBuffer((prev) => {
      if (prev.includes('.')) {
        return prev; // Already has a decimal point
      }
      return prev + '.';
    });
  }, []);

  const toggleSign = useCallback(() => {
    setBuffer((prev) => {
      if (prev.startsWith('-')) {
        return prev.slice(1);
      }
      return '-' + prev;
    });
  }, []);

  const clear = useCallback(() => {
    setBuffer('');
  }, []);

  const getValue = useCallback(() => {
    if (!buffer || buffer === '-' || buffer === '.') {
      return null;
    }
    const value = parseFloat(buffer);
    return isNaN(value) ? null : value;
  }, [buffer]);

  const contextValue: InputBufferContextValue = {
    buffer,
    appendDigit,
    appendDecimal,
    toggleSign,
    clear,
    getValue,
  };

  return (
    <InputBufferContext.Provider value={contextValue}>
      {children}
    </InputBufferContext.Provider>
  );
}

/**
 * Hook to access the input buffer context.
 * Must be used within an InputBufferProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useInputBufferContext(): InputBufferContextValue {
  const context = useContext(InputBufferContext);

  if (context === null) {
    throw new Error('useInputBufferContext must be used within an InputBufferProvider');
  }

  return context;
}
