import express from 'express';
import { 
  getBankData, 
  setupBankPin, 
  verifyBankPin, 
  performBankTransfer, 
  getBankHistory 
} from '../controllers/bankController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/data', authenticate, getBankData);
router.post('/setup-pin', authenticate, setupBankPin);
router.post('/verify-pin', authenticate, verifyBankPin);
router.post('/transfer', authenticate, performBankTransfer);
router.get('/history', authenticate, getBankHistory);

export default router;
