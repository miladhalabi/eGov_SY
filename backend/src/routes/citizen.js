import express from 'express';
import { getMyRequests, getNotifications, markNotificationsAsRead } from '../controllers/citizenController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/requests', authenticate, getMyRequests);
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/read', authenticate, markNotificationsAsRead);

export default router;
