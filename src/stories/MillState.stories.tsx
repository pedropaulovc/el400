import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { MillStateProvider, useMillStateContext } from "../context/MillStateContext";
import { MockMillConnection } from "../adapters/MockMillConnection";

/**
 * Display component to show current mill state.
 * Used in stories to visualize the data contract.
 */
function MillStateDisplay() {
  const { millState } = useMillStateContext();

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg font-mono text-sm space-y-4 min-w-[400px]">
      <h2 className="text-lg font-bold text-green-400 mb-4">Mill State</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Connection</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${millState.connected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span>{millState.connected ? "Connected" : "Disconnected"}</span>
          </div>
          <div className="text-gray-500 mt-1">Type: {millState.controllerType}</div>
        </div>

        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Probe</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${millState.probe.triggered ? "bg-yellow-500" : "bg-gray-600"}`}
            />
            <span>{millState.probe.triggered ? "Triggered" : "Open"}</span>
          </div>
          <div className="text-gray-500 mt-1">Pin: {millState.probe.pinState || "(none)"}</div>
        </div>
      </div>

      <div>
        <h3 className="text-gray-400 text-xs uppercase mb-2">Position (Machine)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-red-400">X:</span>{" "}
            <span className="text-white">{millState.position.x.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-green-400">Y:</span>{" "}
            <span className="text-white">{millState.position.y.toFixed(4)}</span>
          </div>
          <div>
            <span className="text-blue-400">Z:</span>{" "}
            <span className="text-white">{millState.position.z.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {millState.workPosition && (
        <div>
          <h3 className="text-gray-400 text-xs uppercase mb-2">Position (Work)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-red-400">X:</span>{" "}
              <span className="text-white">{millState.workPosition.x.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-green-400">Y:</span>{" "}
              <span className="text-white">{millState.workPosition.y.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-blue-400">Z:</span>{" "}
              <span className="text-white">{millState.workPosition.z.toFixed(4)}</span>
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
  connection?: MockMillConnection;
  children: React.ReactNode;
}) {
  return (
    <MillStateProvider initialConnection={connection}>
      {children}
    </MillStateProvider>
  );
}

const meta = {
  title: "Data Interface/MillState",
  component: MillStateDisplay,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Story />
      </StoryWrapper>
    ),
  ],
} satisfies Meta<typeof MillStateDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * NoOp mode - no external data source connected.
 * Default state when no connection is provided (uses NoOpMillConnection).
 */
export const NoOpMode: Story = {};

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
