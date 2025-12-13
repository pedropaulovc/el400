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
 * Gets the displayed value for an axis from the screen reader text
 */
export function getAxisDisplayValue(axis: 'X' | 'Y' | 'Z'): number {
  const valueElement = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
  const match = valueElement.textContent?.match(/[-\d.]+$/);
  return match ? parseFloat(match[0]) : NaN;
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
