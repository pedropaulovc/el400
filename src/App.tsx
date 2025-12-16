import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { NonVolatileMemoryProvider } from "./context/NonVolatileMemoryContext";
import { MillStateProvider } from "./context/MillStateContext";
import { VolatileMemoryProvider } from "./context/VolatileMemoryContext";
import { CenterFindingProvider } from "./context/CenterFindingContext";
import { useDataSourceConfig } from "./hooks/useDataSourceConfig";
import { useMemo } from "react";
import { MockMillConnection } from "./adapters/MockMillConnection";
import { CncjsMillConnection } from "./adapters/CncjsMillConnection";
import type { MillConnection } from "./adapters/MillConnection";
import type { DataSourceConfig } from "./types/millState";

const queryClient = new QueryClient();

/**
 * Creates a connection based on URL config.
 * This is used inside the BrowserRouter context.
 */
function createConnection(config: DataSourceConfig): MillConnection | null {
  switch (config.type) {
    case 'mock':
      // Don't simulate automatic movement for E2E tests
      // Tests can use setPosition() to explicitly control position
      return new MockMillConnection({ simulateMovement: false });
    case 'cncjs':
      return new CncjsMillConnection({ host: config.host, port: config.port, sessionId: config.sessionId });
    case 'linuxcnc':
      // TODO: implement LinuxCNC connection
      return null;
    case 'manual':
    default:
      return null;
  }
}

/**
 * Inner app component that has access to router context for URL params.
 */
function AppContent() {
  const config = useDataSourceConfig();
  const connection = useMemo(() => createConnection(config), [config]);

  return (
    <NonVolatileMemoryProvider>
      <MillStateProvider initialConnection={connection}>
        <VolatileMemoryProvider>
          <CenterFindingProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CenterFindingProvider>
        </VolatileMemoryProvider>
      </MillStateProvider>
    </NonVolatileMemoryProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
