import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class ConfigurationController {
  /**
   * GET /api/configuration/notification
   * Get notification configuration
   */
  async getNotificationConfig(req: Request, res: Response) {
    try {
      let config = await prisma.notificationConfig.findFirst();

      // Create default config if none exists
      if (!config) {
        config = await prisma.notificationConfig.create({
          data: {
            adGroupName: 'IT_Governance',
            additionalEmailRecipients: null,
          },
        });
      }

      res.json(config);
    } catch (error: any) {
      console.error('Error fetching notification config:', error);
      res.status(500).json({ error: 'Failed to fetch notification configuration' });
    }
  }

  /**
   * PUT /api/configuration/notification
   * Update notification configuration
   */
  async updateNotificationConfig(req: Request, res: Response) {
    try {
      const { id, adGroupName, additionalEmailRecipients } = req.body;

      if (!adGroupName) {
        return res.status(400).json({ error: 'AD Group Name is required' });
      }

      let config = await prisma.notificationConfig.findFirst();

      if (config) {
        // Update existing config
        config = await prisma.notificationConfig.update({
          where: { id: config.id },
          data: {
            adGroupName,
            additionalEmailRecipients: additionalEmailRecipients || null,
          },
        });
      } else {
        // Create new config
        config = await prisma.notificationConfig.create({
          data: {
            adGroupName,
            additionalEmailRecipients: additionalEmailRecipients || null,
          },
        });
      }

      res.json(config);
    } catch (error: any) {
      console.error('Error updating notification config:', error);
      res.status(500).json({ error: 'Failed to update notification configuration' });
    }
  }
}

export const configurationController = new ConfigurationController();
