interface InputBufferDisplayV2Props {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  inputBuffer: string;
}

const InputBufferDisplayV2 = ({ activeAxis, inputBuffer }: InputBufferDisplayV2Props) => {
  if (!inputBuffer || !activeAxis) return null;

  return (
    <div 
      className="absolute rounded text-[0.875rem] font-mono"
      style={{
        bottom: '8%',
        left: '12%',
        padding: '0.25rem 0.5rem',
        color: 'hsl(120, 100%, 50%)',
        backgroundColor: 'rgba(0,0,0,0.9)',
        textShadow: '0 0 8px hsl(120, 100%, 50%)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
      }}
    >
      {activeAxis}: {inputBuffer}_
    </div>
  );
};

export default InputBufferDisplayV2;
