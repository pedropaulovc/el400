import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { VolatileMemoryProvider } from "../context/VolatileMemoryContext";
import { MillStateProvider, useMillStateContext } from "../context/MillStateContext";
import { NonVolatileMemoryProvider, useNonVolatileMemoryContext } from "../context/NonVolatileMemoryContext";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { MockMillConnection } from "../adapters/MockMillConnection";
import type { Axis } from "../types/volatileMemory";

/**
 * Interactive volatile memory demo component.
 * Shows ABS/INC switching and value management.
 */
function VolatileMemoryDemo() {
  const vMem = useVolatileMemory();
  const { millState } = useMillStateContext();
  const { nvMem, updateNvMem } = useNonVolatileMemoryContext();

  const handleZeroAxis = (axis: Axis) => {
    vMem.zeroAxis(axis);
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg font-mono text-sm space-y-6 min-w-[500px]">
      <h2 className="text-lg font-bold text-green-400">Volatile Memory Demo</h2>

      {/* Connection Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${millState.connected ? "bg-green-500" : "bg-gray-600"}`}
          />
          <span className="text-gray-400">
            {millState.connected ? "Mock Connected" : "Manual Mode"}
          </span>
        </div>
        <span className="text-gray-600">|</span>
        <span className="text-gray-400">
          Unit: {nvMem.defaultUnit.toUpperCase()}
        </span>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => vMem.setMode("abs")}
          className={`px-4 py-2 rounded ${
            vMem.mode === "abs"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          ABS
        </button>
        <button
          onClick={() => vMem.setMode("inc")}
          className={`px-4 py-2 rounded ${
            vMem.mode === "inc"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          INC
        </button>
        <button
          onClick={() =>
            updateNvMem({
              defaultUnit: nvMem.defaultUnit === "inch" ? "mm" : "inch",
            })
          }
          className="px-4 py-2 rounded bg-blue-600 text-white ml-auto"
        >
          Toggle Unit
        </button>
      </div>

      {/* Axis Display with Zero Buttons */}
      <div className="space-y-3">
        {(["X", "Y", "Z"] as const).map((axis) => (
          <div key={axis} className="flex items-center gap-4">
            <span
              className={`w-8 font-bold ${
                axis === "X"
                  ? "text-red-400"
                  : axis === "Y"
                    ? "text-green-400"
                    : "text-blue-400"
              }`}
            >
              {axis}:
            </span>
            <span className="flex-1 text-xl">
              {vMem.displayValues[axis].toFixed(nvMem.precision)}
            </span>
            <button
              onClick={() => handleZeroAxis(axis)}
              className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs"
            >
              Zero
            </button>
          </div>
        ))}
      </div>

      {/* Zero All Button */}
      <button
        onClick={() => vMem.zeroAll()}
        className="w-full px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white"
      >
        Zero All ({vMem.mode.toUpperCase()})
      </button>

      {/* Memory State Debug */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h3 className="text-gray-400 text-xs uppercase mb-3">Memory State (Debug)</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Absolute:</span>
            <div className="mt-1">
              X: {vMem.absolute.X.toFixed(4)}
              <br />
              Y: {vMem.absolute.Y.toFixed(4)}
              <br />
              Z: {vMem.absolute.Z.toFixed(4)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Incremental:</span>
            <div className="mt-1">
              X: {vMem.incremental.X.toFixed(4)}
              <br />
              Y: {vMem.incremental.Y.toFixed(4)}
              <br />
              Z: {vMem.incremental.Z.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Story wrapper with providers.
 */
function StoryWrapper({
  connection,
  children,
}: {
  connection?: MockMillConnection;
  children: React.ReactNode;
}) {
  return (
    <NonVolatileMemoryProvider>
      <MillStateProvider initialConnection={connection}>
        <VolatileMemoryProvider>
          {children}
        </VolatileMemoryProvider>
      </MillStateProvider>
    </NonVolatileMemoryProvider>
  );
}

const meta = {
  title: "Data Interface/DataSourceDemo",
  component: VolatileMemoryDemo,
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
} satisfies Meta<typeof VolatileMemoryDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * NoOp mode without external data source.
 * Uses NoOpMillConnection - always connected but values stay at origin.
 */
export const NoOpMode: Story = {};

/**
 * Mock connection with live position updates.
 * ABS values track machine position, INC values for work offsets.
 */
export const MockWithMovement: Story = {
  decorators: [
    (Story) => {
      const [connection] = useState(
        () => new MockMillConnection({ simulateMovement: true, updateInterval: 200 })
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

/**
 * Mock connection with fixed position.
 * Good for testing ABS/INC switching and zeroing.
 */
export const MockFixedPosition: Story = {
  decorators: [
    (Story) => {
      const [connection] = useState(() => new MockMillConnection());

      useEffect(() => {
        connection.setPosition(123.4567, 89.1234, -45.6789);
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
 * Interactive demo showing full DRO workflow:
 * 1. Switch between ABS and INC modes
 * 2. Zero individual axes
 * 3. Zero all axes
 * 4. Toggle units
 */
export const InteractiveDemo: Story = {
  decorators: [
    (Story) => {
      const [connection] = useState(() => new MockMillConnection());

      useEffect(() => {
        connection.setPosition(50.0, 100.0, 25.0);
        return () => connection.disconnect();
      }, [connection]);

      return (
        <StoryWrapper connection={connection}>
          <Story />
        </StoryWrapper>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Interactive demo showing the full DRO workflow. Try switching modes, zeroing axes, and toggling units.",
      },
    },
  },
};
