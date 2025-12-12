import { cn } from "@/lib/utils";

interface LEDIndicatorProps {
  label: string;
  isOn: boolean;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
  groupLabel?: string;
  'data-testid'?: string;
}

const LEDIndicator = ({
  label,
  isOn,
  className,
  onClick,
  isInteractive = false,
  groupLabel,
  'data-testid': testId
}: LEDIndicatorProps) => {
  const content = (
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
  );

  if (isInteractive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-0.5 px-1 py-0.5 rounded transition-all",
          "hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-red-400/50",
          className
        )}
        role="radio"
        aria-checked={isOn}
        aria-label={`${label}${groupLabel ? ` (${groupLabel})` : ''}`}
        data-testid={testId}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn("flex flex-col items-center gap-0.5", className)}
      role="status"
      aria-label={`${label}: ${isOn ? 'active' : 'inactive'}`}
      data-testid={testId}
    >
      {content}
    </div>
  );
};

export default LEDIndicator;
