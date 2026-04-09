import express from 'express';
import { 
  getIndividualRecord, 
  registerBirth, 
  getPendingBirths, 
  approveBirth 
} from '../controllers/civilController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Citizen routes
router.get('/individual-record', authenticate, getIndividualRecord);
router.post('/register-birth', authenticate, upload.single('hospitalDoc'), registerBirth);

// Employee routes
router.get('/pending-births', authenticate, getPendingBirths);
router.post('/approve-birth', authenticate, approveBirth);

export default router;
