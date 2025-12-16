import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NonVolatileMemoryProvider } from '../../context/NonVolatileMemoryContext';
import { MillStateProvider } from '../../context/MillStateContext';
import { VolatileMemoryProvider } from '../../context/VolatileMemoryContext';
import { CenterFindingProvider } from '../../context/CenterFindingContext';

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

  const client = queryClient || defaultQueryClient;

  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <NonVolatileMemoryProvider>
          <MillStateProvider>
            <VolatileMemoryProvider>
              <CenterFindingProvider>
                {children}
              </CenterFindingProvider>
            </VolatileMemoryProvider>
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
