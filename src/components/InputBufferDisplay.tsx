interface InputBufferDisplayProps {
  activeAxis: 'X' | 'Y' | 'Z' | null;
  inputBuffer: string;
}

const InputBufferDisplay = ({ activeAxis, inputBuffer }: InputBufferDisplayProps) => {
  if (!inputBuffer || !activeAxis) return null;

  return (
    <div 
      className="absolute bottom-10 left-24 px-2 py-1 rounded text-sm font-mono"
      style={{
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

export default InputBufferDisplay;
