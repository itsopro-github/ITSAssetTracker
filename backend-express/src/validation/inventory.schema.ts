/**
 * Whitelist of fields allowed for inventory updates
 */
export const ALLOWED_INVENTORY_UPDATE_FIELDS = [
  'assetType',
  'description',
  'category',
  'cost',
  'minimumThreshold',
  'reorderAmount',
  'currentQuantity'
] as const;

export type AllowedInventoryUpdateField = typeof ALLOWED_INVENTORY_UPDATE_FIELDS[number];

/**
 * Validate and sanitize inventory update request
 */
export function validateInventoryUpdate(body: any): {
  valid: boolean;
  data?: Partial<Record<AllowedInventoryUpdateField, any>>;
  errors?: string[];
} {
  const errors: string[] = [];
  const data: any = {};

  // Check for unexpected fields
  const bodyKeys = Object.keys(body);
  const unexpectedFields = bodyKeys.filter(
    key => !ALLOWED_INVENTORY_UPDATE_FIELDS.includes(key as any)
  );

  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
  }

  // Validate each allowed field
  if (body.assetType !== undefined) {
    if (!['Hardware', 'Software'].includes(body.assetType)) {
      errors.push('assetType must be "Hardware" or "Software"');
    } else {
      data.assetType = body.assetType;
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim() === '') {
      errors.push('description must be a non-empty string');
    } else {
      data.description = body.description.trim();
    }
  }

  if (body.category !== undefined) {
    if (body.category !== null && typeof body.category !== 'string') {
      errors.push('category must be a string or null');
    } else {
      data.category = body.category?.trim() || null;
    }
  }

  if (body.cost !== undefined) {
    const cost = parseFloat(body.cost);
    if (isNaN(cost) || cost < 0 || cost > 999999.99) {
      errors.push('cost must be between 0 and 999999.99');
    } else {
      data.cost = cost;
    }
  }

  if (body.minimumThreshold !== undefined) {
    const threshold = parseInt(body.minimumThreshold, 10);
    if (isNaN(threshold) || threshold < 0 || threshold > 999999) {
      errors.push('minimumThreshold must be between 0 and 999999');
    } else {
      data.minimumThreshold = threshold;
    }
  }

  if (body.reorderAmount !== undefined) {
    const amount = parseInt(body.reorderAmount, 10);
    if (isNaN(amount) || amount < 0 || amount > 999999) {
      errors.push('reorderAmount must be between 0 and 999999');
    } else {
      data.reorderAmount = amount;
    }
  }

  if (body.currentQuantity !== undefined) {
    const quantity = parseInt(body.currentQuantity, 10);
    if (isNaN(quantity) || quantity < 0 || quantity > 999999) {
      errors.push('currentQuantity must be between 0 and 999999');
    } else {
      data.currentQuantity = quantity;
    }
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}
