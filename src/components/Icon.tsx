interface IconProps {
  name: string;
  className?: string;
  alt?: string;
}

const Icon = ({ name, className = "w-full h-full", alt = "" }: IconProps) => {
  return (
    <img
      src={`/illustrations/${name}.svg`}
      alt={alt}
      className={className}
      draggable={false}
      style={{ objectFit: 'fill' }}
    />
  );
};

export default Icon;
