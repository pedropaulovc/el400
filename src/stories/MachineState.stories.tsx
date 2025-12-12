import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { MachineStateProvider } from "../context/MachineStateContext";
import { SettingsProvider } from "../context/SettingsContext";
import { useMachineState } from "../hooks/useMachineState";
import { MockAdapter } from "../adapters/MockAdapter";
import type { MachineState } from "../types/machine";

/**
 * Display component to show current machine state.
 * Used in stories to visualize the data contract.
 */
function MachineStateDisplay() {
  const state = useMachineState();

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg font-mono text-sm space-y-4 min-w-[400px]">
      <h2 className="text-lg font-bold text-green-400 mb-4">Machine State</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Connection</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${state.connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span>{state.connected ? "Connected" : "Disconnected"}</span>
          </div>
          <div className="text-gray-500 mt-1">Type: {state.controllerType}</div>
        </div>

        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Probe</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${state.probe.triggered ? "bg-yellow-500" : "bg-gray-600"}`}
            />
            <span>{state.probe.triggered ? "Triggered" : "Open"}</span>
          </div>
          <div className="text-gray-500 mt-1">Pin: {state.probe.pinState || "(none)"}</div>
        </div>
      </div>

      <div>
        <h3 className="text-gray-400 text-xs uppercase mb-2">Position (Machine)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-red-400">X:</span>{" "}
            <span className="text-white">{state.position.x.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-green-400">Y:</span>{" "}
            <span className="text-white">{state.position.y.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-blue-400">Z:</span>{" "}
            <span className="text-white">{state.position.z.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {state.workPosition && (
        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Position (Work)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-red-400">X:</span>{" "}
              <span className="text-white">{state.workPosition.x.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-green-400">Y:</span>{" "}
              <span className="text-white">{state.workPosition.y.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-blue-400">Z:</span>{" "}
              <span className="text-white">{state.workPosition.z.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Story wrapper component that provides context and adapter.
 */
function StoryWrapper({
  adapter,
  children,
}: {
  adapter: MockAdapter | null;
  children: React.ReactNode;
}) {
  return (
    <MachineStateProvider initialAdapter={adapter}>
      <SettingsProvider>{children}</SettingsProvider>
    </MachineStateProvider>
  );
}

const meta = {
  title: "Data Interface/MachineState",
  component: MachineStateDisplay,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <StoryWrapper adapter={null}>
        <Story />
      </StoryWrapper>
    ),
  ],
} satisfies Meta<typeof MachineStateDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Manual mode - no external data source connected.
 * Default state when no adapter is provided.
 */
export const ManualMode: Story = {};

/**
 * Mock adapter connected with default position at origin.
 */
export const MockConnected: Story = {
  decorators: [
    (Story) => {
      const adapter = new MockAdapter();
      return (
        <StoryWrapper adapter={adapter}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock adapter with position updates.
 * Demonstrates live position data.
 */
export const MockWithPosition: Story = {
  decorators: [
    (Story) => {
      const [adapter] = useState(() => new MockAdapter());

      useEffect(() => {
        adapter.setPosition(12.3456, -45.6789, 100.0001);
        return () => adapter.disconnect();
      }, [adapter]);

      return (
        <StoryWrapper adapter={adapter}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock adapter with probe triggered.
 * Shows how probe state is displayed.
 */
export const ProbeTriggered: Story = {
  decorators: [
    (Story) => {
      const [adapter] = useState(() => new MockAdapter());

      useEffect(() => {
        adapter.setPosition(50, 50, 25);
        adapter.setProbeState("P");
        return () => adapter.disconnect();
      }, [adapter]);

      return (
        <StoryWrapper adapter={adapter}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock adapter with probe and limit switch triggered.
 * Shows combined pin state like "XP" (X limit + probe).
 */
export const ProbePlusLimitSwitch: Story = {
  decorators: [
    (Story) => {
      const [adapter] = useState(() => new MockAdapter());

      useEffect(() => {
        adapter.setPosition(-100, 0, 0);
        adapter.setProbeState("XP");
        return () => adapter.disconnect();
      }, [adapter]);

      return (
        <StoryWrapper adapter={adapter}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock adapter with simulated movement.
 * Position changes over time to demonstrate live updates.
 */
export const LiveMovement: Story = {
  decorators: [
    (Story) => {
      const [adapter] = useState(
        () => new MockAdapter({ simulateMovement: true, updateInterval: 100 })
      );

      useEffect(() => {
        return () => adapter.disconnect();
      }, [adapter]);

      return (
        <StoryWrapper adapter={adapter}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};
