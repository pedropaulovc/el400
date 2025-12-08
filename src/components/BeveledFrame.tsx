import { ReactNode } from "react";

interface BeveledFrameProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const BeveledFrame = ({ children, className = "", style }: BeveledFrameProps) => {
  return (
    <div 
      className={`p-1 rounded-xl ${className}`}
      style={{
        background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
        boxShadow: `
          inset 3px 3px 6px rgba(0,0,0,0.5),
          inset -1px -1px 2px rgba(255,255,255,0.05),
          2px 2px 4px rgba(0,0,0,0.3)
        `,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default BeveledFrame;
