import { PrismaClient } from '@prisma/client';
import { generateIndividualRecord } from '../services/pdfService.js';
import { getIO } from '../services/socket.js';

const prisma = new PrismaClient();

// Get Individual Record (PDF)
export const getIndividualRecord = async (req, res) => {
  const { nationalId: queryId } = req.query; // Employee can pass a query ID
  const { nationalId: userSelfId, role } = req.user; // From JWT

  // Logic: 
  // 1. If Employee: can query any nationalId via query param.
  // 2. If Citizen: can only query their own ID.
  const targetId = (role === 'EMPLOYEE' && queryId) ? queryId : userSelfId;

  try {
    // ALWAYS pull from CivilRecord (The Master Registry)
    const record = await prisma.civilRecord.findUnique({
      where: { nationalId: targetId }
    });

    if (!record) {
      return res.status(404).json({ error: 'لم يتم العثور على سجل مدني لهذا الرقم الوطني في القاعدة المركزية' });
    }

    const data = {
      nationalId: record.nationalId,
      fullName: record.fullName, // Pull from registry name
      fatherName: record.fatherName,
      motherName: record.motherName,
      birthDate: record.birthDate,
      birthPlace: record.birthPlace,
      maritalStatus: record.maritalStatus,
      gender: record.gender
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=record_${targetId}.pdf`);

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
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Get Spouses for Birth Registration
export const getActiveSpouses = async (req, res) => {
  const { nationalId } = req.user;

  try {
    const records = await prisma.marriageRecord.findMany({
      where: {
        OR: [{ husbandId: nationalId }, { wifeId: nationalId }],
        isActive: true
      }
    });

    // Map to get the partner's info
    const spouses = await Promise.all(records.map(async (m) => {
      const partnerId = m.husbandId === nationalId ? m.wifeId : m.husbandId;
      const partnerInfo = await prisma.civilRecord.findUnique({ 
        where: { nationalId: partnerId },
        select: { fullName: true, nationalId: true }
      });
      return partnerInfo;
    }));

    res.json(spouses);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب بيانات الأزواج' });
  }
};

// 1. Citizen submits birth registration
export const registerBirth = async (req, res) => {
  const { childName, childGender, spouseNationalId } = req.body;
  const citizenId = req.user.userId;
  const hospitalDoc = req.file ? req.file.path : null;

  if (!hospitalDoc) {
    return res.status(400).json({ error: 'يجب رفع وثيقة المستشفى' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: citizenId } });
    
    // Check if valid spouse
    const marriage = await prisma.marriageRecord.findFirst({
      where: {
        OR: [
          { husbandId: user.nationalId, wifeId: spouseNationalId },
          { husbandId: spouseNationalId, wifeId: user.nationalId }
        ],
        isActive: true
      }
    });

    if (!marriage) {
      return res.status(403).json({ error: 'لا يوجد عقد زواج مسجل مع الطرف المختار' });
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
  if (req.user.role !== 'EMPLOYEE') return res.status(403).json({ error: 'غير مسموح' });
  try {
    const pending = await prisma.birthRegistration.findMany({
      where: { status: 'PENDING' },
      include: {
        citizenRequest: {
          include: {
            citizen: { select: { fullName: true, nationalId: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pending);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

// 3. Employee approves a birth registration
export const approveBirth = async (req, res) => {
  const { registrationId } = req.body;
  const employeeId = req.user.userId;

  try {
    const registration = await prisma.birthRegistration.findUnique({
      where: { id: registrationId },
      include: { citizenRequest: { include: { citizen: true } } }
    });

    // --- CREATE NEW CIVIL RECORD FOR THE CHILD ---
    // Generate a random unique 10-digit national ID for the child
    const childId = Math.floor(Math.random() * 9000000000) + 1000000000;
    
    // Get parents names
    const father = registration.citizenRequest.citizen;
    // We would normally look up the spouse from the marriage in the request, 
    // but for simplicity in this demo we'll use the record data.

    await prisma.civilRecord.create({
      data: {
        nationalId: childId.toString(),
        fullName: registration.childName,
        fatherName: father.fullName, // Simplified
        motherName: 'فاطمة (مثال)', // Ideally from spouseNationalId stored in request
        birthDate: new Date(),
        birthPlace: 'دمشق',
        gender: registration.childGender,
        maritalStatus: 'عازب'
      }
    });

    await prisma.birthRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'APPROVED',
        approvedBy: employeeId
      }
    });

    // Notify the citizen
    const notification = await prisma.notification.create({
      data: {
        userId: registration.citizenRequest.citizenId,
        title: 'تم تسجيل الولادة',
        message: `تمت الموافقة على تسجيل المولود ${registration.childName}. الرقم الوطني للمولود هو: ${childId}`
      }
    });

    const io = getIO();
    io.to(`user_${registration.citizenRequest.citizenId}`).emit('new_notification', notification);

    res.json({ message: `تم تثبيت الولادة بنجاح. الرقم الوطني للمولود: ${childId}` });
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

    if (!initiator || !initiator.civilRecord) {
      return res.status(401).json({ error: 'لم يتم العثور على بيانات المواطن. يرجى تسجيل الدخول مجدداً' });
    }

    const partner = await prisma.civilRecord.findUnique({
      where: { nationalId: partnerNationalId }
    });

    if (!partner) return res.status(404).json({ error: 'الرقم الوطني للطرف الآخر غير موجود في السجلات' });

    const husband = initiator.civilRecord.gender === 'MALE' ? initiator.civilRecord : partner;
    const wife = initiator.civilRecord.gender === 'FEMALE' ? initiator.civilRecord : partner;

    if (husband.gender !== 'MALE' || wife.gender !== 'FEMALE') {
      return res.status(400).json({ error: 'يجب أن يكون عقد الزواج بين ذكر وأنثى حسب السجلات الرسمية' });
    }

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

    const io = getIO();
    io.to('employee_room').emit('new_marriage_request', {
      ...request,
      initiator: { fullName: initiator.fullName, nationalId: initiator.nationalId }
    });

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
