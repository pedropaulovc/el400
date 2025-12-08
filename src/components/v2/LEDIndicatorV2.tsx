import { cn } from "@/lib/utils";

interface LEDIndicatorV2Props {
  label: string;
  isOn: boolean;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
  groupLabel?: string;
}

const LEDIndicatorV2 = ({ 
  label, 
  isOn, 
  className, 
  onClick, 
  isInteractive = false,
  groupLabel 
}: LEDIndicatorV2Props) => {
  const content = (
    <span 
      className={cn(
        "text-[0.5625rem] font-black tracking-tight transition-all",
        isOn ? "text-red-400" : "text-red-900/60"
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
          "flex flex-col items-center rounded transition-all",
          "hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-red-400/50",
          className
        )}
        style={{ padding: '0.125em 0.25em' }}
        role="radio"
        aria-checked={isOn}
        aria-label={`${label}${groupLabel ? ` (${groupLabel})` : ''}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div 
      className={cn("flex flex-col items-center", className)}
      style={{ gap: '0.125em' }}
      role="status"
      aria-label={`${label}: ${isOn ? 'active' : 'inactive'}`}
    >
      {content}
    </div>
  );
};

export default LEDIndicatorV2;
