/**
 * Test utilities for EL400Simulator integration tests
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EL400Simulator from '../../components/EL400Simulator';
import { VALID_NUMBER_PATTERN, EXTRACT_NUMBER_FROM_END_PATTERN } from './test-constants';
import type { NonVolatileMemory } from '../../types/nonVolatileMemory';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../types/nonVolatileMemory';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMillStore } from '../../stores/millStore';
import { useDROStore } from '../../stores/droStore';
import { NoOpMillConnection } from '../../adapters/NoOpMillConnection';
import { INITIAL_DRO_STATE_PAYLOAD } from '../../dro-state-machine/droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';
import { createDefaultMillState } from '../../types/millState';

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
 * Resets all Zustand stores to their initial state.
 *
 * Note on test isolation: Vitest runs each test file in isolation by default,
 * meaning each file gets its own module scope and store instances.
 * Tests within the same file run sequentially, so there are no race conditions.
 * This function is called by renderSimulator() automatically.
 *
 * Note on NoOpMillConnection: This is a lightweight no-op implementation that
 * doesn't hold any resources (no sockets, timers, etc.). Previous instances
 * are garbage collected when replaced by new ones - no explicit cleanup needed.
 */
export function resetStores(): void {
  // Reset settings store
  useSettingsStore.setState({
    nvMem: {
      beepEnabled: true,
      defaultUnit: 'inch',
      precision: 4,
      bootMessageMode: 'skip', // Skip boot for faster tests
    },
  });

  // Reset mill store (NoOpMillConnection is lightweight, no cleanup needed)
  useMillStore.setState({
    millState: createDefaultMillState('noop'),
    connection: new NoOpMillConnection(),
    isConnecting: false,
    error: null,
  });

  // Reset DRO store
  useDROStore.setState({
    stateName: INITIAL_DRO_STATE_PAYLOAD.stateName,
    stateData: INITIAL_DRO_STATE_PAYLOAD.stateData,
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
  });
}

/**
 * Sets DRO store to idle state for tests that skip boot.
 */
export function setIdleState(): void {
  useDROStore.setState({
    stateName: 'idle',
    stateData: { stateDataType: 'none' },
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
  });
}

interface RenderSimulatorOptions {
  /** Boot message mode - defaults to 'skip' for faster tests */
  bootMessageMode?: 'show' | 'skip';
}

/**
 * Renders the EL400Simulator with all required providers.
 * Defaults to skipping boot message for faster tests.
 *
 * Note: Uses NoOpMillConnection which is a lightweight no-op implementation
 * that doesn't hold any resources (no sockets, timers, etc.) and doesn't
 * require explicit cleanup. The connection is reset via resetStores() which
 * is called at the start of each test.
 */
export function renderSimulator(options?: RenderSimulatorOptions) {
  const { bootMessageMode = 'skip' } = options ?? {};

  // Reset stores first (also initializes NoOpMillConnection)
  resetStores();

  // Set boot message mode
  useSettingsStore.getState().updateNvMem({ bootMessageMode });

  // If skipping boot, start in idle state
  if (bootMessageMode === 'skip') {
    setIdleState();
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <EL400Simulator />
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
