const BrandLogo = () => {
  return (
    <div className="absolute top-2 right-8 flex items-center gap-2 z-10">
      <div 
        className="px-3 py-1 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #f8f8f8 0%, #e0e0e0 100%)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
            <div className="w-2.5 h-1.5 bg-white/60 rounded-full" />
          </div>
          <span className="text-cyan-600 font-bold text-xs tracking-wide">electronica</span>
        </div>
      </div>
    </div>
  );
};

export default BrandLogo;
