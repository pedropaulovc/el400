const BottomBezel = () => {
  return (
    <div 
      className="relative h-8 rounded-b-lg"
      style={{
        background: 'linear-gradient(180deg, #2a2a2a 0%, #3a3a3a 60%, #4a4a4a 100%)',
        boxShadow: `
          inset 0 2px 4px rgba(0,0,0,0.3),
          inset 0 -2px 4px rgba(255,255,255,0.08),
          0 -2px 6px rgba(0,0,0,0.2)
        `,
      }}
    >
      {/* Left edge highlight */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-bl-lg"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%)',
        }}
      />
      
      {/* Right edge shadow */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1 rounded-br-lg"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%)',
        }}
      />
    </div>
  );
};

export default BottomBezel;
