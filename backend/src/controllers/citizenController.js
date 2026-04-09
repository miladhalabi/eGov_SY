import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all requests for the citizen
export const getMyRequests = async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. Get Birth Registrations
    const births = await prisma.birthRegistration.findMany({
      where: {
        citizenRequest: {
          citizenId: userId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Format them for a unified view
    const formattedBirths = births.map(b => ({
      id: b.id,
      service: 'تسجيل ولادة',
      details: `المولود: ${b.childName}`,
      status: b.status,
      date: b.createdAt
    }));

    // Future: Add vehicle transfers, tax applications, etc.
    
    res.json(formattedBirths);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الطلبات' });
  }
};

// Notifications
export const getNotifications = async (req, res) => {
  const userId = req.user.userId;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإشعارات' });
  }
};

export const markNotificationsAsRead = async (req, res) => {
  const userId = req.user.userId;

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};
