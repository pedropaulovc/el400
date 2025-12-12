interface IconProps {
  name: string;
  className?: string;
  alt?: string;
}

const Icon = ({ name, className = "w-full h-full", alt = "" }: IconProps) => {
  return (
    <>
      <style>{`
        .icon-white {
          filter: brightness(0) invert(1);
        }

        @media (forced-colors: active) {
          .icon-white {
            filter: none;
          }
        }
      `}</style>
      <img
        src={`/illustrations/${name}.svg`}
        alt={alt}
        className={`icon-white ${className}`}
        draggable={false}
        style={{
          objectFit: 'fill'
        }}
      />
    </>
  );
};

export default Icon;
