import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { MachineStateProvider } from "../context/MachineStateContext";
import { SettingsProvider, useSettingsContext } from "../context/SettingsContext";
import { useMachineState } from "../hooks/useMachineState";
import { useDROMemory, type Axis } from "../hooks/useDROMemory";
import { MockAdapter } from "../adapters/MockAdapter";

/**
 * Interactive DRO memory demo component.
 * Shows ABS/INC switching and value management.
 */
function DROMemoryDemo() {
  const machineState = useMachineState();
  const droMemory = useDROMemory(machineState.connected ? machineState : null);
  const { settings, updateSettings } = useSettingsContext();

  const handleZeroAxis = (axis: Axis) => {
    droMemory.zeroAxis(axis);
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg font-mono text-sm space-y-6 min-w-[500px]">
      <h2 className="text-lg font-bold text-green-400">DRO Memory Demo</h2>

      {/* Connection Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${machineState.connected ? "bg-green-500" : "bg-gray-600"}`}
          />
          <span className="text-gray-400">
            {machineState.connected ? "Mock Connected" : "Manual Mode"}
          </span>
        </div>
        <span className="text-gray-600">|</span>
        <span className="text-gray-400">
          Unit: {settings.defaultUnit.toUpperCase()}
        </span>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => droMemory.setMode("abs")}
          className={`px-4 py-2 rounded ${
            droMemory.mode === "abs"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          ABS
        </button>
        <button
          onClick={() => droMemory.setMode("inc")}
          className={`px-4 py-2 rounded ${
            droMemory.mode === "inc"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          INC
        </button>
        <button
          onClick={() =>
            updateSettings({
              defaultUnit: settings.defaultUnit === "inch" ? "mm" : "inch",
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
              {droMemory.displayValues[axis].toFixed(settings.precision)}
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
        onClick={() => droMemory.zeroAll()}
        className="w-full px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white"
      >
        Zero All ({droMemory.mode.toUpperCase()})
      </button>

      {/* Memory State Debug */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h3 className="text-gray-400 text-xs uppercase mb-3">Memory State (Debug)</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Absolute:</span>
            <div className="mt-1">
              X: {droMemory.absolute.X.toFixed(4)}
              <br />
              Y: {droMemory.absolute.Y.toFixed(4)}
              <br />
              Z: {droMemory.absolute.Z.toFixed(4)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Incremental:</span>
            <div className="mt-1">
              X: {droMemory.incremental.X.toFixed(4)}
              <br />
              Y: {droMemory.incremental.Y.toFixed(4)}
              <br />
              Z: {droMemory.incremental.Z.toFixed(4)}
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
  title: "Data Interface/DataSourceDemo",
  component: DROMemoryDemo,
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
} satisfies Meta<typeof DROMemoryDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Manual mode without external data source.
 * All values are managed manually through the DRO memory.
 */
export const ManualMode: Story = {};

/**
 * Mock adapter connected with live position updates.
 * ABS values track machine position, INC values for work offsets.
 */
export const MockWithMovement: Story = {
  decorators: [
    (Story) => {
      const [adapter] = useState(
        () => new MockAdapter({ simulateMovement: true, updateInterval: 200 })
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

/**
 * Mock adapter with fixed position.
 * Good for testing ABS/INC switching and zeroing.
 */
export const MockFixedPosition: Story = {
  decorators: [
    (Story) => {
      const [adapter] = useState(() => new MockAdapter());

      useEffect(() => {
        adapter.setPosition(123.4567, 89.1234, -45.6789);
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
 * Interactive demo showing full DRO workflow:
 * 1. Switch between ABS and INC modes
 * 2. Zero individual axes
 * 3. Zero all axes
 * 4. Toggle units
 */
export const InteractiveDemo: Story = {
  decorators: [
    (Story) => {
      const [adapter] = useState(() => new MockAdapter());

      useEffect(() => {
        adapter.setPosition(50.0, 100.0, 25.0);
        return () => adapter.disconnect();
      }, [adapter]);

      return (
        <StoryWrapper adapter={adapter}>
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
