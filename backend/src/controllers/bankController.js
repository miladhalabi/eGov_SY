import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const getBankData = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { bankPin: true, bankBalance: true, nationalId: true }
    });
    
    res.json({ 
      hasPin: !!user.bankPin, 
      balance: user.bankBalance,
      nationalId: user.nationalId
    });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب بيانات البنك' });
  }
};

export const setupBankPin = async (req, res) => {
  const { pin } = req.body;
  if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'يجب أن يتكون الرمز من 6 أرقام' });

  try {
    const hashedPin = await bcrypt.hash(pin, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { bankPin: hashedPin }
    });
    res.json({ message: 'تم إعداد رمز الأمان البنكي بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في إعداد الرمز' });
  }
};

export const verifyBankPin = async (req, res) => {
  const { pin } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user.bankPin) return res.status(400).json({ error: 'لم يتم إعداد رمز أمان بعد' });

    const isValid = await bcrypt.compare(pin, user.bankPin);
    if (!isValid) return res.status(401).json({ error: 'رمز الأمان غير صحيح' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في التحقق' });
  }
};

export const performBankTransfer = async (req, res) => {
  const { receiverNationalId, amount, pin } = req.body;
  const userId = req.user.userId;

  try {
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    
    // 1. Verify PIN
    const isPinValid = await bcrypt.compare(pin, sender.bankPin);
    if (!isPinValid) return res.status(401).json({ error: 'رمز الأمان البنكي غير صحيح' });

    // 2. Check Balance
    const numericAmount = parseFloat(amount);
    if (sender.bankBalance < numericAmount) return res.status(400).json({ error: 'الرصيد غير كافٍ' });

    // 3. Find Receiver (Allow 0000000000 for Government Payments)
    if (receiverNationalId !== '0000000000') {
      const receiver = await prisma.civilRecord.findUnique({ where: { nationalId: receiverNationalId } });
      if (!receiver) return res.status(404).json({ error: 'رقم المستلم غير موجود في السجل المدني' });
    }

    // 4. Perform Transaction (Atomic)
    const refNum = 'CBS-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { bankBalance: { decrement: numericAmount } }
      }),
      prisma.bankTransaction.create({
        data: {
          referenceNumber: refNum,
          senderNationalId: sender.nationalId,
          receiverNationalId: receiverNationalId,
          amount: parseFloat(amount)
        }
      })
    ]);

    res.json({ 
      message: 'تمت الحوالة بنجاح', 
      referenceNumber: refNum 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في تنفيذ الحوالة' });
  }
};

export const getBankHistory = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const history = await prisma.bankTransaction.findMany({
      where: { senderNationalId: user.nationalId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب السجل' });
  }
};
