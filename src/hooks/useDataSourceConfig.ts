/**
 * Hook for parsing data source configuration from URL parameters.
 * Supports configuration via query params for both CNCjs (iframe) and LinuxCNC (QtWebEngine).
 *
 * URL format:
 * - /?source=cncjs&host=192.168.1.100&port=8000
 * - /?source=mock
 * - /?source=manual (or no params - default)
 */

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ControllerType, DataSourceConfig } from '../types/machine';

const DEFAULT_CONFIG: DataSourceConfig = {
  type: 'manual',
  host: 'localhost',
  port: 8000,
};

/**
 * Parse and validate controller type from URL param
 */
function parseControllerType(value: string | null): ControllerType {
  if (value === 'cncjs' || value === 'linuxcnc' || value === 'mock' || value === 'manual') {
    return value;
  }
  return 'manual';
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
    const host = searchParams.get('host') || DEFAULT_CONFIG.host;
    const portStr = searchParams.get('port');
    const port = portStr ? parseInt(portStr, 10) : DEFAULT_CONFIG.port;

    return {
      type,
      host,
      port: isNaN(port) ? DEFAULT_CONFIG.port : port,
    };
  }, [searchParams]);
}
