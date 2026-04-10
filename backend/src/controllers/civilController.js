import { PrismaClient } from '@prisma/client';
import { generateIndividualRecord, generateFamilyRecord } from '../services/pdfService.js';
import { getIO } from '../services/socket.js';

const prisma = new PrismaClient();

// Individual Record
export const getIndividualRecord = async (req, res) => {
  const { nationalId: queryId } = req.query;
  const { nationalId: userSelfId, role } = req.user;
  const targetId = (role === 'EMPLOYEE' && queryId) ? queryId : userSelfId;

  try {
    const record = await prisma.civilRecord.findUnique({ where: { nationalId: targetId } });
    if (!record) return res.status(404).json({ error: 'السجل غير موجود' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=individual_${targetId}.pdf`);
    generateIndividualRecord(record, res);
  } catch (error) { res.status(500).json({ error: 'خطأ في النظام' }); }
};

// Family Record - Logic Improved
export const getFamilyRecord = async (req, res) => {
  const { nationalId: queryId } = req.query;
  const { nationalId: userSelfId, role } = req.user;
  const targetId = (role === 'EMPLOYEE' && queryId) ? queryId : userSelfId;

  try {
    const person = await prisma.civilRecord.findUnique({ where: { nationalId: targetId } });
    if (!person) return res.status(404).json({ error: 'السجل غير موجود' });

    let headNationalId = null;

    if (person.gender === 'MALE') {
      // If male, he is likely the head
      headNationalId = person.nationalId;
    } else {
      // If female, check if she is a wife
      const marriage = await prisma.marriageRecord.findFirst({
        where: { wifeId: person.nationalId, isActive: true }
      });
      if (marriage) {
        headNationalId = marriage.husbandId;
      } else if (person.fatherNationalId) {
        // If not married, check if she is a child
        headNationalId = person.fatherNationalId;
      } else {
        // Fallback to herself
        headNationalId = person.nationalId;
      }
    }

    const head = await prisma.civilRecord.findUnique({ where: { nationalId: headNationalId } });
    
    // Find all wives of the head
    const marriages = await prisma.marriageRecord.findMany({
      where: { husbandId: head.nationalId, isActive: true },
      include: { wife: true }
    });
    const wives = marriages.map(m => m.wife);

    // Find all children of the head
    const children = await prisma.civilRecord.findMany({
      where: { fatherNationalId: head.nationalId },
      orderBy: { birthDate: 'asc' }
    });

    const data = { head, wives, children };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=family_${targetId}.pdf`);
    generateFamilyRecord(data, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تجميع بيانات العائلة' });
  }
};

export const getActiveSpouses = async (req, res) => {
  const { nationalId } = req.user;
  try {
    const records = await prisma.marriageRecord.findMany({
      where: { OR: [{ husbandId: nationalId }, { wifeId: nationalId }], isActive: true }
    });
    const spouses = await Promise.all(records.map(async (m) => {
      const partnerId = m.husbandId === nationalId ? m.wifeId : m.husbandId;
      return await prisma.civilRecord.findUnique({ where: { nationalId: partnerId }, select: { fullName: true, nationalId: true } });
    }));
    res.json(spouses);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const registerBirth = async (req, res) => {
  const { childName, childGender, spouseNationalId } = req.body;
  const citizenId = req.user.userId;
  const hospitalDoc = req.file ? req.file.path : null;

  try {
    const user = await prisma.user.findUnique({ where: { id: citizenId } });
    const registration = await prisma.birthRegistration.create({
      data: { childName, childGender, spouseNationalId, hospitalDoc, status: 'PENDING', citizenRequest: { create: { citizenId } } }
    });

    const io = getIO();
    io.to('employee_room').emit('new_birth_request', { ...registration, citizenRequest: { citizen: { fullName: user.fullName, nationalId: user.nationalId } } });
    res.json({ message: 'تم إرسال الطلب بنجاح وهو قيد المراجعة' });
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const getPendingBirths = async (req, res) => {
  try {
    const pending = await prisma.birthRegistration.findMany({
      where: { status: 'PENDING' },
      include: { citizenRequest: { include: { citizen: { select: { fullName: true, nationalId: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pending);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const approveBirth = async (req, res) => {
  const { registrationId } = req.body;
  const employeeId = req.user.userId;

  try {
    const registration = await prisma.birthRegistration.findUnique({
      where: { id: registrationId },
      include: { citizenRequest: { include: { citizen: true } } }
    });

    const childId = Math.floor(Math.random() * 9000000000) + 1000000000;
    const parentA = await prisma.civilRecord.findUnique({ where: { nationalId: registration.citizenRequest.citizen.nationalId } });
    const parentB = await prisma.civilRecord.findUnique({ where: { nationalId: registration.spouseNationalId } });

    const father = parentA.gender === 'MALE' ? parentA : parentB;
    const mother = parentA.gender === 'FEMALE' ? parentA : parentB;

    await prisma.civilRecord.create({
      data: {
        nationalId: childId.toString(),
        fullName: registration.childName,
        fatherName: father.fullName,
        motherName: mother.fullName,
        fatherNationalId: father.nationalId,
        motherNationalId: mother.nationalId,
        birthDate: new Date(),
        birthPlace: father.birthPlace,
        gender: registration.childGender,
        maritalStatus: 'عازب',
        livingStatus: 'حي'
      }
    });

    await prisma.birthRegistration.update({ where: { id: registrationId }, data: { status: 'APPROVED', approvedBy: employeeId } });
    
    const notification = await prisma.notification.create({
      data: { userId: registration.citizenRequest.citizenId, title: 'تم تسجيل المولود', message: `الرقم الوطني للمولود: ${childId}` }
    });
    getIO().to(`user_${registration.citizenRequest.citizenId}`).emit('new_notification', notification);

    res.json({ message: `تم تثبيت الولادة بنجاح. الرقم الوطني للمولود: ${childId}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب' });
  }
};

export const rejectBirth = async (req, res) => {
  const { registrationId, reason } = req.body;
  try {
    const reg = await prisma.birthRegistration.update({ where: { id: registrationId }, data: { status: 'REJECTED', rejectionReason: reason }, include: { citizenRequest: true } });
    await prisma.notification.create({ data: { userId: reg.citizenRequest.citizenId, title: 'تم رفض طلب تسجيل الولادة', message: reason } });
    getIO().to(`user_${reg.citizenRequest.citizenId}`).emit('new_notification', { title: 'تحديث بخصوص طلبك' });
    res.json({ message: 'تم الرفض' });
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const registerMarriage = async (req, res) => {
  const { partnerNationalId, contractNumber } = req.body;
  const initiatorId = req.user.userId;
  const doc = req.file?.path;
  try {
    const initiator = await prisma.user.findUnique({ where: { id: initiatorId }, include: { civilRecord: true } });
    const partner = await prisma.civilRecord.findUnique({ where: { nationalId: partnerNationalId } });
    const request = await prisma.marriageRequest.create({ data: { initiatorId, partnerNationalId, contractNumber, documentPath: doc } });
    getIO().to('employee_room').emit('new_marriage_request', { ...request, initiator: { fullName: initiator.fullName, nationalId: initiator.nationalId } });
    res.json({ message: 'تم إرسال طلب تسجيل الزواج بنجاح' });
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const getPendingMarriages = async (req, res) => {
  try {
    const list = await prisma.marriageRequest.findMany({ where: { status: 'PENDING' }, include: { initiator: { select: { fullName: true, nationalId: true } } } });
    res.json(list);
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const approveMarriage = async (req, res) => {
  const { requestId } = req.body;
  try {
    const reqData = await prisma.marriageRequest.findUnique({ where: { id: requestId }, include: { initiator: { include: { civilRecord: true } } } });
    const partner = await prisma.civilRecord.findUnique({ where: { nationalId: reqData.partnerNationalId } });
    const hId = reqData.initiator.civilRecord.gender === 'MALE' ? reqData.initiator.nationalId : partner.nationalId;
    const wId = reqData.initiator.civilRecord.gender === 'FEMALE' ? reqData.initiator.nationalId : partner.nationalId;

    await prisma.marriageRecord.create({ data: { husbandId: hId, wifeId: wId, contractNumber: reqData.contractNumber } });
    await prisma.marriageRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } });
    await prisma.civilRecord.updateMany({ where: { nationalId: { in: [hId, wId] } }, data: { maritalStatus: 'متزوج' } });
    const notif = await prisma.notification.create({ data: { userId: reqData.initiatorId, title: 'تم توثيق الزواج', message: 'تمت الموافقة على طلب تسجيل الزواج بنجاح' } });
    getIO().to(`user_${reqData.initiatorId}`).emit('new_notification', notif);
    res.json({ message: 'تم التوثيق بنجاح' });
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};

export const rejectMarriage = async (req, res) => {
  const { requestId, reason } = req.body;
  try {
    const r = await prisma.marriageRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', rejectionReason: reason } });
    await prisma.notification.create({ data: { userId: r.initiatorId, title: 'تم رفض طلب الزواج', message: reason } });
    getIO().to(`user_${r.initiatorId}`).emit('new_notification', { title: 'تحديث بخصوص طلب الزواج' });
    res.json({ message: 'تم الرفض' });
  } catch (error) { res.status(500).json({ error: 'خطأ' }); }
};
