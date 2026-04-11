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
    // 1. Verify Ownership & Self-Selling
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, ownerId: sellerId }
    });
    if (!vehicle) return res.status(403).json({ error: 'أنت لا تملك هذه المركبة' });

    if (buyerNationalId === req.user.nationalId) {
      return res.status(400).json({ error: 'لا يمكن بيع المركبة لنفسك' });
    }

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
      where: { 
        id: transferId, 
        buyerId: buyerId, 
        status: { in: ['PENDING_BUYER', 'WAITING_FOR_PAYMENT'] } 
      },
      include: { vehicle: true }
    });

    if (!transfer) return res.status(404).json({ error: 'الطلب غير موجود أو لا يمكن تعديله حالياً' });

    if (decision === 'DECLINE') {
      await prisma.vehicleTransfer.update({
        where: { id: transferId },
        data: { status: 'CANCELLED' }
      });

      // Notify Seller
      const io = getIO();
      io.to(`user_${transfer.sellerId}`).emit('new_notification', {
        id: Math.random().toString(),
        title: 'رفض عرض بيع',
        message: `قام المشتري برفض العرض لسيارة ${transfer.vehicle.plateNumber}. تم إلغاء المعاملة.`,
        createdAt: new Date(),
        isRead: false
      });

      return res.json({ message: 'تم رفض العرض وإلغاء المعاملة' });
    }

    // If Accepted -> Move to Waiting for Payment
    const updatedTransfer = await prisma.vehicleTransfer.update({
      where: { id: transferId },
      data: { status: 'WAITING_FOR_PAYMENT' },
      include: { vehicle: true, seller: true, buyer: true }
    });

    // Create Persistent Notifications for both parties
    await prisma.notification.createMany({
      data: [
        {
          userId: updatedTransfer.sellerId,
          title: 'قبول عرض بيع',
          message: `وافق المشتري على عرضك لسيارة ${updatedTransfer.vehicle.plateNumber}. المعاملة بانتظار إرسال إثبات الدفع البنكي من قبل المشتري.`
        },
        {
          userId: updatedTransfer.buyerId,
          title: 'تثبيت طلب شراء',
          message: `لقد قبلت عرض الشراء لسيارة ${updatedTransfer.vehicle.plateNumber}. يرجى إدخال رقم الحوالة البنكية لتثبيت المعاملة.`
        }
      ]
    });

    const io = getIO();

    // Notify Seller & Buyer (Real-time)
    io.to(`user_${updatedTransfer.sellerId}`).emit('new_notification', { 
      id: Math.random().toString(), 
      title: 'قبول عرض بيع', 
      message: `وافق المشتري على عرضك لسيارة ${updatedTransfer.vehicle.plateNumber}. بانتظار إرسال إثبات الدفع البنكي.`,
      createdAt: new Date(),
      isRead: false
    });
    io.to(`user_${updatedTransfer.buyerId}`).emit('new_notification', { 
      id: Math.random().toString(),
      title: 'تثبيت طلب شراء', 
      message: `لقد قبلت عرض الشراء لسيارة ${updatedTransfer.vehicle.plateNumber}. يرجى تزويدنا برقم الإشعار البنكي.`,
      createdAt: new Date(),
      isRead: false
    });

    res.json({ message: 'تم قبول العرض، يرجى تقديم إثبات الدفع البنكي لتثبيت المعاملة' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ' });
  }
};

export const submitBankProof = async (req, res) => {
  const { transferId, referenceNumber } = req.body;
  const buyerId = req.user.userId;

  try {
    const transfer = await prisma.vehicleTransfer.findUnique({
      where: { id: transferId },
      include: { seller: true, vehicle: true }
    });

    if (!transfer || transfer.buyerId !== buyerId) {
      return res.status(404).json({ error: 'المعاملة غير موجودة' });
    }

    // 1. Verify with Simulated Bank
    const bankTx = await prisma.bankTransaction.findUnique({
      where: { referenceNumber }
    });

    if (!bankTx) {
      return res.status(400).json({ error: 'رقم الإشعار البنكي غير صحيح أو لم يتم العثور عليه في سجلات المصرف المركزي' });
    }

    // 2. Cross-verify data (Sender, Receiver, Amount)
    const buyerNationalId = req.user.nationalId;
    const sellerNationalId = transfer.seller.nationalId;

    if (bankTx.senderNationalId !== buyerNationalId || 
        bankTx.receiverNationalId !== sellerNationalId || 
        bankTx.amount < transfer.price) {
      return res.status(400).json({ error: 'بيانات الحوالة البنكية لا تتطابق مع أطراف المعاملة أو المبلغ المتفق عليه' });
    }

    // 3. Move to Government Review
    await prisma.vehicleTransfer.update({
      where: { id: transferId },
      data: { 
        status: 'PENDING_EMPLOYEE',
        bankTransactionId: referenceNumber
      }
    });

    // Notify Employees
    getIO().to('employee_room').emit('new_vehicle_transfer_task', { id: transferId });
    
    // Notify Seller
    getIO().to(`user_${transfer.sellerId}`).emit('new_notification', {
      id: Math.random().toString(),
      title: 'إشعار بنكي مؤكد',
      message: `قام المشتري بإرسال حوالة بنكية بقيمة ${transfer.price} ل.س. الطلب الآن قيد التدقيق الحكومي النهائي.`,
      createdAt: new Date(),
      isRead: false
    });

    res.json({ message: 'تم التحقق من الحوالة البنكية بنجاح. المعاملة الآن قيد التدقيق الحكومي النهائي.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في معالجة التحقق البنكي' });
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

export const getIncomingTransfers = async (req, res) => {
  const userId = req.user.userId;
  try {
    const transfers = await prisma.vehicleTransfer.findMany({
      where: { 
        buyerId: userId, 
        status: { in: ['PENDING_BUYER', 'WAITING_FOR_PAYMENT'] } 
      },
      include: { vehicle: true, seller: true }
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب العروض القادمة' });
  }
};

export const finalizeTransfer = async (req, res) => {
  if (req.user.role !== 'EMPLOYEE') return res.status(403).json({ error: 'غير مسموح للمواطنين تنفيذ هذه العملية' });
  const { transferId, status, reason } = req.body; // 'COMPLETED' or 'REJECTED'
  
  try {
    const transfer = await prisma.vehicleTransfer.findUnique({
      where: { id: transferId },
      include: { vehicle: true }
    });

    if (status === 'REJECTED') {
      const updated = await prisma.vehicleTransfer.update({
        where: { id: transferId },
        data: { status: 'REJECTED', rejectionReason: reason },
        include: { vehicle: true }
      });
      
      // Notify both parties of rejection
      await prisma.notification.createMany({
        data: [
          { userId: updated.sellerId, title: 'رفض نقل ملكية', message: `تم رفض طلب نقل ملكية السيارة ${updated.vehicle.plateNumber}. السبب: ${reason}` },
          { userId: updated.buyerId, title: 'رفض نقل ملكية', message: `تم رفض طلب شراء السيارة ${updated.vehicle.plateNumber}. السبب: ${reason}` }
        ]
      });

      const io = getIO();
      const notifData = (title, msg) => ({ id: Math.random().toString(), title, message: msg, createdAt: new Date(), isRead: false });
      
      io.to(`user_${updated.sellerId}`).emit('new_notification', notifData('تحديث معاملة', `تم رفض نقل ملكية السيارة ${updated.vehicle.plateNumber}`));
      io.to(`user_${updated.buyerId}`).emit('new_notification', notifData('تحديث معاملة', `تم رفض طلب الشراء للسيارة ${updated.vehicle.plateNumber}`));

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

    const io = getIO();
    const notifData = (title, msg) => ({ id: Math.random().toString(), title, message: msg, createdAt: new Date(), isRead: false });
    
    io.to(`user_${transfer.sellerId}`).emit('new_notification', notifData('عملية ناجحة', `تم بيع المركبة ${transfer.vehicle.plateNumber} بنجاح`));
    io.to(`user_${transfer.buyerId}`).emit('new_notification', notifData('عملية ناجحة', `تم شراء المركبة ${transfer.vehicle.plateNumber} بنجاح`));

    res.json({ message: 'تم نقل الملكية وتحديث السجلات بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في معالجة الطلب' });
  }
};
