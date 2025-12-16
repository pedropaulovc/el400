import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";
import { useVolatileMemory } from "../hooks/useVolatileMemory";
import { useOperationDispatch } from "../context/OperationStateContext";

const noop = () => {};

const SecondaryFunctionSection = () => {
  const vMem = useVolatileMemory();
  const dispatch = useOperationDispatch();

  const handleHalf = () => {
    if (vMem.activeAxis) {
      vMem.halfAxis(vMem.activeAxis);
    }
  };

  const handleFunction = () => {
    dispatch({ type: 'BTN_FUNCTION' });
  };

  return (
    <>
      <h2 className="sr-only">Secondary functions</h2>
      <BeveledFrame style={{ width: '280px' }}>
      <div style={{ background: '#000000' }} className="p-3 rounded-lg h-full">
        <div className="flex flex-col gap-4 h-full justify-center">
          {/* Top row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-bolt-circle">
              <Icon name="bolt-hole-pcd-function" /><span className="sr-only">Bolt hole</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-arc-contour">
              <Icon name="arc-contouring-function" /><span className="sr-only">Arc contour</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-angle-hole">
              <Icon name="angle-hole-function" /><span className="sr-only">Angle hole</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-grid-hole">
              <Icon name="grid-hole-function" /><span className="sr-only">Grid hole</span>
            </DROButton>
          </div>

          {/* Bottom row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-calculator">
              <Icon name="calculator" /><span className="sr-only">Calculator</span>
            </DROButton>
            <DROButton onClick={handleHalf} variant="dark" size="secondary" className="p-0" data-testid="btn-half">
              <Icon name="half-function" /><span className="sr-only">Half</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-sdm">
              <Icon name="sdm-function" /><span className="sr-only">SDM</span>
            </DROButton>
            <DROButton onClick={handleFunction} variant="dark" size="secondary" className="p-0" data-testid="btn-function">
              <Icon name="function" /><span className="sr-only">Function</span>
            </DROButton>
          </div>
        </div>
      </div>
    </BeveledFrame>
    </>
  );
};

export default SecondaryFunctionSection;
