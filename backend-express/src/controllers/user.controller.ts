import { Request, Response } from 'express';
import { activeDirectoryService } from '../services/activeDirectory.service';

export class UserController {
  /**
   * GET /api/user/me
   * Get current user information with roles
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      res.json({
        username: req.user.username,
        roles: {
          isAdmin: req.user.isAdmin,
          isServiceDesk: req.user.isServiceDesk,
          isReadOnly: req.user.isReadOnly,
        },
      });
    } catch (error: any) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ error: 'Failed to fetch user information' });
    }
  }

  /**
   * GET /api/user/search
   * Search users in Active Directory
   */
  async searchUsers(req: Request, res: Response) {
    try {
      const { query } = req.query;

      if (!query || (query as string).length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      const users = await activeDirectoryService.searchUsers(query as string);

      res.json(users);
    } catch (error: any) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  }
}

export const userController = new UserController();
