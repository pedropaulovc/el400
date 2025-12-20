import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useDataSourceConfig } from "./hooks/useDataSourceConfig";
import { CncjsMillAdapter } from "./adapters/CncjsMillAdapter";
import { NoOpMillAdapter } from "./adapters/NoOpMillAdapter";
import type { MillAdapter } from "./adapters/MillAdapter";
import type { DataSourceConfig } from "./types/millState";
import { initializeMillStore } from "./stores/millStore";

const queryClient = new QueryClient();

/**
 * Creates an adapter based on URL config.
 * Returns CncjsMillAdapter when source=cncjs, otherwise NoOpMillAdapter.
 */
function createAdapter(config: DataSourceConfig): MillAdapter {
  if (config.type === 'cncjs') {
    return new CncjsMillAdapter({ host: config.host, port: config.port, sessionId: config.sessionId });
  }
  return new NoOpMillAdapter();
}

/**
 * Inner app component that has access to router context for URL params.
 * Initializes the mill store with the appropriate connection.
 */
function AppContent() {
  const config = useDataSourceConfig();
  const connection = useMemo(() => createAdapter(config), [config]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize mill store with connection
  useEffect(() => {
    let isMounted = true;
    let cleanup: () => void = () => { /* no-op */ };

    const init = async () => {
      const result = await initializeMillStore(connection);

      if (!isMounted) {
        // Component unmounted before initialization completed; clean up immediately.
        result();
        return;
      }

      cleanup = result;
      setIsInitialized(true);
    };

    void init();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [connection]);

  // Wait for initialization before rendering
  if (!isInitialized) {
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
