import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SettingsProvider } from "./context/SettingsContext";
import { MachineStateProvider } from "./context/MachineStateContext";
import { useDataSourceConfig } from "./hooks/useDataSourceConfig";
import { useMemo } from "react";
import { MockAdapter } from "./adapters/MockAdapter";
import { CncjsAdapter } from "./adapters/CncjsAdapter";
import type { MachineAdapter } from "./adapters/MachineAdapter";
import type { DataSourceConfig } from "./types/machine";

const queryClient = new QueryClient();

/**
 * Creates an adapter based on URL config.
 * This is used inside the BrowserRouter context.
 */
function createAdapter(config: DataSourceConfig): MachineAdapter | null {
  switch (config.type) {
    case 'mock':
      return new MockAdapter({ simulateMovement: true });
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
    <MachineStateProvider initialAdapter={adapter}>
      <SettingsProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SettingsProvider>
    </MachineStateProvider>
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
