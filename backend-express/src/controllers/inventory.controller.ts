import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { emailService } from '../services/email.service';
import { config } from '../config';
import { validateInventoryUpdate } from '../validation/inventory.schema';

export class InventoryController {
  /**
   * GET /api/inventory
   * Get all inventory items with filtering and sorting
   */
  async getAll(req: Request, res: Response) {
    try {
      const {
        search,
        assetType,
        category,
        hardwareType,
        needsReorder,
        sortBy = 'itemNumber',
        sortDesc = 'false',
      } = req.query;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { itemNumber: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { hardwareDescription: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (assetType) {
        where.assetType = assetType as string;
      }

      if (category) {
        where.category = category as string;
      }

      if (hardwareType) {
        where.hardwareType = hardwareType as string;
      }

      // Get all items
      let items = await prisma.inventory.findMany({
        where,
        orderBy: {
          [sortBy as string]: sortDesc === 'true' ? 'desc' : 'asc',
        },
      });

      // Filter by needsReorder if specified
      if (needsReorder === 'true') {
        items = items.filter(item => item.currentQuantity < item.minimumThreshold);
      } else if (needsReorder === 'false') {
        items = items.filter(item => item.currentQuantity >= item.minimumThreshold);
      }

      // Add needsReorder property to each item
      const itemsWithReorderFlag = items.map(item => ({
        ...item,
        needsReorder: item.currentQuantity < item.minimumThreshold,
      }));

      res.json(itemsWithReorderFlag);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
  }

  /**
   * GET /api/inventory/:id
   * Get single inventory item by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const item = await prisma.inventory.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      res.json({
        ...item,
        needsReorder: item.currentQuantity < item.minimumThreshold,
      });
    } catch (error: any) {
      console.error('Error fetching inventory item:', error);
      res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
  }

  /**
   * GET /api/inventory/audit-history
   * Get all audit history with optional filtering
   */
  async getAllAuditHistory(req: Request, res: Response) {
    try {
      const { limit, search } = req.query;

      const where: any = {};

      if (search) {
        where.item = {
          OR: [
            { itemNumber: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        };
      }

      const auditHistory = await prisma.auditHistory.findMany({
        where,
        include: {
          item: true,
        },
        orderBy: {
          changeDate: 'desc',
        },
        take: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(auditHistory);
    } catch (error: any) {
      console.error('Error fetching audit history:', error);
      res.status(500).json({ error: 'Failed to fetch audit history' });
    }
  }

  /**
   * GET /api/inventory/:id/audit-history
   * Get audit history for specific item
   */
  async getAuditHistoryByItemId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const auditHistory = await prisma.auditHistory.findMany({
        where: { itemId: parseInt(id, 10) },
        orderBy: { changeDate: 'desc' },
      });

      res.json(auditHistory);
    } catch (error: any) {
      console.error('Error fetching item audit history:', error);
      res.status(500).json({ error: 'Failed to fetch item audit history' });
    }
  }

  /**
   * GET /api/inventory/types
   * Get all unique hardware types/categories
   */
  async getTypes(req: Request, res: Response) {
    try {
      const items = await prisma.inventory.findMany({
        select: {
          hardwareType: true,
          category: true,
        },
      });

      // Combine and deduplicate types
      const typesSet = new Set<string>();
      items.forEach(item => {
        if (item.hardwareType) typesSet.add(item.hardwareType);
        if (item.category) typesSet.add(item.category);
      });

      const types = Array.from(typesSet).filter(Boolean).sort();

      res.json(types);
    } catch (error: any) {
      console.error('Error fetching inventory types:', error);
      res.status(500).json({ error: 'Failed to fetch inventory types' });
    }
  }

  /**
   * GET /api/inventory/asset-types
   * Get all asset types (Hardware/Software)
   */
  async getAssetTypes(req: Request, res: Response) {
    try {
      const items = await prisma.inventory.findMany({
        select: {
          assetType: true,
        },
        distinct: ['assetType'],
      });

      const assetTypes = items.map(item => item.assetType).filter(Boolean).sort();

      res.json(assetTypes);
    } catch (error: any) {
      console.error('Error fetching asset types:', error);
      res.status(500).json({ error: 'Failed to fetch asset types' });
    }
  }

  /**
   * GET /api/inventory/low-stock-count
   * Get count of items below threshold
   */
  async getLowStockCount(req: Request, res: Response) {
    try {
      const items = await prisma.inventory.findMany();
      const lowStockCount = items.filter(item => item.currentQuantity < item.minimumThreshold).length;

      res.json({ count: lowStockCount });
    } catch (error: any) {
      console.error('Error fetching low stock count:', error);
      res.status(500).json({ error: 'Failed to fetch low stock count' });
    }
  }

  /**
   * GET /api/inventory/dashboard-stats
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const items = await prisma.inventory.findMany();

      const totalItems = items.reduce((sum, item) => sum + item.currentQuantity, 0);
      const lowStockCount = items.filter(item => item.currentQuantity < item.minimumThreshold).length;
      const totalValue = items.reduce((sum, item) => sum + item.cost * item.currentQuantity, 0);

      // Get recent changes (last 10 audit entries)
      const recentChanges = await prisma.auditHistory.findMany({
        take: 10,
        orderBy: { changeDate: 'desc' },
        include: { item: true },
      });

      res.json({
        totalItems,
        lowStockCount,
        totalValue,
        recentChanges,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  }

  /**
   * POST /api/inventory/update-quantity
   * Update inventory quantity
   */
  async updateQuantity(req: Request, res: Response) {
    try {
      const { itemNumber, quantityChange, serviceNowTicketUrl, assignedToUser } = req.body;

      if (!itemNumber || quantityChange === undefined) {
        return res.status(400).json({ error: 'ItemNumber and QuantityChange are required' });
      }

      const item = await prisma.inventory.findUnique({
        where: { itemNumber },
      });

      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const previousQuantity = item.currentQuantity;
      const newQuantity = previousQuantity + quantityChange;

      if (newQuantity < 0) {
        return res.status(400).json({ error: 'Resulting quantity cannot be negative' });
      }

      // Update inventory
      const updatedItem = await prisma.inventory.update({
        where: { id: item.id },
        data: {
          currentQuantity: newQuantity,
          lastModifiedBy: req.user?.username || 'System',
          lastModifiedDate: new Date(),
        },
      });

      // Create audit entry
      await prisma.auditHistory.create({
        data: {
          itemId: item.id,
          itemNumber: item.itemNumber,
          itemDescription: item.description || item.hardwareDescription || 'No description',
          previousQuantity,
          newQuantity,
          changedBy: req.user?.username || 'System',
          changeDate: new Date(),
          serviceNowTicketUrl: serviceNowTicketUrl || null,
        },
      });

      // Send low stock alert if needed
      if (newQuantity < item.minimumThreshold && previousQuantity >= item.minimumThreshold) {
        try {
          await emailService.sendLowStockAlert(updatedItem, config.baseUrl);
        } catch (emailError) {
          console.error('Error sending low stock alert:', emailError);
          // Don't fail the request if email fails
        }
      }

      res.json({
        ...updatedItem,
        needsReorder: updatedItem.currentQuantity < updatedItem.minimumThreshold,
      });
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      res.status(500).json({ error: 'Failed to update inventory quantity' });
    }
  }

  /**
   * PUT /api/inventory/:id
   * Update inventory item
   */
  async updateItem(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // SECURITY: Validate and whitelist fields
      const validation = validateInventoryUpdate(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      const existingItem = await prisma.inventory.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!existingItem) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const previousQuantity = existingItem.currentQuantity;

      // Update item with validated data only
      const updatedItem = await prisma.inventory.update({
        where: { id: parseInt(id, 10) },
        data: {
          ...validation.data,
          lastModifiedBy: req.user?.username || 'System',
          lastModifiedDate: new Date(),
        },
      });

      // Create audit entry if quantity changed
      if (validation.data!.currentQuantity !== undefined && validation.data!.currentQuantity !== previousQuantity) {
        await prisma.auditHistory.create({
          data: {
            itemId: updatedItem.id,
            itemNumber: updatedItem.itemNumber,
            itemDescription: updatedItem.description || updatedItem.hardwareDescription || 'No description',
            previousQuantity,
            newQuantity: validation.data!.currentQuantity,
            changedBy: req.user?.username || 'System',
            changeDate: new Date(),
          },
        });

        // Send low stock alert if needed
        if (
          validation.data!.currentQuantity < updatedItem.minimumThreshold &&
          previousQuantity >= updatedItem.minimumThreshold
        ) {
          try {
            await emailService.sendLowStockAlert(updatedItem, config.baseUrl);
          } catch (emailError) {
            console.error('Error sending low stock alert:', emailError);
          }
        }
      }

      res.json({
        ...updatedItem,
        needsReorder: updatedItem.currentQuantity < updatedItem.minimumThreshold,
      });
    } catch (error: any) {
      console.error('Error updating item:', error);
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  }

  /**
   * DELETE /api/inventory/:id
   * Delete inventory item (Admin only)
   */
  async deleteItem(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingItem = await prisma.inventory.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!existingItem) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      // Create audit entry for deletion WITH item details
      // This record will persist after the item is deleted (itemId will be set to null)
      await prisma.auditHistory.create({
        data: {
          itemId: existingItem.id,
          itemNumber: existingItem.itemNumber,
          itemDescription: existingItem.description || existingItem.hardwareDescription || 'No description',
          previousQuantity: existingItem.currentQuantity,
          newQuantity: 0, // Set to 0 to indicate deletion
          changedBy: req.user?.username || 'System',
          changeDate: new Date(),
          serviceNowTicketUrl: 'ITEM DELETED',
        },
      });

      // Delete the inventory item
      await prisma.inventory.delete({
        where: { id: parseInt(id, 10) },
      });

      res.json({
        message: 'Inventory item deleted successfully',
        deletedItem: existingItem
      });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      res.status(500).json({ error: 'Failed to delete inventory item' });
    }
  }
}

export const inventoryController = new InventoryController();
