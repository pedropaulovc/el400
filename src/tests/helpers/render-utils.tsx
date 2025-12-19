import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NonVolatileMemoryProvider } from '../../context/NonVolatileMemoryContext';
import { MillStateProvider } from '../../context/MillStateContext';
import { DROProvider, INITIAL_DRO_STATE_PAYLOAD, INITIAL_DRO_CONTEXT } from '../../dro-state-machine';
import { INITIAL_VOLATILE_MEMORY_STATE } from '../../types/volatileMemory';

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
}

/**
 * Renders a component with all necessary providers for testing
 */
export function renderWithProviders(
  ui: ReactElement,
  { initialRoute = '/', queryClient, ...renderOptions }: CustomRenderOptions = {}
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

  // Start in idle state for unit tests (skip boot sequence)
  const idleInitialState = {
    ...INITIAL_DRO_STATE_PAYLOAD,
    stateName: 'idle' as const,
    stateData: INITIAL_DRO_CONTEXT,
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <NonVolatileMemoryProvider>
          <MillStateProvider>
            <DROProvider initialState={idleInitialState}>
              {children}
            </DROProvider>
          </MillStateProvider>
        </NonVolatileMemoryProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });
}

// Re-export commonly used testing library utilities
export { screen, waitFor, within, fireEvent } from '@testing-library/react';
export { renderWithProviders as render };
