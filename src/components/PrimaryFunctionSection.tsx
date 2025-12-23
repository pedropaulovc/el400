import DROButton from "./DROButton";
import Icon from "./Icon";
import BeveledFrame from "./BeveledFrame";
import PowerLED from "./PowerLED";
import { useDispatch } from "../stores/dro";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const PrimaryFunctionSection = () => {
  const dispatch = useDispatch();

  const handleToggleUnit = () => {
    // inchMmReducer handles nvMem update and display recomputation
    dispatch({ eventName: 'BTN_INCH_MM' });
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
            <DROButton onClick={() => { dispatch({ eventName: 'BTN_ABS_INC' }); }} size="icon" className="p-0" data-testid="btn-abs-inc" title="Abs/Inc">
              <Icon name="abs-inc" /><span className="sr-only">Abs/Inc</span>
            </DROButton>
            <DROButton onClick={handleToggleUnit} size="icon" className="p-0" data-testid="btn-toggle-unit" title="Toggle units">
              <Icon name="inch-mm" /><span className="sr-only">Toggle units</span>
            </DROButton>
            <DROButton onClick={noop} size="icon" className="p-0" data-testid="btn-center" title="Reference">
              <Icon name="reference" /><span className="sr-only">Reference</span>
            </DROButton>
            <DROButton onClick={() => { dispatch({ eventName: 'BTN_DISTANCE_TO_GO' }); }} size="icon" className="p-0" data-testid="btn-distance-to-go" title="Distance to Go">
              <Icon name="preset" /><span className="sr-only">Distance to Go</span>
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
