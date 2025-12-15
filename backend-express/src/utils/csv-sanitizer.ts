/**
 * Sanitize CSV field to prevent formula injection
 * Excel/Google Sheets interpret cells starting with =, +, -, @ as formulas
 */
export function sanitizeCsvField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }

  const value = String(field);

  // List of dangerous characters that start formulas
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];

  // Check if field starts with dangerous character
  if (dangerousChars.some(char => value.startsWith(char))) {
    // Prefix with single quote to treat as text
    return `'${value}`;
  }

  // Also escape any existing single quotes
  return value.replace(/'/g, "''");
}

/**
 * Validate numeric field with bounds checking
 */
export function parseNumericField(
  value: string | number,
  fieldName: string,
  min: number,
  max: number
): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return parsed;
}

/**
 * Validate integer field with bounds checking
 */
export function parseIntegerField(
  value: string | number,
  fieldName: string,
  min: number,
  max: number
): number {
  const parsed = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be a valid integer`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return parsed;
}
