interface IconProps {
  name: string;
  className?: string;
  alt?: string;
}

const Icon = ({ name, className = "max-w-full max-h-full object-contain", alt = "" }: IconProps) => {
  return (
    <img
      src={`/illustrations/${name}.svg`}
      alt={alt}
      className={className}
      draggable={false}
      style={{
        filter: 'brightness(0) invert(1)'
      }}
    />
  );
};

export default Icon;
