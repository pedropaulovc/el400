const BrandLogoV2 = () => {
  return (
    <div 
      className="rounded-sm flex items-center"
      style={{
        background: 'linear-gradient(180deg, #f8f8f8 0%, #e0e0e0 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        padding: '0.25em 0.75em',
      }}
    >
      <div className="flex items-center gap-[0.375em]">
        <div 
          className="rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center"
          style={{ width: '1em', height: '1em' }}
        >
          <div 
            className="bg-white/60 rounded-full" 
            style={{ width: '0.625em', height: '0.375em' }}
          />
        </div>
        <span className="text-cyan-600 font-bold text-[0.75rem] tracking-wide">electronica</span>
      </div>
    </div>
  );
};

export default BrandLogoV2;
