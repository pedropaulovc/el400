import { cn } from "@/lib/utils";

interface LEDIndicatorProps {
  label: string;
  isOn: boolean;
  className?: string;
  name?: string;
  'data-testid'?: string;
}

const LEDIndicator = ({
  label,
  isOn,
  className,
  name,
  'data-testid': testId
}: LEDIndicatorProps) => {
  return (
    <label
      className={cn(
        "flex flex-col items-center gap-0.5 px-1 py-0.5 rounded cursor-default",
        className
      )}
      data-testid={testId}
    >
      <input
        type="radio"
        name={name}
        checked={isOn}
        disabled
        className="sr-only"
        readOnly
      />
      <span
        className={cn(
          "text-[9px] font-black tracking-tight transition-all",
          isOn ? "text-red-400 mode-indicator-active" : "text-red-900/60 mode-indicator-inactive"
        )}
        style={isOn ? {
          textShadow: '0 0 8px hsl(0, 100%, 65%), 0 0 16px hsl(0, 100%, 55%), 0 0 24px hsl(0, 100%, 45%)'
        } : undefined}
      >
        {label}
      </span>
    </label>
  );
};

export default LEDIndicator;
