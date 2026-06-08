/**
 * Hook for parsing data source configuration from URL parameters.
 * Supports configuration via query params for CNCjs (iframe) and LinuxCNC (QtWebEngine).
 *
 * URL format:
 * - /?source=cncjs&host=192.168.1.100&port=8000
 * - /?source=cncjs (no host - connects to the page's own origin; used when
 *   served same-origin as a CNCjs custom widget via `cncjs --mount`)
 * - / (no params - uses NoOpMillAdapter)
 *
 * Additional params:
 * - token: CNCjs auth token. CNCjs appends this automatically to custom
 *   widget URLs; required for the socket.io handshake.
 * - serialport: serial port to open/join (e.g. /dev/ttyFAKE). When omitted,
 *   the adapter discovers and joins the port that is already in use.
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
 * Only 'cncjs', 'linuxcnc', and 'debug' are recognized; everything else defaults to 'noop'.
 */
function parseControllerType(value: string | null): ControllerType {
  if (value === 'cncjs' || value === 'linuxcnc' || value === 'debug') {
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
    const hostParam = searchParams.get('host');
    // For cncjs, no host param means "connect to the page's own origin"
    // (same-origin custom widget). Other sources keep the localhost default.
    const host = hostParam ?? (type === 'cncjs' ? '' : DEFAULT_CONFIG.host);
    const portStr = searchParams.get('port');
    const port = portStr ? parseInt(portStr, 10) : DEFAULT_CONFIG.port;
    const sessionId = searchParams.get('sessionId') ?? undefined;
    const token = searchParams.get('token') ?? undefined;
    const serialport = searchParams.get('serialport') ?? undefined;

    return {
      type,
      host,
      port: isNaN(port) ? DEFAULT_CONFIG.port : port,
      sessionId,
      token,
      serialport,
    };
  }, [searchParams]);
}
