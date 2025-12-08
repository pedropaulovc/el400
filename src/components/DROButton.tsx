import { cn } from "@/lib/utils";
import { ReactNode, ButtonHTMLAttributes } from "react";

interface DROButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'dark' | 'yellow' | 'clear' | 'enter';
  size?: 'sm' | 'md' | 'lg' | 'wide' | 'square';
  isActive?: boolean;
}

const DROButton = ({ 
  children, 
  onClick, 
  className,
  variant = 'default',
  size = 'md',
  isActive = false,
  ...props
}: DROButtonProps) => {
  const variantClasses = {
    default: 'bg-gradient-to-b from-[#707070] to-[#505050] text-[#1a1a1a] border-t-[#808080] border-l-[#808080] border-b-[#3a3a3a] border-r-[#3a3a3a]',
    dark: 'bg-gradient-to-b from-[#404040] to-[#2a2a2a] text-[#1a1a1a] border-t-[#505050] border-l-[#505050] border-b-[#1a1a1a] border-r-[#1a1a1a]',
    yellow: 'bg-gradient-to-b from-[#f0d000] to-[#c0a000] text-[#1a1a1a] border-t-[#ffe040] border-l-[#ffe040] border-b-[#806000] border-r-[#806000]',
    clear: 'bg-gradient-to-b from-[#707070] to-[#505050] text-[#1a1a1a] border-t-[#808080] border-l-[#808080] border-b-[#3a3a3a] border-r-[#3a3a3a]',
    enter: 'bg-gradient-to-b from-[#707070] to-[#505050] text-[#1a1a1a] border-t-[#808080] border-l-[#808080] border-b-[#3a3a3a] border-r-[#3a3a3a]',
  };

  const sizeClasses = {
    sm: 'w-10 h-7 text-xs',
    md: 'w-11 h-9 text-sm',
    lg: 'w-14 h-8 text-base',
    wide: 'w-16 h-9 text-sm',
    square: 'w-10 h-10 text-sm',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "dro-button flex items-center justify-center rounded-lg border-2 font-bold",
        "shadow-md active:shadow-inner transition-all duration-75",
        "hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/50",
        variantClasses[variant],
        sizeClasses[size],
        isActive && "ring-2 ring-white shadow-lg brightness-110",
        className
      )}
      aria-pressed={isActive}
      {...props}
    >
      {children}
    </button>
  );
};

export default DROButton;
