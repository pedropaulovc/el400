import { useLayoutEffect, useRef, useState } from "react";
import EL400Simulator from "@/components/EL400Simulator";
import { DebugControlPanel } from "@/components/debug/DebugControlPanel";
import { useDataSourceConfig } from "@/hooks/useDataSourceConfig";
import { FullscreenControl } from "@/components/FullscreenControl";

const Index = () => {
  const config = useDataSourceConfig();
  const showDebug = config.type === 'debug';
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>();

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const reserveVisualBounds = () => {
      setPanelSize({ width: panel.offsetWidth * 1.2, height: panel.offsetHeight * 1.2 });
    };
    reserveVisualBounds();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(reserveVisualBounds);
    observer.observe(panel);
    return () => { observer.disconnect(); };
  }, []);

  return (
    <main
      data-testid="app-main"
      className={`min-h-screen flex flex-col items-center justify-center p-4 bg-[#8a8a70]${
        showDebug ? ' pr-80' : ''
      }`}
    >
      <FullscreenControl />
      {/* Reserve the transformed bounds so the separate controls cannot overlap
          the face. CSS zoom changes computed border widths in forced colors. */}
      <div className="shrink-0" style={panelSize}>
        <div ref={panelRef} className="flow-root w-max origin-top-left" style={{ transform: 'scale(1.2)' }}>
          <h1 className="sr-only">Electronica EL400 Digital Readout Simulator</h1>
          <EL400Simulator />
          <p className="mt-6 text-sm text-[#5a5a50] font-medium text-center">
            Click axis buttons to select, then use keypad to enter values
          </p>
        </div>
      </div>
      {showDebug && <DebugControlPanel />}
    </main>
  );
};

export default Index;
