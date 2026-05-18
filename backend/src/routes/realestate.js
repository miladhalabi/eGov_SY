import express from 'express';
import { getMyProperties, requestStatement, downloadTitleDeed } from '../controllers/realestateController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-properties', authenticate, getMyProperties);
router.post('/request-statement', authenticate, requestStatement);
router.get('/statement-pdf/:propertyId', authenticate, downloadTitleDeed);

export default router;
