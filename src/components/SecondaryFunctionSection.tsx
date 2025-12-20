import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";
import { useDispatch } from "../stores/dro";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const SecondaryFunctionSection = () => {
  const dispatch = useDispatch();

  const handleHalf = () => {
    dispatch({ eventName: 'BTN_HALF' });
  };

  const handleFunction = () => {
    dispatch({ eventName: 'BTN_FUNCTION' });
  };

  const handleCalculator = () => {
    dispatch({ eventName: 'BTN_CALCULATOR' });
  };

  return (
    <>
      <h2 className="sr-only">Secondary functions</h2>
      <BeveledFrame style={{ width: '280px' }}>
      <div style={{ background: '#000000' }} className="p-3 rounded-lg h-full">
        <div className="flex flex-col gap-4 h-full justify-center">
          {/* Top row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-bolt-circle" title="Bolt hole">
              <Icon name="bolt-hole-pcd-function" /><span className="sr-only">Bolt hole</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-arc-contour" title="Arc contour">
              <Icon name="arc-contouring-function" /><span className="sr-only">Arc contour</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-angle-hole" title="Angle hole">
              <Icon name="angle-hole-function" /><span className="sr-only">Angle hole</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-grid-hole" title="Grid hole">
              <Icon name="grid-hole-function" /><span className="sr-only">Grid hole</span>
            </DROButton>
          </div>

          {/* Bottom row */}
          <div className="flex gap-4 justify-between">
            <DROButton onClick={handleCalculator} variant="dark" size="secondary" className="p-0" data-testid="btn-calculator" title="Calculator">
              <Icon name="calculator" /><span className="sr-only">Calculator</span>
            </DROButton>
            <DROButton onClick={handleHalf} variant="dark" size="secondary" className="p-0" data-testid="btn-half" title="Half">
              <Icon name="half-function" /><span className="sr-only">Half</span>
            </DROButton>
            <DROButton onClick={noop} variant="dark" size="secondary" className="p-0" data-testid="btn-sdm" title="SDM">
              <Icon name="sdm-function" /><span className="sr-only">SDM</span>
            </DROButton>
            <DROButton onClick={handleFunction} variant="dark" size="secondary" className="p-0" data-testid="btn-function" title="Function">
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
