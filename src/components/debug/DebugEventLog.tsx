import { useEffect, useRef } from 'react';

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface DebugEventLogProps {
  entries: LogEntry[];
  maxEntries?: number;
}

export function DebugEventLog({ entries, maxEntries = 100 }: DebugEventLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const displayEntries = entries.slice(-maxEntries);

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Event Log</h3>
        <span className="text-xs text-gray-500">
          {displayEntries.length} / {maxEntries} entries
        </span>
      </div>

      <div
        className="h-64 overflow-y-auto bg-gray-950 border border-gray-700 rounded p-2 font-mono text-xs"
        data-testid="event-log-container"
      >
        {displayEntries.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No events yet</div>
        ) : (
          <div className="space-y-1">
            {displayEntries.map((entry, index) => (
              <div key={index} className="flex gap-2" data-testid="event-log-entry">
                <span className="text-gray-600 shrink-0">{entry.timestamp}</span>
                <span className={`${getTypeColor(entry.type)} break-all`}>
                  {entry.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
