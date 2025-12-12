import { cn } from "@/lib/utils";
import { ReactNode, ButtonHTMLAttributes, useCallback } from "react";

// Audio context for reliable playback
let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let initPromise: Promise<void> | null = null;

const initAudio = async (): Promise<void> => {
  if (audioBuffer) return;
  
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  
  try {
    const response = await fetch('/sounds/button-click.wav');
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('Failed to load button click sound');
  }
};

const playClickSound = async () => {
  // If not initialized, start initialization and wait for it
  if (!audioBuffer) {
    if (!initPromise) {
      initPromise = initAudio();
    }
    await initPromise;
  }
  
  if (!audioContext || !audioBuffer) return;
  
  // Resume context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5;
  source.buffer = audioBuffer;
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(0);
};

interface DROButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'dark' | 'yellow' | 'clear' | 'enter';
  size?: 'icon' | 'secondary' | 'axis' | 'square' | 'enter';
  isActive?: boolean;
}

const DROButton = ({
  children,
  onClick,
  className,
  variant = 'default',
  size = 'square',
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
    icon: 'w-16 h-8 text-sm',           // Primary buttons: 2:1 ratio
    secondary: 'w-14 h-8 text-sm',      // Secondary buttons: 1.75:1 ratio
    axis: 'w-[52px] h-[43px] text-sm',  // Axis buttons: 1.22:1 ratio
    square: 'w-10 h-10 text-sm',        // Keypad & axis zero: 1:1 ratio
    enter: 'w-[92px] h-10 text-sm',     // Enter key: width of 2 keypad buttons + gap
  };

  const handleClick = useCallback(() => {
    playClickSound();
    onClick?.();
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
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
