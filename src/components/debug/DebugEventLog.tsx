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
    // scrollIntoView may not be available in test environments (jsdom)
    if (logEndRef.current && typeof logEndRef.current.scrollIntoView === 'function') {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries]);

  const displayEntries = entries.slice(-maxEntries);

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Event Log</span>
        <span className="text-xs text-gray-400">
          {displayEntries.length}/{maxEntries}
        </span>
      </div>

      <div
        className="h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded p-1.5 font-mono text-xs"
        data-testid="event-log-container"
      >
        {displayEntries.length === 0 ? (
          <div className="text-gray-400 text-center py-6">No events</div>
        ) : (
          <div className="space-y-0.5">
            {displayEntries.map((entry, index) => (
              <div key={index} className="flex gap-1.5" data-testid="event-log-entry">
                <span className="text-gray-400 shrink-0">{entry.timestamp}</span>
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
