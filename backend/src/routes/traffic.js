import express from 'express';
import { 
  getMyVehicles, 
  initiateTransfer, 
  handleBuyerDecision,
  getPendingTransfers,
  finalizeTransfer
} from '../controllers/trafficController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Citizen routes
router.get('/my-vehicles', authenticate, getMyVehicles);
router.post('/initiate-transfer', authenticate, initiateTransfer);
router.post('/respond-transfer', authenticate, handleBuyerDecision);

// Employee routes
router.get('/pending-transfers', authenticate, getPendingTransfers);
router.post('/finalize-transfer', authenticate, finalizeTransfer);

export default router;
