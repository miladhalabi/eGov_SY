import express from 'express';
import { 
  getMyVehicles, 
  initiateTransfer, 
  handleBuyerDecision,
  getPendingTransfers,
  finalizeTransfer,
  getIncomingTransfers
} from '../controllers/trafficController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Citizen routes
router.get('/my-vehicles', authenticate, getMyVehicles);
router.get('/incoming-transfers', authenticate, getIncomingTransfers);
router.post('/initiate-transfer', authenticate, initiateTransfer);
router.post('/respond-transfer', authenticate, handleBuyerDecision);

// Employee routes
router.get('/pending-transfers', authenticate, getPendingTransfers);
router.post('/finalize-transfer', authenticate, finalizeTransfer);

export default router;
