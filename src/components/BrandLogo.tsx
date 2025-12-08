const BrandLogo = () => {
  return (
    <div 
      className="px-10 py-1 rounded-sm h-full flex items-center"
      style={{
        background: 'linear-gradient(180deg, #f8f8f8 0%, #e0e0e0 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center justify-center gap-1.5" style={{ height: '95%' }}>
        <div className="rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center" style={{ height: '100%', aspectRatio: '1' }}>
          <div className="w-2/3 h-1/2 bg-white/60 rounded-full" />
        </div>
        <span className="text-cyan-600 font-bold tracking-wide" style={{ fontSize: '95%', lineHeight: 1 }}>electronica</span>
      </div>
    </div>
  );
};

export default BrandLogo;
