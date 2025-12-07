const PowerLED = () => {
  return (
    <div className="flex">
      <div 
        className="flex items-center justify-center w-6 h-6 rounded-full ml-4"
        style={{
          background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.5), inset -1px -1px 2px rgba(255,255,255,0.05)',
        }}
      >
        <div 
          className="w-3 h-3 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #ff6666 0%, #cc0000 50%, #990000 100%)',
            boxShadow: '0 0 8px 2px rgba(255,0,0,0.6), inset 0 -1px 2px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
};

export default PowerLED;
