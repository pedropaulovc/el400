const BrandLogo = () => {
  return (
    <div 
      className="flex items-center gap-2 px-4 py-1 rounded-sm"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {/* Cyan oval icon */}
      <svg width="20" height="14" viewBox="0 0 20 14">
        <defs>
          <linearGradient id="ovalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4dd0e1" />
            <stop offset="100%" stopColor="#00acc1" />
          </linearGradient>
        </defs>
        <ellipse cx="10" cy="7" rx="9" ry="6" fill="url(#ovalGradient)" />
        <ellipse cx="8" cy="5" rx="4" ry="2" fill="rgba(255,255,255,0.5)" />
      </svg>
      
      {/* Brand text */}
      <span 
        className="font-bold text-sm tracking-wide"
        style={{ color: '#00838f' }}
      >
        electronica
      </span>
    </div>
  );
};

export default BrandLogo;
