import { PrismaClient } from '@prisma/client';
import { generateTitleDeed } from '../services/pdfService.js';

const prisma = new PrismaClient();

// Get citizen properties
export const getMyProperties = async (req, res) => {
  const userId = req.user.userId;
  try {
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في جلب بيانات العقارات' });
  }
};

// Check tax status and request statement
export const requestStatement = async (req, res) => {
  const { propertyId } = req.body;
  const { nationalId } = req.user;

  try {
    // 1. Verify property exists and belongs to the user
    const property = await prisma.property.findFirst({
      where: { id: propertyId, owner: { nationalId } }
    });

    if (!property) {
      return res.status(404).json({ error: 'العقار غير موجود أو لا ينتمي لحسابك' });
    }

    // 2. Check for unpaid PROPERTY_TAX records for this user
    const unpaidPropertyTaxes = await prisma.financialRecord.findMany({
      where: {
        nationalId,
        type: 'PROPERTY_TAX',
        isPaid: false
      }
    });

    if (unpaidPropertyTaxes.length > 0) {
      return res.status(400).json({
        error: 'لا يمكن استخراج السند. يوجد رسوم ريع عقاري أو ضرائب عقارية غير مدفوعة متعلقة بسجلك.',
        details: unpaidPropertyTaxes
      });
    }

    res.json({ success: true, message: 'العقار سليم مالياً، جاهز للتحميل' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب' });
  }
};

// Download Title Deed Statement PDF
export const downloadTitleDeed = async (req, res) => {
  const { propertyId } = req.params;
  const { nationalId } = req.user;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, owner: { nationalId } },
      include: { owner: true }
    });

    if (!property) {
      return res.status(404).json({ error: 'العقار غير موجود' });
    }

    // Double check property tax for safety
    const unpaidPropertyTaxes = await prisma.financialRecord.findMany({
      where: { nationalId, type: 'PROPERTY_TAX', isPaid: false }
    });

    if (unpaidPropertyTaxes.length > 0) {
      return res.status(400).json({ error: 'يجب سداد الضرائب العقارية أولاً قبل تحميل الوثيقة' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=title_deed_${property.parcelNumber.replace('/', '_')}.pdf`);
    generateTitleDeed(property, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في توليد المستند' });
  }
};
