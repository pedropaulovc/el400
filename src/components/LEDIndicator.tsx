import { cn } from "@/lib/utils";

interface LEDIndicatorProps {
  label: string;
  isOn: boolean;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
  groupLabel?: string;
}

const LEDIndicator = ({ 
  label, 
  isOn, 
  className, 
  onClick, 
  isInteractive = false,
  groupLabel 
}: LEDIndicatorProps) => {
  const content = (
    <>
      <div 
        className={cn(
          "w-2 h-2 rounded-full transition-all duration-200",
          isOn 
            ? "bg-red-500 led-on" 
            : "bg-red-900"
        )}
        aria-hidden="true"
      />
      <span className={cn(
        "text-[8px] font-bold uppercase tracking-tight",
        isOn ? "text-red-400" : "text-red-800"
      )}>
        {label}
      </span>
    </>
  );

  if (isInteractive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-0.5 p-1 rounded transition-all",
          "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-red-400/50",
          isOn && "ring-1 ring-red-400/30",
          className
        )}
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
      className={cn("flex flex-col items-center gap-0.5", className)}
      role="status"
      aria-label={`${label}: ${isOn ? 'active' : 'inactive'}`}
    >
      {content}
    </div>
  );
};

export default LEDIndicator;
