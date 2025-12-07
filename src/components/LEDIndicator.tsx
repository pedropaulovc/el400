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
  const textContent = (
    <span 
      className={cn(
        "text-[10px] font-bold uppercase tracking-tight transition-all duration-200",
        isOn 
          ? "text-red-500" 
          : "text-red-900"
      )}
      style={isOn ? {
        textShadow: '0 0 8px rgba(239, 68, 68, 0.8), 0 0 16px rgba(239, 68, 68, 0.5)'
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
          "flex items-center justify-center px-1.5 py-0.5 rounded transition-all",
          "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-red-400/50",
          className
        )}
        role="radio"
        aria-checked={isOn}
        aria-label={`${label}${groupLabel ? ` (${groupLabel})` : ''}`}
      >
        {textContent}
      </button>
    );
  }

  return (
    <div 
      className={cn("flex items-center justify-center px-1.5 py-0.5", className)}
      role="status"
      aria-label={`${label}: ${isOn ? 'active' : 'inactive'}`}
    >
      {textContent}
    </div>
  );
};

export default LEDIndicator;
