import express from 'express';
import { getMyClearanceRequests, requestClearance, downloadClearancePDF } from '../controllers/criminalController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-requests', authenticate, getMyClearanceRequests);
router.post('/request-clearance', authenticate, requestClearance);
router.get('/clearance-pdf/:requestId', authenticate, downloadClearancePDF);

export default router;
