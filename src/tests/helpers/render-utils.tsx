import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettingsStore } from '../../stores/settingsStore';
import { useMillStore } from '../../stores/millStore';
import { useDROStore } from '../../stores/droStore';
import { NoOpMillAdapter } from '../../adapters/NoOpMillAdapter';
import { INITIAL_DRO_STATE_DATA as INITIAL_DRO_CONTEXT } from '../../stores/dro/droStateMachine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';
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
};

/**
 * Custom render function that includes all necessary providers
 */

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for react-router
   */
  initialRoute?: string;
  /**
   * Custom QueryClient instance
   */
  queryClient?: QueryClient;
  /**
   * Enable render profiling for performance measurement
   */
  profile?: boolean;
}

/**
 * Resets all Zustand stores to their initial state for testing.
 * Sets DRO to idle state (skip boot sequence).
 *
 * Note on test isolation: Vitest runs each test file in isolation by default,
 * meaning each file gets its own module scope and store instances.
 * Tests within the same file run sequentially, so there are no race conditions.
 * This function is called by renderWithProviders() automatically.
 */
function resetStoresForTest(): void {
  // Reset settings store
  useSettingsStore.setState({
    nvMem: {
      beepEnabled: true,
      defaultUnit: 'inch',
      precision: 4,
      bootMessageMode: 'skip',
      taperOnAxis: 'X',
    },
  });

  // Reset mill store
  useMillStore.setState({
    millState: createDefaultMillState('noop'),
    connection: new NoOpMillAdapter(),
    isConnecting: false,
    error: null,
  });

  // Reset DRO store - start in idle state for unit tests (skip boot sequence)
  useDROStore.setState({
    stateName: 'idle',
    stateData: INITIAL_DRO_CONTEXT,
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
  });
}

/**
 * Renders a component with all necessary providers for testing
 */
export function renderWithProviders(
  ui: ReactElement,
  { initialRoute = '/', queryClient, profile = false, ...renderOptions }: CustomRenderOptions = {}
) {
  const defaultQueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const client = queryClient ?? defaultQueryClient;

  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  // Reset stores to initial state for testing
  resetStoresForTest();

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const content = (
      <QueryClientProvider client={client}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    );

    if (profile) {
      return <DeepProfiler>{content}</DeepProfiler>;
    }

    return content;
  };

  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });
}

// Re-export commonly used testing library utilities
export { screen, waitFor, within, fireEvent } from '@testing-library/react';
export { renderWithProviders as render };
