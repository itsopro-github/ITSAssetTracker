import { Router } from 'express';
import { configurationController } from '../controllers/configuration.controller';
import { authenticateUser, requireServiceDesk } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

// All configuration routes require ServiceDesk or Admin access
router.get('/notification', configurationController.getNotificationConfig);
router.put('/notification', requireServiceDesk, configurationController.updateNotificationConfig);

export default router;
