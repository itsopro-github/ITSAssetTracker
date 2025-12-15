import { Request, Response } from 'express';
import { csvProcessingService } from '../services/csvProcessing.service';

export class CsvUploadController {
  /**
   * POST /api/csvupload
   * Upload and process CSV file
   */
  async uploadCsv(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const uploadedBy = req.user?.username || 'System';
      const result = await csvProcessingService.processCsvUpload(req.file.buffer, uploadedBy);

      res.json(result);
    } catch (error: any) {
      console.error('Error processing CSV upload:', error);
      res.status(500).json({ error: 'Failed to process CSV upload' });
    }
  }

  /**
   * GET /api/csvupload/template
   * Download CSV template
   */
  async downloadTemplate(req: Request, res: Response) {
    try {
      const template = csvProcessingService.generateCsvTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-template.csv');
      res.send(template);
    } catch (error: any) {
      console.error('Error generating CSV template:', error);
      res.status(500).json({ error: 'Failed to generate CSV template' });
    }
  }
}

export const csvUploadController = new CsvUploadController();
