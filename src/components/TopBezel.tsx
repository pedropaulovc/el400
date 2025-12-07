import BrandLogo from "./BrandLogo";

const TopBezel = () => {
  return (
    <div 
      className="relative h-12 rounded-t-lg flex items-center justify-end px-6"
      style={{
        background: 'linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 40%, #2a2a2a 100%)',
        boxShadow: `
          inset 0 2px 4px rgba(255,255,255,0.1),
          inset 0 -2px 4px rgba(0,0,0,0.3),
          0 4px 8px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Left edge highlight */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-tl-lg"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
        }}
      />
      
      {/* Right edge shadow */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1 rounded-tr-lg"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />
      
      <BrandLogo />
    </div>
  );
};

export default TopBezel;
