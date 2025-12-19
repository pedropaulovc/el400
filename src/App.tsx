import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { NonVolatileMemoryProvider } from "./context/NonVolatileMemoryContext";
import { MillStateProvider } from "./context/MillStateContext";
import { DROProvider } from "./dro-state-machine";
import { useDataSourceConfig } from "./hooks/useDataSourceConfig";
import { useMemo } from "react";
import { CncjsMillConnection } from "./adapters/CncjsMillConnection";
import { NoOpMillConnection } from "./adapters/NoOpMillConnection";
import type { MillConnection } from "./adapters/MillConnection";
import type { DataSourceConfig } from "./types/millState";

const queryClient = new QueryClient();

/**
 * Creates a connection based on URL config.
 * Returns CncjsMillConnection when source=cncjs, otherwise NoOpMillConnection.
 */
function createConnection(config: DataSourceConfig): MillConnection {
  if (config.type === 'cncjs') {
    return new CncjsMillConnection({ host: config.host, port: config.port, sessionId: config.sessionId });
  }
  return new NoOpMillConnection();
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
        <DROProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DROProvider>
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
