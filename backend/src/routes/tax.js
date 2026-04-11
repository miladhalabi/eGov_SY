import express from 'express';
import { getTaxStatus, downloadClearance, payRecord } from '../controllers/taxController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/status', authenticate, getTaxStatus);
router.get('/clearance-pdf', authenticate, downloadClearance);
router.post('/pay', authenticate, payRecord);

export default router;
