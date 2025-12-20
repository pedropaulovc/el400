/**
 * Hook for parsing data source configuration from URL parameters.
 * Supports configuration via query params for CNCjs (iframe) and LinuxCNC (QtWebEngine).
 *
 * URL format:
 * - /?source=cncjs&host=192.168.1.100&port=8000
 * - / (no params - uses NoOpMillAdapter)
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ControllerType, DataSourceConfig } from '../types/millState';

const DEFAULT_CONFIG: DataSourceConfig = {
  type: 'noop',
  host: 'localhost',
  port: 8000,
};

/**
 * Parse and validate controller type from URL param.
 * Only 'cncjs' and 'linuxcnc' are recognized; everything else defaults to 'noop'.
 */
function parseControllerType(value: string | null): ControllerType {
  if (value === 'cncjs' || value === 'linuxcnc') {
    return value;
  }
  return 'noop';
}

/**
 * Hook to get data source configuration from URL query parameters.
 *
 * @returns DataSourceConfig parsed from URL or defaults
 */
export function useDataSourceConfig(): DataSourceConfig {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const type = parseControllerType(searchParams.get('source'));
    const host = searchParams.get('host') ?? DEFAULT_CONFIG.host;
    const portStr = searchParams.get('port');
    const port = portStr ? parseInt(portStr, 10) : DEFAULT_CONFIG.port;
    const sessionId = searchParams.get('sessionId') ?? undefined;

    return {
      type,
      host,
      port: isNaN(port) ? DEFAULT_CONFIG.port : port,
      sessionId,
    };
  }, [searchParams]);
}
