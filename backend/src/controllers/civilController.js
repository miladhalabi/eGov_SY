import { PrismaClient } from '@prisma/client';
import { generateIndividualRecord } from '../services/pdfService.js';
import { getIO } from '../services/socket.js';

const prisma = new PrismaClient();

export const getIndividualRecord = async (req, res) => {
  const { nationalId } = req.user;

  try {
    const record = await prisma.civilRecord.findUnique({
      where: { nationalId },
      include: { user: true }
    });

    if (!record) {
      return res.status(404).json({ error: 'لم يتم العثور على سجل مدني لهذا الرقم الوطني' });
    }

    const data = {
      nationalId: record.nationalId,
      fullName: record.user.fullName,
      fatherName: record.fatherName,
      motherName: record.motherName,
      birthDate: record.birthDate,
      birthPlace: record.birthPlace,
      maritalStatus: record.maritalStatus,
      gender: record.gender
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=record_${nationalId}.pdf`);

    try {
      generateIndividualRecord(data, res);
    } catch (pdfError) {
      console.error('PDF Generation Error:', pdfError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'حدث خطأ أثناء توليد ملف الـ PDF' });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الوثيقة' });
  }
};

// 1. Citizen submits birth registration
export const registerBirth = async (req, res) => {
  const { childName, childGender } = req.body;
  const citizenId = req.user.userId;
  const hospitalDoc = req.file ? req.file.path : null;

  if (!hospitalDoc) {
    return res.status(400).json({ error: 'يجب رفع وثيقة المستشفى' });
  }

  try {
    // SECURITY CHECK: User must be married to register a child
    const user = await prisma.user.findUnique({ where: { id: citizenId } });
    const marriage = await prisma.marriageRecord.findFirst({
      where: {
        OR: [{ husbandId: user.nationalId }, { wifeId: user.nationalId }],
        isActive: true
      }
    });

    if (!marriage) {
      return res.status(403).json({ error: 'لا يمكن تسجيل ولادة بدون عقد زواج مسجل في النظام' });
    }

    const registration = await prisma.birthRegistration.create({
      data: {
        childName,
        childGender,
        hospitalDoc,
        status: 'PENDING',
        citizenRequest: {
          create: {
            citizenId: citizenId
          }
        }
      }
    });

    // Real-time: Notify employees
    const io = getIO();
    io.to('employee_room').emit('new_birth_request', {
      ...registration,
      citizenRequest: {
        citizen: { fullName: user.fullName, nationalId: user.nationalId }
      }
    });

    res.json({ message: 'تم إرسال الطلب بنجاح وهو قيد المراجعة', registration });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الطلب' });
  }
};

// 2. Employee gets all pending births
export const getPendingBirths = async (req, res) => {
  if (req.user.role !== 'EMPLOYEE') {
    return res.status(403).json({ error: 'غير مسموح' });
  }

  try {
    const pending = await prisma.birthRegistration.findMany({
      where: { status: 'PENDING' },
      include: {
        citizenRequest: {
          include: {
            citizen: {
              select: { fullName: true, nationalId: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pending);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// 3. Employee approves a birth registration
export const approveBirth = async (req, res) => {
  const { registrationId } = req.body;
  const employeeId = req.user.userId;

  if (req.user.role !== 'EMPLOYEE') {
    return res.status(403).json({ error: 'غير مسموح' });
  }

  try {
    const registration = await prisma.birthRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'APPROVED',
        approvedBy: employeeId
      },
      include: {
        citizenRequest: true
      }
    });

    // Notify the citizen
    const notification = await prisma.notification.create({
      data: {
        userId: registration.citizenRequest.citizenId,
        title: 'تمت الموافقة على طلبك',
        message: `تمت الموافقة على طلب تسجيل الولادة للمولود: ${registration.childName}`
      }
    });

    const io = getIO();
    io.to(`user_${registration.citizenRequest.citizenId}`).emit('new_notification', notification);

    res.json({ message: 'تمت الموافقة على الطلب بنجاح وتحديث السجلات' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};

// --- Marriage Logic ---

export const registerMarriage = async (req, res) => {
  const { partnerNationalId, contractNumber } = req.body;
  const initiatorId = req.user.userId;
  const documentPath = req.file ? req.file.path : null;

  if (!documentPath) return res.status(400).json({ error: 'يجب رفع صورة عقد الزواج' });

  try {
    const initiator = await prisma.user.findUnique({
      where: { id: initiatorId },
      include: { civilRecord: true }
    });

    const partner = await prisma.civilRecord.findUnique({
      where: { nationalId: partnerNationalId }
    });

    if (!partner) return res.status(404).json({ error: 'الرقم الوطني للطرف الآخر غير موجود في السجلات' });

    const husband = initiator.civilRecord.gender === 'MALE' ? initiator.civilRecord : partner;
    const wife = initiator.civilRecord.gender === 'FEMALE' ? initiator.civilRecord : partner;

    if (husband.gender !== 'MALE' || wife.gender !== 'FEMALE') {
      return res.status(400).json({ error: 'يجب أن يكون عقد الزواج بين ذكر وأنثى حسب السجلات الرسمية' });
    }

    // Constraints
    const activeMarriageForWife = await prisma.marriageRecord.findFirst({
      where: { wifeId: wife.nationalId, isActive: true }
    });
    if (activeMarriageForWife) return res.status(400).json({ error: 'الطرف الآخر (الزوجة) مرتبطة بعقد زواج قائم مسبقاً' });

    const activeWivesCount = await prisma.marriageRecord.count({
      where: { husbandId: husband.nationalId, isActive: true }
    });
    if (activeWivesCount >= 4) return res.status(400).json({ error: 'لا يمكن تسجيل أكثر من 4 زوجات للزوج' });

    const request = await prisma.marriageRequest.create({
      data: {
        initiatorId,
        partnerNationalId,
        contractNumber,
        documentPath,
        status: 'PENDING'
      }
    });

    // Notify Employees
    const io = getIO();
    io.to('employee_room').emit('new_marriage_request', request);

    res.json({ message: 'تم إرسال طلب تسجيل الزواج بنجاح للمراجعة', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في النظام' });
  }
};

export const getPendingMarriages = async (req, res) => {
  if (req.user.role !== 'EMPLOYEE') return res.status(403).json({ error: 'غير مسموح' });
  try {
    const list = await prisma.marriageRequest.findMany({
      where: { status: 'PENDING' },
      include: { initiator: { select: { fullName: true, nationalId: true } } }
    });
    res.json(list);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const approveMarriage = async (req, res) => {
  const { requestId } = req.body;
  const employeeId = req.user.userId;

  try {
    const request = await prisma.marriageRequest.findUnique({ 
        where: { id: requestId },
        include: { initiator: { include: { civilRecord: true } } }
    });

    const partner = await prisma.civilRecord.findUnique({ where: { nationalId: request.partnerNationalId } });
    
    const husbandId = request.initiator.civilRecord.gender === 'MALE' ? request.initiator.nationalId : partner.nationalId;
    const wifeId = request.initiator.civilRecord.gender === 'FEMALE' ? request.initiator.nationalId : partner.nationalId;

    await prisma.marriageRecord.create({
      data: {
        husbandId,
        wifeId,
        contractNumber: request.contractNumber
      }
    });

    await prisma.marriageRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', approvedBy: employeeId }
    });

    await prisma.civilRecord.updateMany({
      where: { nationalId: { in: [husbandId, wifeId] } },
      data: { maritalStatus: 'متزوج' }
    });

    const notification = await prisma.notification.create({
      data: {
        userId: request.initiatorId,
        title: 'تم توثيق الزواج',
        message: 'تمت الموافقة على طلب تسجيل الزواج بنجاح.'
      }
    });

    const io = getIO();
    io.to(`user_${request.initiatorId}`).emit('new_notification', notification);

    res.json({ message: 'تم تثبيت واقعة الزواج بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ' });
  }
};
