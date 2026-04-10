import { PrismaClient } from '@prisma/client';
import { getIO } from '../services/socket.js';

const prisma = new PrismaClient();

// Get User's Vehicles
export const getMyVehicles = async (req, res) => {
  const userId = req.user.userId;
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: userId },
      include: {
        transfers: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب بيانات المركبات' });
  }
};

// Initiate Transfer
export const initiateTransfer = async (req, res) => {
  const { vehicleId, buyerNationalId, price } = req.body;
  const sellerId = req.user.userId;

  try {
    // 1. Verify Ownership
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, ownerId: sellerId }
    });
    if (!vehicle) return res.status(403).json({ error: 'أنت لا تملك هذه المركبة' });

    // 2. Check for Traffic Fines / Taxes
    const unpaidFines = await prisma.financialRecord.findMany({
      where: { nationalId: req.user.nationalId, isPaid: false }
    });
    if (unpaidFines.length > 0) {
      return res.status(400).json({ 
        error: 'لا يمكن نقل الملكية. يوجد ذمم مالية غير مدفوعة (مخالفات أو ضرائب) مرتبطة بسجلك.',
        details: unpaidFines
      });
    }

    // 3. Find Buyer (Must have portal account for real-time)
    const buyer = await prisma.user.findUnique({
      where: { nationalId: buyerNationalId }
    });
    if (!buyer) return res.status(404).json({ error: 'المشتري غير مسجل في المنصة الإلكترونية' });

    // 4. Create Transfer Request
    const transfer = await prisma.vehicleTransfer.create({
      data: {
        vehicleId,
        sellerId,
        buyerId: buyer.id,
        buyerNationalId,
        price: parseFloat(price),
        status: 'PENDING_BUYER'
      },
      include: { vehicle: true, seller: true }
    });

    // 5. Real-time Notification to Buyer
    const io = getIO();
    io.to(`user_${buyer.id}`).emit('vehicle_transfer_offer', {
      transferId: transfer.id,
      sellerName: transfer.seller.fullName,
      vehicleModel: transfer.vehicle.model,
      plateNumber: transfer.vehicle.plateNumber,
      price: transfer.price
    });

    res.json({ message: 'تم إرسال عرض نقل الملكية للمشتري بنجاح', transfer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في النظام' });
  }
};

// Buyer Action (Accept/Decline)
export const handleBuyerDecision = async (req, res) => {
  const { transferId, decision } = req.body; // 'ACCEPT' or 'DECLINE'
  const buyerId = req.user.userId;

  try {
    const transfer = await prisma.vehicleTransfer.findFirst({
      where: { id: transferId, buyerId: buyerId, status: 'PENDING_BUYER' }
    });

    if (!transfer) return res.status(404).json({ error: 'الطلب غير موجود' });

    if (decision === 'DECLINE') {
      await prisma.vehicleTransfer.update({
        where: { id: transferId },
        data: { status: 'CANCELLED' }
      });
      return res.json({ message: 'تم رفض العرض' });
    }

    // If Accepted
    await prisma.vehicleTransfer.update({
      where: { id: transferId },
      data: { status: 'PENDING_EMPLOYEE' }
    });

    // Notify Employees
    getIO().to('employee_room').emit('new_vehicle_transfer_task', { id: transferId });

    res.json({ message: 'تم قبول العرض، الطلب الآن قيد المراجعة الحكومية' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ' });
  }
};

// Employee Review
export const getPendingTransfers = async (req, res) => {
  if (req.user.role !== 'EMPLOYEE') return res.status(403).json({ error: 'غير مسموح' });
  try {
    const list = await prisma.vehicleTransfer.findMany({
      where: { status: 'PENDING_EMPLOYEE' },
      include: { vehicle: true, seller: true, buyer: true }
    });
    res.json(list);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const finalizeTransfer = async (req, res) => {
  const { transferId, status, reason } = req.body; // 'COMPLETED' or 'REJECTED'
  
  try {
    const transfer = await prisma.vehicleTransfer.findUnique({
      where: { id: transferId },
      include: { vehicle: true }
    });

    if (status === 'REJECTED') {
      await prisma.vehicleTransfer.update({
        where: { id: transferId },
        data: { status: 'REJECTED', rejectionReason: reason }
      });
      return res.json({ message: 'تم رفض المعاملة' });
    }

    // Success: SWAP OWNER
    await prisma.$transaction([
      prisma.vehicle.update({
        where: { id: transfer.vehicleId },
        data: { ownerId: transfer.buyerId }
      }),
      prisma.vehicleTransfer.update({
        where: { id: transferId },
        data: { status: 'COMPLETED' }
      }),
      prisma.notification.createMany({
        data: [
          { userId: transfer.sellerId, title: 'تم بيع المركبة', message: `تم نقل ملكية السيارة ${transfer.vehicle.plateNumber} بنجاح.` },
          { userId: transfer.buyerId, title: 'تم شراء مركبة', message: `الآن تملك السيارة ${transfer.vehicle.plateNumber} رسمياً.` }
        ]
      })
    ]);

    res.json({ message: 'تم نقل الملكية وتحديث السجلات بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في معالجة الطلب' });
  }
};
