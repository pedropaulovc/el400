import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { MachineStateProvider, useMachineStateContext } from "../context/MachineStateContext";
import { MockMillConnection } from "../adapters/MockMillConnection";

/**
 * Display component to show current machine state.
 * Used in stories to visualize the data contract.
 */
function MachineStateDisplay() {
  const { machineState } = useMachineStateContext();

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg font-mono text-sm space-y-4 min-w-[400px]">
      <h2 className="text-lg font-bold text-green-400 mb-4">Machine State</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Connection</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${machineState.connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span>{machineState.connected ? "Connected" : "Disconnected"}</span>
          </div>
          <div className="text-gray-500 mt-1">Type: {machineState.controllerType}</div>
        </div>

        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Probe</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${machineState.probe.triggered ? "bg-yellow-500" : "bg-gray-600"}`}
            />
            <span>{machineState.probe.triggered ? "Triggered" : "Open"}</span>
          </div>
          <div className="text-gray-500 mt-1">Pin: {machineState.probe.pinState || "(none)"}</div>
        </div>
      </div>

      <div>
        <h3 className="text-gray-400 text-xs uppercase mb-2">Position (Machine)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-red-400">X:</span>{" "}
            <span className="text-white">{machineState.position.x.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-green-400">Y:</span>{" "}
            <span className="text-white">{machineState.position.y.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-blue-400">Z:</span>{" "}
            <span className="text-white">{machineState.position.z.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {machineState.workPosition && (
        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Position (Work)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-red-400">X:</span>{" "}
              <span className="text-white">{machineState.workPosition.x.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-green-400">Y:</span>{" "}
              <span className="text-white">{machineState.workPosition.y.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-blue-400">Z:</span>{" "}
              <span className="text-white">{machineState.workPosition.z.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Story wrapper component that provides context and connection.
 */
function StoryWrapper({
  connection,
  children,
}: {
  connection: MockMillConnection | null;
  children: React.ReactNode;
}) {
  return (
    <MachineStateProvider initialConnection={connection}>
      {children}
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
      <StoryWrapper connection={null}>
        <Story />
      </StoryWrapper>
    ),
  ],
} satisfies Meta<typeof MachineStateDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Manual mode - no external data source connected.
 * Default state when no connection is provided.
 */
export const ManualMode: Story = {};

/**
 * Mock connection with default position at origin.
 */
export const MockConnected: Story = {
  decorators: [
    (Story) => {
      const connection = new MockMillConnection();
      return (
        <StoryWrapper connection={connection}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock connection with position updates.
 * Demonstrates live position data.
 */
export const MockWithPosition: Story = {
  decorators: [
    (Story) => {
      const [connection] = useState(() => new MockMillConnection());

      useEffect(() => {
        connection.setPosition(12.3456, -45.6789, 100.0001);
        return () => connection.disconnect();
      }, [connection]);

      return (
        <StoryWrapper connection={connection}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock connection with probe triggered.
 * Shows how probe state is displayed.
 */
export const ProbeTriggered: Story = {
  decorators: [
    (Story) => {
      const [connection] = useState(() => new MockMillConnection());

      useEffect(() => {
        connection.setPosition(50, 50, 25);
        connection.setProbeState("P");
        return () => connection.disconnect();
      }, [connection]);

      return (
        <StoryWrapper connection={connection}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock connection with probe and limit switch triggered.
 * Shows combined pin state like "XP" (X limit + probe).
 */
export const ProbePlusLimitSwitch: Story = {
  decorators: [
    (Story) => {
      const [connection] = useState(() => new MockMillConnection());

      useEffect(() => {
        connection.setPosition(-100, 0, 0);
        connection.setProbeState("XP");
        return () => connection.disconnect();
      }, [connection]);

      return (
        <StoryWrapper connection={connection}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};

/**
 * Mock connection with simulated movement.
 * Position changes over time to demonstrate live updates.
 */
export const LiveMovement: Story = {
  decorators: [
    (Story) => {
      const [connection] = useState(
        () => new MockMillConnection({ simulateMovement: true, updateInterval: 100 })
      );

      useEffect(() => {
        return () => connection.disconnect();
      }, [connection]);

      return (
        <StoryWrapper connection={connection}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
};
