import { PrismaClient } from '@prisma/client';
import { generateCriminalClearance } from '../services/pdfService.js';

const prisma = new PrismaClient();

// Get criminal clearance requests for citizen
export const getMyClearanceRequests = async (req, res) => {
  const userId = req.user.userId;
  try {
    const requests = await prisma.criminalClearanceRequest.findMany({
      where: { citizenId: userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في جلب طلبات السجل العدلي' });
  }
};

// Request non-conviction clearance
export const requestClearance = async (req, res) => {
  const { purpose } = req.body;
  const citizenId = req.user.userId;
  const nationalId = req.user.nationalId;

  if (!purpose) {
    return res.status(400).json({ error: 'يرجى تحديد الجهة الموجه إليها الوثيقة' });
  }

  try {
    // 1. Cross-domain validation: Check for ANY unpaid financial record (fines, taxes)
    const unpaidRecords = await prisma.financialRecord.findMany({
      where: { nationalId, isPaid: false }
    });

    if (unpaidRecords.length > 0) {
      return res.status(400).json({
        error: 'تم حظر طلب غير المحكوم. يوجد ذمم مالية أو غرامات مستحقة الدفع في صحيفتك الحكومية.',
        details: unpaidRecords
      });
    }

    // 2. Fetch citizen criminal record from database
    const record = await prisma.criminalRecord.findUnique({
      where: { nationalId }
    });

    // 3. Process status automatically (Option B)
    let status = 'APPROVED';
    let rejectionReason = null;

    if (record && record.hasCriminalRecord) {
      status = 'REJECTED';
      rejectionReason = `لا يمكن منح الوثيقة لوجود سوابق جرمية مسجلة: ${record.convictions}`;
    }

    // 4. Create request in database
    const request = await prisma.criminalClearanceRequest.create({
      data: {
        citizenId,
        purpose,
        status,
        rejectionReason
      }
    });

    res.json({
      message: status === 'APPROVED' ? 'تمت الموافقة الآلية على الوثيقة بنجاح' : 'تم رفض الطلب بناءً على صحيفة السوابق الجنائية',
      request
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في النظام أثناء معالجة الطلب' });
  }
};

// Download Non-Conviction Certificate PDF
export const downloadClearancePDF = async (req, res) => {
  const { requestId } = req.params;
  const { nationalId } = req.user;

  try {
    const request = await prisma.criminalClearanceRequest.findFirst({
      where: { id: requestId, citizen: { nationalId } },
      include: { citizen: { include: { civilRecord: true } } }
    });

    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    if (request.status !== 'APPROVED') {
      return res.status(400).json({ error: 'هذا الطلب لم يتم الموافقة عليه أو تم رفضه' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=non_conviction_${nationalId}.pdf`);
    generateCriminalClearance(request, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء توليد وثيقة غير المحكوم' });
  }
};
