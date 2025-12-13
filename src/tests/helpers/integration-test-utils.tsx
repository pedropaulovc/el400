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

/**
 * Renders the EL400Simulator with all required providers
 */
export function renderSimulator() {
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
  
  // Check if the content is purely numeric (matches /^[-\d.]+$/)
  // Allow [-\d.] characters only if there is at most 1 '.' in the string
  const trimmedContent = textContent.trim();
  const dotCount = (trimmedContent.match(/\./g) || []).length;
  if (/^[-\d.]+$/.test(trimmedContent) && dotCount <= 1) {
    throw new Error(`Expected text value for axis ${axis}, but got numeric value: ${textContent}`);
  }
  
  return textContent;
}

/**
 * Gets the displayed numeric value for an axis from the screen reader text
 * Throws an error if the content cannot be parsed as a number
 */
export function getAxisDisplayPureNumberValue(axis: 'X' | 'Y' | 'Z'): number {
  const valueElement = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
  const textContent = valueElement.textContent || '';
  
  // Extract numeric value using regex /[-\d.]+$/
  const match = textContent.match(/[-\d.]+$/);
  
  if (!match) {
    throw new Error(`Expected numeric value for axis ${axis}, but no numeric match found in: ${textContent}`);
  }
  
  // Only parseFloat if there's at most 1 '.' in the matched string
  const dotCount = (match[0].match(/\./g) || []).length;
  if (dotCount > 1) {
    throw new Error(`Expected numeric value for axis ${axis}, but found multiple decimal points in: ${match[0]}`);
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
