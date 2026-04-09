import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const register = async (req, res) => {
  const { nationalId, fullName, fatherName, motherName, password } = req.body;

  try {
    // 1. Check if user already has an account
    const existingUser = await prisma.user.findUnique({
      where: { nationalId }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'هذا الرقم الوطني مسجل مسبقاً في المنصة' });
    }

    // 2. Identity Verification against Master Registry (CivilRecord)
    const record = await prisma.civilRecord.findUnique({
      where: { nationalId }
    });

    if (!record) {
      return res.status(404).json({ error: 'الرقم الوطني غير موجود في السجلات الحكومية' });
    }

    // Strict validation: check all details match
    if (
      record.fullName !== fullName ||
      record.fatherName !== fatherName ||
      record.motherName !== motherName
    ) {
      return res.status(400).json({ error: 'البيانات المدخلة لا تطابق السجلات الرسمية' });
    }

    // 3. Create the portal account
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        nationalId,
        fullName,
        password: passwordHash,
        role: 'CITIZEN'
      }
    });

    res.json({ message: 'تم إنشاء الحساب وتفعيله بنجاح', user: { id: user.id, nationalId, fullName: user.fullName } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

export const login = async (req, res) => {
  const { nationalId, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { nationalId },
    });

    if (!user) {
      return res.status(401).json({ error: 'الرقم الوطني أو كلمة المرور غير صحيحة' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'الرقم الوطني أو كلمة المرور غير صحيحة' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, nationalId: user.nationalId },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nationalId: user.nationalId,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};
