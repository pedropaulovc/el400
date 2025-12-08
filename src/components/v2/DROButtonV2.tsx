import { cn } from "@/lib/utils";
import { ReactNode, ButtonHTMLAttributes } from "react";

interface DROButtonV2Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'dark' | 'yellow' | 'clear' | 'enter';
  size?: 'sm' | 'md' | 'lg' | 'wide';
  isActive?: boolean;
}

const DROButtonV2 = ({ 
  children, 
  onClick, 
  className,
  variant = 'default',
  size = 'md',
  isActive = false,
  ...props
}: DROButtonV2Props) => {
  const variantClasses = {
    default: 'bg-gradient-to-b from-[#707070] to-[#505050] text-[#1a1a1a] border-t-[#808080] border-l-[#808080] border-b-[#3a3a3a] border-r-[#3a3a3a]',
    dark: 'bg-gradient-to-b from-[#404040] to-[#2a2a2a] text-[#1a1a1a] border-t-[#505050] border-l-[#505050] border-b-[#1a1a1a] border-r-[#1a1a1a]',
    yellow: 'bg-gradient-to-b from-[#f0d000] to-[#c0a000] text-[#1a1a1a] border-t-[#ffe040] border-l-[#ffe040] border-b-[#806000] border-r-[#806000]',
    clear: 'bg-gradient-to-b from-[#707070] to-[#505050] text-[#1a1a1a] border-t-[#808080] border-l-[#808080] border-b-[#3a3a3a] border-r-[#3a3a3a]',
    enter: 'bg-gradient-to-b from-[#707070] to-[#505050] text-[#1a1a1a] border-t-[#808080] border-l-[#808080] border-b-[#3a3a3a] border-r-[#3a3a3a]',
  };

  // Using aspect ratio and percentage-based sizing
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { aspectRatio: '10/8', width: '100%', maxWidth: '2.5rem', fontSize: '0.75rem' },
    md: { aspectRatio: '11/10', width: '100%', maxWidth: '2.75rem', fontSize: '0.875rem' },
    lg: { aspectRatio: '12/11', width: '100%', maxWidth: '3rem', fontSize: '1rem' },
    wide: { aspectRatio: '16/10', width: '100%', maxWidth: '4rem', fontSize: '0.875rem' },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "dro-button flex items-center justify-center rounded-sm border-2 font-bold",
        "shadow-md active:shadow-inner transition-all duration-75",
        "hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/50",
        variantClasses[variant],
        isActive && "ring-2 ring-white shadow-lg brightness-110",
        className
      )}
      style={sizeStyles[size]}
      aria-pressed={isActive}
      {...props}
    >
      {children}
    </button>
  );
};

export default DROButtonV2;
