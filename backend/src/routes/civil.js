import express from 'express';
import { 
  getIndividualRecord, 
  getActiveSpouses,
  registerBirth, 
  getPendingBirths, 
  approveBirth,
  rejectBirth,
  registerMarriage,
  getPendingMarriages,
  approveMarriage,
  rejectMarriage
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
router.post('/reject-birth', authenticate, rejectBirth);
router.get('/pending-marriages', authenticate, getPendingMarriages);
router.post('/approve-marriage', authenticate, approveMarriage);
router.post('/reject-marriage', authenticate, rejectMarriage);

export default router;
