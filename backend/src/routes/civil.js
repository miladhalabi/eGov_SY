import express from 'express';
import { 
  getIndividualRecord, 
  getActiveSpouses,
  registerBirth, 
  getPendingBirths, 
  approveBirth,
  registerMarriage,
  getPendingMarriages,
  approveMarriage
} from '../controllers/civilController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Citizen routes
router.get('/individual-record', authenticate, getIndividualRecord);
router.get('/spouses', authenticate, getActiveSpouses);
router.post('/register-birth', authenticate, upload.single('hospitalDoc'), registerBirth);
router.post('/register-marriage', authenticate, upload.single('document'), registerMarriage);

// Employee routes
router.get('/pending-births', authenticate, getPendingBirths);
router.post('/approve-birth', authenticate, approveBirth);
router.get('/pending-marriages', authenticate, getPendingMarriages);
router.post('/approve-marriage', authenticate, approveMarriage);

export default router;
