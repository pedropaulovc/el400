import EL400Simulator from "@/components/EL400Simulator";
import { DebugControlPanel } from "@/components/debug/DebugControlPanel";
import { useDataSourceConfig } from "@/hooks/useDataSourceConfig";

const Index = () => {
  const config = useDataSourceConfig();
  const showDebug = config.type === 'debug';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#8a8a70]">
      <div className="origin-center" style={{ transform: 'scale(1.2)' }}>
        <h1 className="sr-only">Electronica EL400 Digital Readout Simulator</h1>
        <EL400Simulator />
        <p className="mt-6 text-sm text-[#5a5a50] font-medium text-center">
          Click axis buttons to select, then use keypad to enter values
        </p>
      </div>
      {showDebug && <DebugControlPanel />}
    </main>
  );
};

export default Index;
