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

    // 2. Get Marriage Requests
    const marriages = await prisma.marriageRequest.findMany({
      where: { initiatorId: userId },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Get Vehicle Transfers
    const transfers = await prisma.vehicleTransfer.findMany({
      where: {
        OR: [
          { sellerId: userId },
          { buyerId: userId }
        ]
      },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Format them for a unified view
    const formattedBirths = births.map(b => ({
      id: b.id,
      service: 'تسجيل ولادة',
      details: `المولود: ${b.childName}`,
      status: b.status,
      reason: b.rejectionReason,
      date: b.createdAt
    }));

    const formattedMarriages = marriages.map(m => ({
      id: m.id,
      service: 'تسجيل زواج',
      details: `الطرف الآخر: ${m.partnerNationalId}`,
      status: m.status,
      reason: m.rejectionReason,
      date: m.createdAt
    }));

    const formattedTransfers = transfers.map(t => ({
      id: t.id,
      service: 'نقل ملكية مركبة',
      details: `${t.sellerId === userId ? 'بيع' : 'شراء'} ${t.vehicle.model} (${t.vehicle.plateNumber})`,
      status: t.status,
      reason: t.rejectionReason,
      date: t.createdAt
    }));

    // Combine and sort by date
    const allRequests = [...formattedBirths, ...formattedMarriages, ...formattedTransfers].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(allRequests);
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
