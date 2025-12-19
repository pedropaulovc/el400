import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";
import PowerLED from "./PowerLED";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { useNonVolatileMemoryContext } from "../context/NonVolatileMemoryContext";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const PrimaryFunctionSection = () => {
  const vMem = useVolatileMemory();
  const { nvMem, updateNvMem } = useNonVolatileMemoryContext();

  const handleToggleUnit = () => {
    updateNvMem({ defaultUnit: nvMem.defaultUnit === 'inch' ? 'mm' : 'inch' });
  };

  return (
    <div className="relative" style={{ width: '412px' }}>
      <h2 className="sr-only">Primary functions</h2>
      <BeveledFrame className="w-full">
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%)',
          }}
        >
          <div className="flex justify-between w-full">
            <DROButton onClick={noop} size="icon" className="p-0" data-testid="btn-settings" title="Settings">
              <Icon name="setup" /><span className="sr-only">Settings</span>
            </DROButton>
            <DROButton onClick={vMem.toggleMode} size="icon" className="p-0" data-testid="btn-abs-inc" title="Abs/Inc">
              <Icon name="abs-inc" /><span className="sr-only">Abs/Inc</span>
            </DROButton>
            <DROButton onClick={handleToggleUnit} size="icon" className="p-0" data-testid="btn-toggle-unit" title="Toggle units">
              <Icon name="inch-mm" /><span className="sr-only">Toggle units</span>
            </DROButton>
            <DROButton onClick={noop} size="icon" className="p-0" data-testid="btn-center" title="Reference">
              <Icon name="reference" /><span className="sr-only">Reference</span>
            </DROButton>
            <DROButton onClick={vMem.zeroAll} size="icon" className="p-0" data-testid="btn-zero-all" title="Zero all axes">
              <Icon name="preset" /><span className="sr-only">Zero all axes</span>
            </DROButton>
          </div>
        </div>
      </BeveledFrame>
      <div className="absolute -bottom-3 left-4">
        <PowerLED />
      </div>
    </div>
  );
};

export default PrimaryFunctionSection;
