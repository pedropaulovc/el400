interface HousingEdgeProps {
  position: 'top' | 'bottom';
  children?: React.ReactNode;
}

const HousingEdge = ({ position, children }: HousingEdgeProps) => {
  if (position === 'top') {
    return (
      <div className="relative w-full h-10 mb-2">
        {/* Main raised edge with angled cutout */}
        <svg 
          viewBox="0 0 780 40" 
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
          {/* Main shape with angled cut on right */}
          <path 
            d="M 0,0 L 580,0 L 580,40 L 0,40 Z" 
            fill="url(#topEdgeGradient)"
          />
          {/* Angled section */}
          <path 
            d="M 580,0 L 780,0 L 780,40 L 620,40 Z" 
            fill="url(#topEdgeGradient)"
          />
          {/* Top highlight */}
          <path 
            d="M 0,0 L 580,0 L 580,3 L 0,3 Z" 
            fill="url(#topHighlight)"
          />
          <path 
            d="M 580,0 L 780,0 L 780,3 L 580,3 Z" 
            fill="url(#topHighlight)"
          />
          {/* Bottom shadow line */}
          <path 
            d="M 0,38 L 580,38 L 620,40 L 780,40 L 780,38 L 616,38 L 580,36 L 0,36 Z" 
            fill="rgba(0,0,0,0.3)"
          />
        </svg>
        {/* Logo positioned in the angled section */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          {children}
        </div>
      </div>
    );
  }

  // Bottom edge - simple straight bar
  return (
    <div 
      className="relative w-full h-6 mt-4"
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
