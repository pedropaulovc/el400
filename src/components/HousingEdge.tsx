interface HousingEdgeProps {
  position: 'top' | 'bottom';
  children?: React.ReactNode;
}

const HousingEdge = ({ position, children }: HousingEdgeProps) => {
  if (position === 'top') {
    return (
      <div className="relative w-full h-12">
        {/* Main raised edge with angled cutout - CSS only */}
        <div
          className="absolute inset-0 w-full"
          style={{
            background: 'linear-gradient(180deg, #555555 0%, #3d3d3d 30%, #252525 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 71.8% 100%, 66.7% 50%, 0 50%)',
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.2),
              inset 0 -2px 4px rgba(0,0,0,0.3)
            `,
          }}
        />
        {/* Logo centered in the thick section */}
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
