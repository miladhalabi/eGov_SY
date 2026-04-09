import { PrismaClient } from '@prisma/client';
import { generateIndividualRecord } from '../services/pdfService.js';
import { getIO } from '../services/socket.js';

const prisma = new PrismaClient();

export const getIndividualRecord = async (req, res) => {
  const { nationalId } = req.user; // From JWT middleware

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
        citizen: await prisma.user.findUnique({ 
          where: { id: citizenId }, 
          select: { fullName: true, nationalId: true } 
        })
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
    return res.status(403).json({ error: 'غير مسموح لك بالوصول لهذه البيانات' });
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
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// 3. Employee approves a birth registration
export const approveBirth = async (req, res) => {
  const { registrationId } = req.body;
  const employeeId = req.user.userId;

  if (req.user.role !== 'EMPLOYEE') {
    return res.status(403).json({ error: 'غير مسموح لك بالوصول لهذه العملية' });
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

    // Notify the citizen (DB)
    const notification = await prisma.notification.create({
      data: {
        userId: registration.citizenRequest.citizenId,
        title: 'تمت الموافقة على طلبك',
        message: `تمت الموافقة على طلب تسجيل الولادة للمولود: ${registration.childName}`
      }
    });

    // Real-time: Notify the citizen
    const io = getIO();
    io.to(`user_${registration.citizenRequest.citizenId}`).emit('new_notification', notification);

    res.json({ message: 'تمت الموافقة على الطلب بنجاح وتحديث السجلات' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب' });
  }
};
