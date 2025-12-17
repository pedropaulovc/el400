/**
 * Test utilities for EL400Simulator integration tests
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EL400Simulator from '../../components/EL400Simulator';
import { NonVolatileMemoryProvider } from '../../context/NonVolatileMemoryContext';
import { MillStateProvider } from '../../context/MillStateContext';
import { VolatileMemoryProvider } from '../../context/VolatileMemoryContext';
import { InputBufferProvider } from '../../context/InputBufferContext';
import { DROProvider } from '../../dro-state-machine';
import { VALID_NUMBER_PATTERN, EXTRACT_NUMBER_FROM_END_PATTERN } from './test-constants';
import type { NonVolatileMemory } from '../../types/nonVolatileMemory';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../types/nonVolatileMemory';
/**
 * Sets non-volatile memory in localStorage
 * Can set partial values - merges with existing data
 */
export function setNonVolatileMemory(values: Partial<NonVolatileMemory>): void {
  const existing = localStorage.getItem(NON_VOLATILE_MEMORY_STORAGE_KEY);
  const current = existing ? JSON.parse(existing) : {};
  localStorage.setItem(NON_VOLATILE_MEMORY_STORAGE_KEY, JSON.stringify({
    ...current,
    ...values,
  }));
}

/**
 * Clears non-volatile memory from localStorage
 */
export function clearNonVolatileMemory(): void {
  localStorage.removeItem(NON_VOLATILE_MEMORY_STORAGE_KEY);
}

interface RenderSimulatorOptions {
  /** Boot message mode - defaults to 'skip' for faster tests */
  bootMessageMode?: 'show' | 'skip';
}

/**
 * Renders the EL400Simulator with all required providers
 * Defaults to skipping boot message for faster tests
 */
export function renderSimulator(options?: RenderSimulatorOptions) {
  const { bootMessageMode = 'skip' } = options ?? {};

  setNonVolatileMemory({ bootMessageMode });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NonVolatileMemoryProvider>
          <MillStateProvider>
            <VolatileMemoryProvider>
              <InputBufferProvider>
                <DROProvider>
                  <EL400Simulator />
                </DROProvider>
              </InputBufferProvider>
            </VolatileMemoryProvider>
          </MillStateProvider>
        </NonVolatileMemoryProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Gets the displayed text value for an axis from the screen reader text
 * Throws an error if the content is purely numeric
 */
export function getAxisDisplayPureTextValue(axis: 'X' | 'Y' | 'Z'): string {
  const valueElement = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
  const textContent = valueElement.textContent || '';
  
  const trimmedContent = textContent.trim();
  
  if (VALID_NUMBER_PATTERN.test(trimmedContent)) {
    throw new Error(`Expected text value for axis ${axis}, but got numeric value: ${trimmedContent}`);
  }
  
  return trimmedContent;
}

/**
 * Gets the displayed numeric value for an axis from the screen reader text
 * Throws an error if the content cannot be parsed as a number
 */
export function getAxisDisplayPureNumberValue(axis: 'X' | 'Y' | 'Z'): number {
  const valueElement = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
  const textContent = valueElement.textContent || '';
  
  const trimmedContent = textContent.trim();
  const match = trimmedContent.match(EXTRACT_NUMBER_FROM_END_PATTERN);
  
  if (!match) {
    throw new Error(`Expected numeric value for axis ${axis}, but no numeric match found in: ${textContent}`);
  }
  
  const parsedValue = parseFloat(match[0]);
  
  if (isNaN(parsedValue)) {
    throw new Error(`Expected numeric value for axis ${axis}, but parsing resulted in NaN from: ${match[0]}`);
  }
  
  return parsedValue;
}

/**
 * Enters a numeric value via the keypad for the currently selected axis
 * Supports digits 0-9, decimal point '.', and negative sign '-'
 */
export async function enterValue(
  user: ReturnType<typeof userEvent.setup>,
  value: string
) {
  for (const char of value) {
    if (char === '.') {
      await user.click(screen.getByTestId('key-decimal'));
    } else if (char === '-') {
      await user.click(screen.getByTestId('key-sign'));
    } else {
      await user.click(screen.getByTestId(`key-${char}`));
    }
  }
  await user.click(screen.getByTestId('key-enter'));
}
