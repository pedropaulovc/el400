import { cn } from "@/lib/utils";

interface LEDIndicatorProps {
  label: string;
  isOn: boolean;
  className?: string;
}

const LEDIndicator = ({ label, isOn, className }: LEDIndicatorProps) => {
  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      <div 
        className={cn(
          "w-2 h-2 rounded-full transition-all duration-200",
          isOn 
            ? "bg-red-500 led-on" 
            : "bg-red-900"
        )}
      />
      <span className={cn(
        "text-[8px] font-bold uppercase tracking-tight",
        isOn ? "text-red-400" : "text-red-800"
      )}>
        {label}
      </span>
    </div>
  );
};

export default LEDIndicator;
