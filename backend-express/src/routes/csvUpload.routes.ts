import { Router } from 'express';
import multer from 'multer';
import { csvUploadController } from '../controllers/csvUpload.controller';
import { authenticateUser, requireServiceDesk } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Apply authentication to all routes
router.use(authenticateUser);

// All CSV upload routes require ServiceDesk or Admin access
router.post('/', requireServiceDesk, upload.single('file'), csvUploadController.uploadCsv);
router.get('/template', csvUploadController.downloadTemplate);

export default router;
