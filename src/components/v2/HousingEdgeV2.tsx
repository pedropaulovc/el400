interface HousingEdgeV2Props {
  position: 'top' | 'bottom';
  children?: React.ReactNode;
}

const HousingEdgeV2 = ({ position, children }: HousingEdgeV2Props) => {
  if (position === 'top') {
    return (
      <div className="relative w-full h-full">
        {/* Main raised edge with angled cutout */}
        <svg 
          viewBox="0 0 780 48" 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="topEdgeGradientV2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#555555" />
              <stop offset="30%" stopColor="#3d3d3d" />
              <stop offset="100%" stopColor="#252525" />
            </linearGradient>
            <linearGradient id="topHighlightV2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          {/* Thin strip on left (24px), thick section on right with diagonal transition */}
          <path 
            d="M 0,0 L 780,0 L 780,48 L 580,48 L 540,24 L 0,24 Z" 
            fill="url(#topEdgeGradientV2)"
          />
          {/* Top highlight */}
          <path 
            d="M 0,0 L 780,0 L 780,3 L 0,3 Z" 
            fill="url(#topHighlightV2)"
          />
          {/* Bottom edge shadow */}
          <path 
            d="M 0,22 L 540,22 L 580,46 L 780,46 L 780,48 L 578,48 L 538,24 L 0,24 Z" 
            fill="rgba(0,0,0,0.3)"
          />
        </svg>
        {/* Logo centered above keypad - approximately 8% from right edge */}
        <div className="absolute top-1/2 right-[8%] -translate-y-1/2">
          {children}
        </div>
      </div>
    );
  }

  // Bottom edge - simple straight bar
  return (
    <div 
      className="relative w-full h-full"
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

export default HousingEdgeV2;
