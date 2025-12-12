interface HousingEdgeProps {
  position: 'top' | 'bottom';
  children?: React.ReactNode;
}

const HousingEdge = ({ position, children }: HousingEdgeProps) => {
  if (position === 'top') {
    return (
      <div className="relative w-full h-12">
        {/* Main raised edge with angled cutout */}
        <svg
          viewBox="0 0 780 48"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="topEdgeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#555555" />
              <stop offset="30%" stopColor="#3d3d3d" />
              <stop offset="100%" stopColor="#252525" />
            </linearGradient>
            <linearGradient id="topHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {/* Thin strip on left (24px), thick section on right with diagonal transition */}
          <path 
            d="M 0,0 L 780,0 L 780,48 L 560,48 L 520,24 L 0,24 Z" 
            fill="url(#topEdgeGradient)"
          />
          {/* Top highlight */}
          <path 
            d="M 0,0 L 780,0 L 780,3 L 0,3 Z" 
            fill="url(#topHighlight)"
          />
          {/* Bottom edge shadow */}
          <path 
            d="M 0,22 L 520,22 L 560,46 L 780,46 L 780,48 L 558,48 L 518,24 L 0,24 Z" 
            fill="rgba(0,0,0,0.3)"
          />
        </svg>
        {/* Logo centered in the thick section (540-780px area) */}
        <div className="absolute top-1/2 -translate-y-1/2" style={{ right: '50px' }}>
          {children}
        </div>
      </div>
    );
  }

  // Bottom edge - simple straight bar (reduced by 1/3)
  return (
    <div 
      className="relative w-full h-4 mt-4 rounded-b-2xl"
      style={{
        background: 'linear-gradient(180deg, #555555 0%, #3d3d3d 30%, #252525 100%)',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.15),
          inset 0 -2px 4px rgba(0,0,0,0.3)
        `,
      }}
    />
  );
};

export default HousingEdge;
