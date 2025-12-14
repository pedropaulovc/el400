import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { NonVolatileMemoryProvider } from "./context/NonVolatileMemoryContext";
import { VolatileMemoryProvider } from "./context/VolatileMemoryContext";
import { useDataSourceConfig } from "./hooks/useDataSourceConfig";
import { useMemo } from "react";
import { MockAdapter } from "./adapters/MockAdapter";
import { CncjsAdapter } from "./adapters/CncjsAdapter";
import type { MachineConnection } from "./adapters/MachineConnection";
import type { DataSourceConfig } from "./types/volatileMemory";

const queryClient = new QueryClient();

/**
 * Creates an adapter based on URL config.
 * This is used inside the BrowserRouter context.
 */
function createAdapter(config: DataSourceConfig): MachineConnection | null {
  switch (config.type) {
    case 'mock':
      // Don't simulate automatic movement for E2E tests
      // Tests can use setPosition() to explicitly control position
      return new MockAdapter({ simulateMovement: false });
    case 'cncjs':
      return new CncjsAdapter({ host: config.host, port: config.port });
    case 'linuxcnc':
      // TODO: implement LinuxCNC adapter
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
  const adapter = useMemo(() => createAdapter(config), [config]);

  return (
    <NonVolatileMemoryProvider>
      <VolatileMemoryProvider initialAdapter={adapter}>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </VolatileMemoryProvider>
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
