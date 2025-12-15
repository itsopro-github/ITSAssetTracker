import nodemailer from 'nodemailer';
import { config } from '../config';
import { activeDirectoryService } from './activeDirectory.service';
import prisma from '../config/prisma';
import { Inventory } from '@prisma/client';

export interface IEmailService {
  sendLowStockAlert(item: Inventory, appBaseUrl: string): Promise<void>;
  sendLowStockAlerts(items: Inventory[], appBaseUrl: string): Promise<void>;
}

class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.enableSsl,
      auth:
        config.email.smtpUsername && config.email.smtpPassword
          ? {
              user: config.email.smtpUsername,
              pass: config.email.smtpPassword,
            }
          : undefined,
      tls: {
        rejectUnauthorized: false, // For development with self-signed certificates
      },
    });
  }

  /**
   * Send low stock alert for a single item
   */
  async sendLowStockAlert(item: Inventory, appBaseUrl: string): Promise<void> {
    const recipients = await this.getRecipients();

    if (recipients.length === 0) {
      console.log('No recipients configured for low stock alerts');
      return;
    }

    const subject = `Low Stock Alert: ${item.itemNumber} - ${item.description}`;
    const html = this.buildSingleItemEmailHtml(item, appBaseUrl);

    try {
      await this.transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
        to: recipients.join(', '),
        subject,
        html,
      });

      console.log(`Low stock alert sent for item ${item.itemNumber}`);
    } catch (error) {
      console.error(`Error sending low stock alert for item ${item.itemNumber}:`, error);
      throw error;
    }
  }

  /**
   * Send low stock alert for multiple items
   */
  async sendLowStockAlerts(items: Inventory[], appBaseUrl: string): Promise<void> {
    if (items.length === 0) return;

    const recipients = await this.getRecipients();

    if (recipients.length === 0) {
      console.log('No recipients configured for low stock alerts');
      return;
    }

    const subject = `Low Stock Alert: ${items.length} Item(s) Below Threshold`;
    const html = this.buildMultipleItemsEmailHtml(items, appBaseUrl);

    try {
      await this.transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
        to: recipients.join(', '),
        subject,
        html,
      });

      console.log(`Low stock alert sent for ${items.length} items`);
    } catch (error) {
      console.error('Error sending low stock alerts:', error);
      throw error;
    }
  }

  /**
   * Get email recipients from notification config
   */
  private async getRecipients(): Promise<string[]> {
    const notificationConfig = await prisma.notificationConfig.findFirst();

    if (!notificationConfig) {
      return [];
    }

    const recipients: string[] = [];

    // Get emails from AD group
    if (notificationConfig.adGroupName) {
      try {
        const groupEmails = await activeDirectoryService.getEmailAddressesForGroup(
          notificationConfig.adGroupName
        );
        recipients.push(...groupEmails);
      } catch (error) {
        console.error('Error fetching AD group emails:', error);
      }
    }

    // Add additional email recipients
    if (notificationConfig.additionalEmailRecipients) {
      const additionalEmails = notificationConfig.additionalEmailRecipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
      recipients.push(...additionalEmails);
    }

    // Remove duplicates
    return [...new Set(recipients)];
  }

  /**
   * Build HTML email for a single item
   */
  private buildSingleItemEmailHtml(item: Inventory, appBaseUrl: string): string {
    const needsReorder = item.currentQuantity < item.minimumThreshold;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #dc2626;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
    }
    .item-details {
      background-color: white;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #dc2626;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .value {
      color: #333;
      margin-left: 10px;
    }
    .warning {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #059669;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Low Stock Alert</h2>
    </div>
    <div class="content">
      <p>The following inventory item has fallen below its minimum threshold and needs to be reordered:</p>

      <div class="item-details">
        <p><span class="label">Item Number:</span><span class="value">${item.itemNumber}</span></p>
        <p><span class="label">Description:</span><span class="value">${item.description}</span></p>
        <p><span class="label">Type:</span><span class="value">${item.assetType}</span></p>
        ${item.category ? `<p><span class="label">Category:</span><span class="value">${item.category}</span></p>` : ''}
        <p><span class="label">Current Quantity:</span><span class="value" style="color: #dc2626;">${item.currentQuantity}</span></p>
        <p><span class="label">Minimum Threshold:</span><span class="value">${item.minimumThreshold}</span></p>
        <p><span class="label">Recommended Reorder Amount:</span><span class="value">${item.reorderAmount}</span></p>
        <p><span class="label">Unit Cost:</span><span class="value">$${item.cost.toFixed(2)}</span></p>
      </div>

      ${needsReorder ? '<div class="warning"><strong>Action Required:</strong> This item needs to be reordered immediately.</div>' : ''}

      <a href="${appBaseUrl}/inventory" class="button">View Inventory</a>

      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        This is an automated message from the ITS Asset Tracker system.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Build HTML email for multiple items
   */
  private buildMultipleItemsEmailHtml(items: Inventory[], appBaseUrl: string): string {
    const itemRows = items
      .map(
        item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.itemNumber}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.assetType}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #dc2626; font-weight: bold;">${item.currentQuantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.minimumThreshold}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.reorderAmount}</td>
      </tr>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #dc2626;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background-color: white;
      margin: 15px 0;
    }
    th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #ddd;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #059669;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Low Stock Alert - Multiple Items</h2>
    </div>
    <div class="content">
      <p><strong>${items.length}</strong> inventory item(s) have fallen below their minimum thresholds and need to be reordered:</p>

      <table>
        <thead>
          <tr>
            <th>Item Number</th>
            <th>Description</th>
            <th>Type</th>
            <th>Current Qty</th>
            <th>Min Threshold</th>
            <th>Reorder Amt</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <a href="${appBaseUrl}/inventory" class="button">View Inventory</a>

      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        This is an automated message from the ITS Asset Tracker system.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

export const emailService = new EmailService();
