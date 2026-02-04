/**
 * CSV parsing utilities with automatic separator detection
 * and intelligent column mapping for client import
 */

import { normalizeIvorianPhone, isValidIvorianPhone } from './phoneValidation';

export interface ParsedClient {
  full_name: string;
  phone: string;
  city?: string;
  zone?: string;
  address?: string;
  notes?: string;
}

export interface ValidationResult {
  valid: ParsedClient[];
  invalid: { row: number; data: Record<string, string>; error: string }[];
  duplicates: { phone: string; rows: number[] }[];
}

// Column name mappings (CSV header -> database field)
const COLUMN_MAPPINGS: Record<string, keyof ParsedClient> = {
  // Name variations
  'nom': 'full_name',
  'name': 'full_name',
  'full_name': 'full_name',
  'fullname': 'full_name',
  'nom_complet': 'full_name',
  'client': 'full_name',
  'nom client': 'full_name',
  'nom du client': 'full_name',
  
  // Phone variations
  'telephone': 'phone',
  'téléphone': 'phone',
  'phone': 'phone',
  'tel': 'phone',
  'mobile': 'phone',
  'numero': 'phone',
  'numéro': 'phone',
  'contact': 'phone',
  
  // City variations
  'ville': 'city',
  'city': 'city',
  'localite': 'city',
  'localité': 'city',
  
  // Zone variations
  'zone': 'zone',
  'quartier': 'zone',
  'commune': 'zone',
  'secteur': 'zone',
  
  // Address variations
  'adresse': 'address',
  'address': 'address',
  'lieu': 'address',
  
  // Notes variations
  'notes': 'notes',
  'note': 'notes',
  'commentaire': 'notes',
  'commentaires': 'notes',
  'remarque': 'notes',
  'observation': 'notes',
};

/**
 * Detect the separator used in a CSV file
 * @param firstLine - First line of the CSV file
 * @returns Detected separator (; or ,)
 */
export function detectSeparator(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  if (tabCount > semicolonCount && tabCount > commaCount) {
    return '\t';
  }
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Parse a CSV line respecting quoted values
 * @param line - CSV line to parse
 * @param separator - Column separator
 * @returns Array of column values
 */
function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Map CSV headers to database fields
 * @param headers - CSV header row
 * @returns Mapping of column index to database field
 */
export function mapColumns(headers: string[]): Map<number, keyof ParsedClient> {
  const mapping = new Map<number, keyof ParsedClient>();
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim().replace(/['"]/g, '');
    const field = COLUMN_MAPPINGS[normalizedHeader];
    if (field) {
      mapping.set(index, field);
    }
  });
  
  return mapping;
}

/**
 * Parse CSV content and validate data
 * @param content - Raw CSV file content
 * @returns Validation result with valid, invalid and duplicate entries
 */
export function parseAndValidateCSV(content: string): ValidationResult {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    return { valid: [], invalid: [], duplicates: [] };
  }
  
  const separator = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], separator);
  const columnMapping = mapColumns(headers);
  
  // Check if we have the required columns
  const mappedFields = Array.from(columnMapping.values());
  if (!mappedFields.includes('full_name') || !mappedFields.includes('phone')) {
    return {
      valid: [],
      invalid: [{
        row: 0,
        data: { headers: headers.join(', ') },
        error: 'Colonnes requises manquantes: nom et téléphone'
      }],
      duplicates: []
    };
  }
  
  const valid: ParsedClient[] = [];
  const invalid: { row: number; data: Record<string, string>; error: string }[] = [];
  const phoneMap = new Map<string, number[]>(); // phone -> row numbers
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator);
    const rowData: Record<string, string> = {};
    
    // Build row data object from headers
    headers.forEach((header, idx) => {
      rowData[header] = values[idx] || '';
    });
    
    // Extract mapped fields
    const client: Partial<ParsedClient> = {};
    columnMapping.forEach((field, idx) => {
      const value = values[idx]?.trim() || '';
      if (value) {
        client[field] = value;
      }
    });
    
    // Validate required fields
    if (!client.full_name || client.full_name.trim() === '') {
      invalid.push({ row: i + 1, data: rowData, error: 'Nom manquant' });
      continue;
    }
    
    if (!client.phone) {
      invalid.push({ row: i + 1, data: rowData, error: 'Téléphone manquant' });
      continue;
    }
    
    // Normalize and validate phone
    const normalizedPhone = normalizeIvorianPhone(client.phone);
    if (!normalizedPhone) {
      invalid.push({ row: i + 1, data: rowData, error: `Téléphone invalide: ${client.phone}` });
      continue;
    }
    
    // Track duplicates within the file
    const existingRows = phoneMap.get(normalizedPhone) || [];
    existingRows.push(i + 1);
    phoneMap.set(normalizedPhone, existingRows);
    
    valid.push({
      full_name: client.full_name.trim(),
      phone: normalizedPhone,
      city: client.city?.trim(),
      zone: client.zone?.trim(),
      address: client.address?.trim(),
      notes: client.notes?.trim(),
    });
  }
  
  // Identify duplicates within the CSV
  const duplicates: { phone: string; rows: number[] }[] = [];
  phoneMap.forEach((rows, phone) => {
    if (rows.length > 1) {
      duplicates.push({ phone, rows });
    }
  });
  
  return { valid, invalid, duplicates };
}

/**
 * Get preview data from CSV (first N rows)
 * @param content - Raw CSV content
 * @param maxRows - Maximum number of rows to return
 * @returns Array of parsed rows with headers
 */
export function getCSVPreview(content: string, maxRows: number = 10): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const separator = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], separator);
  const rows: string[][] = [];
  
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    rows.push(parseCSVLine(lines[i], separator));
  }
  
  return { headers, rows };
}
