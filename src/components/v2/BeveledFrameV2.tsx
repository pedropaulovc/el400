import { ReactNode } from "react";

interface BeveledFrameV2Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const BeveledFrameV2 = ({ children, className = "", style }: BeveledFrameV2Props) => {
  return (
    <div 
      className={`rounded ${className}`}
      style={{
        background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
        boxShadow: `
          inset 3px 3px 6px rgba(0,0,0,0.5),
          inset -1px -1px 2px rgba(255,255,255,0.05),
          2px 2px 4px rgba(0,0,0,0.3)
        `,
        padding: '2%',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default BeveledFrameV2;
