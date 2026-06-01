/**
 * Test utilities for EL400Simulator integration tests
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EL400Simulator from '../../components/EL400Simulator';
import { VALID_NUMBER_PATTERN, parseNumericValue } from './test-constants';
import type { NonVolatileMemory } from '../../types/nonVolatileMemory';
import { NON_VOLATILE_MEMORY_STORAGE_KEY } from '../../types/nonVolatileMemory';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMillStore } from '../../stores/millStore';
import { useDROStore } from '../../stores/droStore';
import { NoOpMillAdapter } from '../../adapters/NoOpMillAdapter';
import { INITIAL_DRO_STATE_PAYLOAD } from '../../stores/dro/droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';
import { INITIAL_DISPLAY_STATE } from '../../stores/dro/utils/displayComputation';
import { createDefaultMillState } from '../../types/millState';
import {
  DeepProfiler,
  startTestProfiling,
  endTestProfiling,
  enableProfiling,
  printReport,
  exportReportAsJSON,
  getAllReports,
  clearReports,
  getSummaryStats,
  getComponentStats,
  type TestRenderReport,
} from './render-profiler';
import ProfiledEL400Simulator, {
  enableComponentProfiling,
  clearComponentMetrics,
  getComponentMetrics,
  printComponentMetrics,
} from './ProfiledEL400Simulator';

// Re-export profiling utilities for use in tests
export {
  startTestProfiling,
  endTestProfiling,
  enableProfiling,
  printReport,
  exportReportAsJSON,
  getAllReports,
  clearReports,
  getSummaryStats,
  getComponentStats,
  type TestRenderReport,
  // Component-level profiling
  enableComponentProfiling,
  clearComponentMetrics,
  getComponentMetrics,
  printComponentMetrics,
};

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
 * Note on NoOpMillAdapter: This is a lightweight no-op implementation that
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
      scaleResolution: { X: '5', Y: '5', Z: '5' },
      displayResolution: { X: '5', Y: '5', Z: '5' },
      angularResolution: { X: 'dd-mn', Y: 'dd-mn', Z: 'dd-mn' },
      taperOnAxis: 'X',
      axisDirection: { X: 'normal', Y: 'normal', Z: 'normal' },
      zDepthSense: 'depth-negative',
      zeroApproachEnabled: false,
      zeroApproachDistance: '0.002',
      zeroApproachTolerance: '0',
      measurementMode: { X: 'radius', Y: 'radius', Z: 'radius' },
      countingMode: { X: 'linear', Y: 'linear', Z: 'linear' },
      probeDroType: 'transmit',
      encoderFailWarning: false,
      keypadLock: 'off',
      sleepTimeout: 0,
    },
  });

  // Reset mill store (NoOpMillAdapter is lightweight, no cleanup needed)
  useMillStore.setState({
    millState: createDefaultMillState('noop'),
    connection: new NoOpMillAdapter(),
    isConnecting: false,
    error: null,
  });

  // Reset DRO store
  useDROStore.setState({
    stateName: INITIAL_DRO_STATE_PAYLOAD.stateName,
    stateData: INITIAL_DRO_STATE_PAYLOAD.stateData,
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
    display: INITIAL_DISPLAY_STATE,
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
    display: INITIAL_DISPLAY_STATE,
  });
}

interface RenderSimulatorOptions {
  /** Boot message mode - defaults to 'skip' for faster tests */
  bootMessageMode?: 'show' | 'skip';
  /** Enable render profiling for performance measurement */
  profile?: boolean;
  /** Use component-level profiling for detailed metrics */
  componentProfiling?: boolean;
}

/**
 * Renders the EL400Simulator with all required providers.
 * Defaults to skipping boot message for faster tests.
 *
 * Note: Uses NoOpMillAdapter which is a lightweight no-op implementation
 * that doesn't hold any resources (no sockets, timers, etc.) and doesn't
 * require explicit cleanup. The connection is reset via resetStores() which
 * is called at the start of each test.
 */
export function renderSimulator(options?: RenderSimulatorOptions) {
  const { bootMessageMode = 'skip', profile = false, componentProfiling = false } = options ?? {};

  // Reset stores first (also initializes NoOpMillAdapter)
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

  // Use profiled simulator if component profiling is enabled
  const SimulatorComponent = componentProfiling ? ProfiledEL400Simulator : EL400Simulator;

  const content = (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SimulatorComponent />
      </BrowserRouter>
    </QueryClientProvider>
  );

  // Wrap with profiler if profiling is enabled
  if (profile) {
    return render(
      <DeepProfiler>
        {content}
      </DeepProfiler>
    );
  }

  return render(content);
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
 * Validates that the number has the exact decimal precision specified
 *
 * @param axis - The axis to retrieve ('X', 'Y', or 'Z')
 * @param precision - Number of decimal places to expect (default: 4)
 *                   Must be a non-negative integer (0, 1, 2, etc.)
 *                   If 0, the number must be an integer with no decimal point
 *
 * Throws an error if:
 * - precision is not a non-negative integer
 * - The content cannot be parsed as a number
 * - The number doesn't have exactly `precision` decimal digits (or is not an integer when precision is 0)
 */
export function getAxisDisplayPureNumberValue(axis: 'X' | 'Y' | 'Z', precision = 4): number {
  const valueElement = screen.getByTestId(`axis-value-${axis.toLowerCase()}`);
  const textContent = valueElement.textContent || '';
  return parseNumericValue(textContent, axis, precision);
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
