import HousingEdge from "./HousingEdge";
import BrandLogo from "./BrandLogo";
import MultiAxisSection from "./MultiAxisSection";
import AxisSelectionSection from "./AxisSelectionSection";
import KeypadSection from "./KeypadSection";
import PrimaryFunctionSection from "./PrimaryFunctionSection";
import SecondaryFunctionSection from "./SecondaryFunctionSection";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useDROState } from "../stores/dro";

const EL400Simulator = () => {
  // Power-user keyboard shortcuts (US-038). Scoped to this container so they
  // only fire while focus is inside the simulator and never hijack the page.
  const { onKeyDown } = useKeyboardShortcuts();

  // Mirror the state-machine state onto the root as a stable, deterministic
  // readiness signal. E2E boot barriers await this (e.g. `data-dro-state="idle"`)
  // instead of polling a socket-derived display value behind a timeout — it flips
  // the instant React commits the post-boot state, independent of machine load or
  // the Socket.IO handshake. It also doubles as a debugging aid in the DOM.
  const droState = useDROState();

  return (
    <div
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="EL400 digital readout simulator"
      data-testid="el400-simulator"
      data-dro-state={droState}
      className="relative rounded-2xl select-none overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      style={{
        background: 'linear-gradient(160deg, #5a5a5a 0%, #404040 20%, #353535 50%, #2a2a2a 80%, #1a1a1a 100%)',
        border: '2px solid transparent',
        boxShadow: `
          0 25px 80px rgba(0,0,0,0.6),
          0 8px 32px rgba(0,0,0,0.4),
          inset 0 1px 0 rgba(255,255,255,0.15),
          inset 0 -1px 0 rgba(0,0,0,0.4)
        `,
        minWidth: '780px',
      }}
    >
      {/* Top raised edge */}
      <HousingEdge position="top">
        <BrandLogo />
      </HousingEdge>

      {/* Main content area */}
      <div className="px-14 pb-2 pt-4">
        <div className="flex gap-5 items-stretch">
          <MultiAxisSection />
          <AxisSelectionSection />
          <KeypadSection />
        </div>

        {/* Bottom section */}
        <div className="mt-5 flex items-end justify-between">
          <PrimaryFunctionSection />
          <SecondaryFunctionSection />
        </div>
      </div>

      {/* Bottom raised edge */}
      <HousingEdge position="bottom" />
    </div>
  );
};

export default EL400Simulator;
