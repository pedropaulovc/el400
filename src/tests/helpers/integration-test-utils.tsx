/**
 * Test utilities for EL400Simulator integration tests
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EL400Simulator from '../../components/EL400Simulator';
import { SettingsProvider } from '../../context/SettingsContext';
import { MachineStateProvider } from '../../context/MachineStateContext';
import { VALID_NUMBER_PATTERN, EXTRACT_NUMBER_FROM_END_PATTERN } from './test-constants';

/**
 * Renders the EL400Simulator with all required providers
 */
export function renderSimulator(options?: { searchParams?: string }) {
  const search = options?.searchParams ?? 'bypassPowerOn=1';
  if (typeof window !== 'undefined') {
    const url = `${window.location.pathname}?${search}`;
    window.history.replaceState({}, '', url);
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MachineStateProvider>
          <SettingsProvider>
            <EL400Simulator />
          </SettingsProvider>
        </MachineStateProvider>
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
