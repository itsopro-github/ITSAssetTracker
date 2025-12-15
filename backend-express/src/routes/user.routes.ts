import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateUser } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

router.get('/me', userController.getCurrentUser);
router.get('/search', userController.searchUsers);

export default router;
