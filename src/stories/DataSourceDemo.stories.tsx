import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useMillStore } from "../stores/millStore";
import { useDROStore, useDispatch } from "../stores/droStore";
import { INITIAL_DRO_STATE_DATA as INITIAL_DRO_CONTEXT } from "../stores/dro/droStateMachine";
import { INITIAL_VOLATILE_MEMORY_STATE } from "../types/volatileMemory";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { MockMillAdapter } from "../adapters/MockMillAdapter";
import type { Axis } from "../types/volatileMemory";

/**
 * Initialize stores for storybook - starts in idle state (skip boot).
 * Returns an unsubscribe function for cleanup.
 */
function initializeStoresForStory(connection: MockMillAdapter): () => void {
  // Reset settings store
  useSettingsStore.setState({
    nvMem: {
      beepEnabled: true,
      defaultUnit: 'inch',
      precision: 4,
      bootMessageMode: 'skip',
      scaleResolution: { X: '5', Y: '5', Z: '5' },
      taperOnAxis: 'X',
      axisDirection: { X: 'normal', Y: 'normal', Z: 'normal' },
      zDepthSense: 'depth-negative',
      measurementMode: { X: 'radius', Y: 'radius', Z: 'radius' },
    },
  });

  // Set up mill store with connection
  useMillStore.setState({
    millState: connection.getState(),
    connection: connection,
    isConnecting: false,
    error: null,
  });

  // Subscribe to connection updates and return unsubscribe function
  const unsubscribe = connection.subscribe((state) => {
    useMillStore.getState()._setMillState(state);
  });

  // Reset DRO store to idle state
  useDROStore.setState({
    stateName: 'idle',
    stateData: INITIAL_DRO_CONTEXT,
    vMem: INITIAL_VOLATILE_MEMORY_STATE,
  });

  return unsubscribe;
}

/**
 * Interactive volatile memory demo component.
 * Shows ABS/INC switching and value management.
 */
function VolatileMemoryDemo() {
  const vMem = useVolatileMemory();
  const millState = useMillStore((s) => s.millState);
  const nvMem = useSettingsStore((s) => s.nvMem);
  const updateNvMem = useSettingsStore((s) => s.updateNvMem);
  const dispatch = useDispatch();

  const handleZeroAxis = (axis: Axis) => {
    vMem.zeroAxis(axis);
  };

  const handleDistanceToGo = () => {
    dispatch({ eventName: 'BTN_DISTANCE_TO_GO' });
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
          onClick={() => { vMem.setMode("abs"); }}
          className={`px-4 py-2 rounded ${
            vMem.mode === "abs"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          ABS
        </button>
        <button
          onClick={() => { vMem.setMode("inc"); }}
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
            { updateNvMem({
              defaultUnit: nvMem.defaultUnit === "inch" ? "mm" : "inch",
            }); }
          }
          className="px-4 py-2 rounded bg-blue-600 text-white ml-auto"
        >
          Toggle Unit
        </button>
        <button
          onClick={handleDistanceToGo}
          className="px-4 py-2 rounded bg-purple-600 text-white"
        >
          Distance to Go
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
              onClick={() => { handleZeroAxis(axis); }}
              className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs"
            >
              Zero
            </button>
          </div>
        ))}
      </div>

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
 * Story wrapper that initializes stores with connection.
 */
function StoryWrapper({
  connection,
  children,
}: {
  connection?: MockMillAdapter;
  children: React.ReactNode;
}) {
  // Use useState with initializer to ensure stable connection reference
  const [conn] = useState(() => connection ?? new MockMillAdapter());

  // Initialize stores in useEffect to avoid side effects during render
  useEffect(() => {
    const unsubscribe = initializeStoresForStory(conn);

    return () => {
      unsubscribe();
      conn.disconnect();
    };
  }, [conn]);

  return <>{children}</>;
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
 * Uses NoOpMillAdapter - always connected but values stay at origin.
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
        () => new MockMillAdapter({ simulateMovement: true, updateInterval: 200 })
      );

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
      const [connection] = useState(() => new MockMillAdapter());

      useEffect(() => {
        connection.setPosition(123.4567, 89.1234, -45.6789);
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
      const [connection] = useState(() => new MockMillAdapter());

      useEffect(() => {
        connection.setPosition(50.0, 100.0, 25.0);
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
