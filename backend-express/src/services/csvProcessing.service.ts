import { parse } from 'csv-parse/sync';
import { Inventory } from '@prisma/client';
import prisma from '../config/prisma';
import { emailService } from './email.service';
import { config } from '../config';
import { sanitizeCsvField, parseNumericField, parseIntegerField } from '../utils/csv-sanitizer';

export interface CsvUploadResult {
  successCount: number;
  failureCount: number;
  errors: string[];
  lowStockAlerts: Array<{
    itemNumber: string;
    description: string;
    currentQuantity: number;
    minimumThreshold: number;
  }>;
}

interface InventoryCsvRow {
  ItemNumber: string;
  AssetType?: string;
  Description: string;
  Category?: string;
  Cost: string;
  MinimumThreshold: string;
  ReorderAmount: string;
  CurrentQuantity?: string;
  HardwareDescription?: string;
  HardwareType?: string;
}

export interface ICsvProcessingService {
  processCsvUpload(csvBuffer: Buffer, uploadedBy: string): Promise<CsvUploadResult>;
  generateCsvTemplate(): string;
}

class CsvProcessingService implements ICsvProcessingService {
  /**
   * Process uploaded CSV file and update inventory
   */
  async processCsvUpload(csvBuffer: Buffer, uploadedBy: string): Promise<CsvUploadResult> {
    const result: CsvUploadResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      lowStockAlerts: [],
    };

    try {
      // Parse CSV
      const records = parse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as InventoryCsvRow[];

      if (records.length === 0) {
        result.errors.push('CSV file is empty');
        return result;
      }

      // Process each row
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNumber = i + 2; // +2 because of header row and 0-based index

        try {
          // Validate required fields
          if (!row.ItemNumber || !row.Description) {
            result.errors.push(`Row ${rowNumber}: ItemNumber and Description are required`);
            result.failureCount++;
            continue;
          }

          // SECURITY: Sanitize fields to prevent CSV injection
          const itemNumber = sanitizeCsvField(row.ItemNumber);
          const rawDescription = row.Description || row.HardwareDescription || '';
          const description = sanitizeCsvField(rawDescription);
          const assetType = sanitizeCsvField(row.AssetType || 'Hardware');
          const category = row.Category || row.HardwareType
            ? sanitizeCsvField(row.Category || row.HardwareType)
            : null;

          // SECURITY: Validate numeric fields with bounds checking
          const cost = parseNumericField(row.Cost, 'Cost', 0, 999999.99);
          const minimumThreshold = parseIntegerField(row.MinimumThreshold, 'MinimumThreshold', 0, 999999);
          const reorderAmount = parseIntegerField(row.ReorderAmount, 'ReorderAmount', 0, 999999);
          const currentQuantity = row.CurrentQuantity
            ? parseIntegerField(row.CurrentQuantity, 'CurrentQuantity', 0, 999999)
            : 0;

          // Check if item exists (use sanitized itemNumber)
          const existingItem = await prisma.inventory.findUnique({
            where: { itemNumber },
          });

          if (existingItem) {
            // Update existing item
            const previousQuantity = existingItem.currentQuantity;

            await prisma.inventory.update({
              where: { id: existingItem.id },
              data: {
                assetType,
                description,
                category,
                cost,
                minimumThreshold,
                reorderAmount,
                currentQuantity: currentQuantity > 0 ? currentQuantity : existingItem.currentQuantity,
                lastModifiedBy: uploadedBy,
                lastModifiedDate: new Date(),
                // Update legacy fields for backward compatibility
                hardwareDescription: row.HardwareDescription || description,
                hardwareType: row.HardwareType || category,
              },
            });

            // Create audit entry if quantity changed
            if (currentQuantity > 0 && currentQuantity !== previousQuantity) {
              await prisma.auditHistory.create({
                data: {
                  itemId: existingItem.id,
                  previousQuantity,
                  newQuantity: currentQuantity,
                  changedBy: uploadedBy,
                  changeDate: new Date(),
                },
              });
            }

            // Check if item is low stock
            const updatedQuantity = currentQuantity > 0 ? currentQuantity : existingItem.currentQuantity;
            if (updatedQuantity < minimumThreshold) {
              result.lowStockAlerts.push({
                itemNumber,
                description,
                currentQuantity: updatedQuantity,
                minimumThreshold,
              });
            }
          } else {
            // Create new item
            const newItem = await prisma.inventory.create({
              data: {
                itemNumber,
                assetType,
                description,
                category,
                cost,
                minimumThreshold,
                reorderAmount,
                currentQuantity: currentQuantity || 0,
                lastModifiedBy: uploadedBy,
                lastModifiedDate: new Date(),
                hardwareDescription: row.HardwareDescription || description,
                hardwareType: row.HardwareType || category,
              },
            });

            // Create initial audit entry
            if (currentQuantity > 0) {
              await prisma.auditHistory.create({
                data: {
                  itemId: newItem.id,
                  previousQuantity: 0,
                  newQuantity: currentQuantity,
                  changedBy: uploadedBy,
                  changeDate: new Date(),
                },
              });
            }

            // Check if new item is low stock
            if (currentQuantity < minimumThreshold) {
              result.lowStockAlerts.push({
                itemNumber,
                description,
                currentQuantity,
                minimumThreshold,
              });
            }
          }

          result.successCount++;
        } catch (error: any) {
          result.errors.push(`Row ${rowNumber}: ${error.message}`);
          result.failureCount++;
        }
      }

      // Send low stock alerts if any
      if (result.lowStockAlerts.length > 0) {
        try {
          const lowStockItems = await prisma.inventory.findMany({
            where: {
              itemNumber: {
                in: result.lowStockAlerts.map(alert => alert.itemNumber),
              },
            },
          });

          await emailService.sendLowStockAlerts(lowStockItems, config.baseUrl);
        } catch (emailError) {
          console.error('Error sending low stock alerts:', emailError);
          // Don't fail the whole operation if email fails
        }
      }
    } catch (error: any) {
      result.errors.push(`CSV parsing error: ${error.message}`);
      result.failureCount = 1;
    }

    return result;
  }

  /**
   * Generate CSV template for download
   */
  generateCsvTemplate(): string {
    const headers = [
      'ItemNumber',
      'AssetType',
      'Description',
      'Category',
      'Cost',
      'MinimumThreshold',
      'ReorderAmount',
      'CurrentQuantity',
    ];

    const exampleRow = [
      'HW-001',
      'Hardware',
      'Dell Latitude 7420 Laptop',
      'Laptop',
      '1200.00',
      '10',
      '20',
      '15',
    ];

    return `${headers.join(',')}\n${exampleRow.join(',')}\n`;
  }
}

export const csvProcessingService = new CsvProcessingService();
