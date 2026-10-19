export interface CacheEntry {
  id: string;
  FIELD_NAME: string;
  FIELD_VALUE: string;
}

export interface ServerTarget {
  ip: string;
  port: string;
  fullUrl: (path: string) => string;
}

export interface ServerExecutionResult {
  server: string;
  status: 'PENDING' | 'SUCCESS' | 'TIMEOUT' | 'ERROR';
  statusCode?: number;
  message?: string;
  durationMs?: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST';
  serverRange: string;
  entries: CacheEntry[];
  successCount: number;
  failureCount: number;
}

/**
 * Parses ranges like "25-27, 32-36, 40" into concrete IP arrays: 
 * e.g., ["10.177.44.25", "10.177.44.26", "10.177.44.27", ...]
 */
export function parseServerOctets(subnetBase: string, rangeInput: string, port: string): ServerTarget[] {
  const cleanInput = rangeInput.replace(/\s+/g, '');
  const segments = cleanInput.split(',').filter(Boolean);
  const octets = new Set<number>();

  for (const seg of segments) {
    if (seg.includes('-')) {
      const [startStr, endStr] = seg.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          octets.add(i);
        }
      }
    } else {
      const single = parseInt(seg, 10);
      if (!isNaN(single)) octets.add(single);
    }
  }

  return Array.from(octets)
    .sort((a, b) => a - b)
    .map((octet) => {
      const ip = `${subnetBase}.${octet}`;
      return {
        ip,
        port,
        fullUrl: (path: string) => `http://${ip}:${port}${path}`
      };
    });
}

/**
 * Extracts FIELD_NAME and FIELD_VALUE pairs from Oracle/SQL insert statements
 * targeting CACHE_DETAILS table.
 */
export function extractFromSqlInserts(sqlText: string): CacheEntry[] {
  const extracted: CacheEntry[] = [];
  
  // Matches: INSERT INTO ... (..., FIELD_NAME, FIELD_VALUE, ...) VALUES (..., 'name', 'val', ...)
  // Also supports single or multiline queries
  const insertRegex = /INSERT\s+INTO\s+[\w\.]*CACHE_DETAILS\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\);?/gi;

  let match: RegExpExecArray | null;
  while ((match = insertRegex.exec(sqlText)) !== null) {
    const columnsStr = match[1];
    const valuesStr = match[2];

    const columns = columnsStr.split(',').map((c) => c.trim().toUpperCase());
    
    // Parse CSV values while respecting quoted strings
    const valuesMatch = valuesStr.match(/(?:'[^']*'|[^,])+/g);
    if (!valuesMatch) continue;

    const values = valuesMatch.map((v) => v.trim().replace(/^'|'$/g, ''));

    const fieldNameIdx = columns.indexOf('FIELD_NAME');
    const fieldValueIdx = columns.indexOf('FIELD_VALUE');

    if (fieldNameIdx !== -1 && fieldValueIdx !== -1 && values[fieldNameIdx] !== undefined) {
      extracted.push({
        id: crypto.randomUUID(),
        FIELD_NAME: values[fieldNameIdx],
        FIELD_VALUE: values[fieldValueIdx] ?? ''
      });
    }
  }

  return extracted;
}