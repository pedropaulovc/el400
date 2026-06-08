import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useDataSourceConfig } from "./hooks/useDataSourceConfig";
import { CncjsMillAdapter } from "./adapters/CncjsMillAdapter";
import { DebugMillAdapter } from "./adapters/DebugMillAdapter";
import { NoOpMillAdapter } from "./adapters/NoOpMillAdapter";
import type { MillAdapter } from "./adapters/MillAdapter";
import type { DataSourceConfig } from "./types/millState";
import { initializeMillStore } from "./stores";
import { useSettingsStore } from "./stores/settingsStore";
import type { TaperOnAxis, ProbeDroType } from "./types/nonVolatileMemory";

const queryClient = new QueryClient();

/**
 * Creates an adapter based on URL config.
 * Returns CncjsMillAdapter for source=cncjs, DebugMillAdapter for source=debug,
 * otherwise NoOpMillAdapter.
 */
function createAdapter(config: DataSourceConfig): MillAdapter {
  if (config.type === 'cncjs') {
    return new CncjsMillAdapter({
      host: config.host,
      port: config.port,
      sessionId: config.sessionId,
      token: config.token,
      serialport: config.serialport,
    });
  }
  if (config.type === 'debug') {
    return new DebugMillAdapter();
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

  // Seed the taper-on axis (Section 6.2 `tAPEr on`) from the URL so the Taper
  // function (US-045) can be configured without entering the setup menu, e.g.
  // /?source=cncjs&taperOn=Z. Mirrors how boot reads `bootMessageMode`.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('taperOn');
    const valid: TaperOnAxis[] = ['X', 'Z', 'Zprime'];
    if (param && (valid as string[]).includes(param)) {
      useSettingsStore.getState().updateNvMem({ taperOnAxis: param as TaperOnAxis });
    }
  }, []);

  // Seed the touch-probe DRO type (§10.1.1 `dro t` / `dro F`) from the URL so the
  // probe freeze/transmit behaviour (US-032) can be exercised without entering
  // setup, e.g. /?source=cncjs&probeDroType=freeze. Mirrors `taperOn` above.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('probeDroType');
    const valid: ProbeDroType[] = ['transmit', 'freeze'];
    if (param && (valid as string[]).includes(param)) {
      useSettingsStore.getState().updateNvMem({ probeDroType: param as ProbeDroType });
    }
  }, []);

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
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
