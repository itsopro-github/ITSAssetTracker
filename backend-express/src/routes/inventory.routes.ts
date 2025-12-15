import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticateUser, requireServiceDesk, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

// Public routes (all authenticated users)
router.get('/', inventoryController.getAll);
router.get('/types', inventoryController.getTypes);
router.get('/asset-types', inventoryController.getAssetTypes);
router.get('/low-stock-count', inventoryController.getLowStockCount);
router.get('/dashboard-stats', inventoryController.getDashboardStats);
router.get('/audit-history', inventoryController.getAllAuditHistory);
router.get('/:id', inventoryController.getById);
router.get('/:id/audit-history', inventoryController.getAuditHistoryByItemId);

// Protected routes (ServiceDesk and Admin only)
router.post('/update-quantity', requireServiceDesk, inventoryController.updateQuantity);
router.put('/:id', requireServiceDesk, inventoryController.updateItem);

// Admin only routes
router.delete('/:id', requireAdmin, inventoryController.deleteItem);

export default router;
