import * as XLSX from 'xlsx';
import { Readable } from 'node:stream';
import csvParser from 'csv-parser';

export interface SheetMatrix {
  /** matriz linha x coluna, valores crus (string | number | boolean). */
  rows: (string | number | boolean | null)[][];
}

export function readXlsxMatrix(buffer: Buffer): SheetMatrix {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const first = wb.SheetNames[0];
  const sheet = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
  return { rows };
}

export function readCsvMatrix(buffer: Buffer): Promise<SheetMatrix> {
  return new Promise((resolve, reject) => {
    const rows: (string | number | null)[][] = [];
    let headerPushed = false;
    Readable.from(buffer)
      .pipe(csvParser({ separator: detectSeparator(buffer) }))
      .on('headers', (headers: string[]) => {
        rows.push(headers);
        headerPushed = true;
      })
      .on('data', (obj: Record<string, string>) => {
        if (!headerPushed) {
          rows.push(Object.keys(obj));
          headerPushed = true;
        }
        rows.push(Object.values(obj));
      })
      .on('end', () => resolve({ rows }))
      .on('error', reject);
  });
}

function detectSeparator(buffer: Buffer): string {
  const sample = buffer.subarray(0, 4096).toString('utf8');
  const firstLine = sample.split(/\r?\n/)[0] ?? '';
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  return semi > comma ? ';' : ',';
}

export async function readSpreadsheet(buffer: Buffer, originalName: string): Promise<SheetMatrix> {
  const lower = originalName.toLowerCase();
  if (lower.endsWith('.csv')) return readCsvMatrix(buffer);
  return readXlsxMatrix(buffer);
}
