import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';
import RTLArabic from 'rtl-arabic';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fontPath = path.join(__dirname, '../assets/fonts/GESS.otf');

const prisma = new PrismaClient();

const writeArabic = (doc, text, x, y, options = {}) => {
  const processedText = new RTLArabic(text || '').toString();
  doc.font(fontPath).fontSize(options.size || 12).fillColor(options.color || 'black').text(processedText, x, y, { 
    width: options.width, align: options.align || 'right', features: ['rtla'] 
  });
};

export const getTaxStatus = async (req, res) => {
  const { nationalId } = req.user;
  try {
    const records = await prisma.financialRecord.findMany({
      where: { nationalId }
    });
    const totalDebt = records.reduce((acc, curr) => !curr.isPaid ? acc + curr.amount : acc, 0);
    res.json({ records, totalDebt });
  } catch (e) { res.status(500).json({ error: 'خطأ' }); }
};

export const payRecord = async (req, res) => {
  const { recordId, bankReference } = req.body;
  const { nationalId } = req.user;

  try {
    const record = await prisma.financialRecord.findFirst({
      where: { id: recordId, nationalId }
    });

    if (!record) return res.status(404).json({ error: 'السجل غير موجود' });
    if (record.isPaid) return res.status(400).json({ error: 'هذا السجل مسدد مسبقاً' });

    // 1. Verify Bank Transaction
    const bankTx = await prisma.bankTransaction.findUnique({
      where: { referenceNumber: bankReference }
    });

    if (!bankTx) {
      return res.status(400).json({ error: 'رقم الإشعار البنكي غير صحيح' });
    }

    // 2. Validate payment details
    // Must be from current user to Government Treasury (0000000000)
    if (bankTx.senderNationalId !== nationalId || 
        bankTx.receiverNationalId !== '0000000000' || 
        bankTx.amount < record.amount) {
      return res.status(400).json({ error: 'بيانات الحوالة لا تتطابق مع التكليف المالي (يجب أن يكون المستلم هو خزينة الدولة والمبلغ مطابق)' });
    }

    // 3. Mark as paid
    await prisma.financialRecord.update({
      where: { id: recordId },
      data: { isPaid: true }
    });

    res.json({ message: 'تم تسديد الذمة المالية بنجاح وتحديث السجل' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطأ في معالجة الدفع البنكي' });
  }
};

export const downloadClearance = async (req, res) => {
  const { nationalId } = req.user;
  try {
    const records = await prisma.financialRecord.findMany({ where: { nationalId } });
    const unpaid = records.filter(r => !r.isPaid);
    const totalDebt = unpaid.reduce((acc, curr) => acc + curr.amount, 0);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    
    if (totalDebt === 0) {
      res.setHeader('Content-Disposition', `attachment; filename=clearance_${nationalId}.pdf`);
      doc.pipe(res);
      doc.rect(20, 20, 555, 802).lineWidth(4).stroke('#007A33'); // Green border for success
      writeArabic(doc, 'الجمهورية العربية السورية', 50, 40, { align: 'center', width: 500 });
      writeArabic(doc, 'وزارة المالية - مديرية الضرائب', 50, 65, { align: 'center', width: 500 });
      writeArabic(doc, 'وثيقة براءة ذمة مالية', 50, 150, { size: 30, color: '#007A33', align: 'center', width: 500 });
      writeArabic(doc, `يشهد السجل المالي بأن المواطن الحامل للرقم الوطني (${nationalId}) ليس لديه أي ذمم مالية مستحقة الأداء تجاه الدولة حتى تاريخه.`, 100, 300, { size: 14, align: 'right', width: 400 });
      doc.rect(100, 500, 150, 150).stroke('#007A33');
      writeArabic(doc, 'خاتم المديرية الرقمي', 100, 660, { size: 10, align: 'center', width: 150, color: '#007A33' });
    } else {
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${nationalId}.pdf`);
      doc.pipe(res);
      doc.rect(20, 20, 555, 802).lineWidth(4).stroke('#CE1126'); // Red border for debt
      writeArabic(doc, 'كشف بالذمم المالية المستحقة', 50, 100, { size: 24, color: '#CE1126', align: 'center', width: 500 });
      
      let y = 200;
      unpaid.forEach(r => {
         writeArabic(doc, `${r.description}: ${r.amount} ل.س`, 100, y, { size: 14 });
         y += 40;
      });

      doc.moveTo(100, y).lineTo(500, y).stroke('#CE1126');
      writeArabic(doc, `الإجمالي المطلوب دفعه: ${totalDebt} ل.س`, 100, y + 20, { size: 18, color: '#CE1126' });
      writeArabic(doc, 'يرجى مراجعة أقرب كوة دفع لتسديد المبالغ أعلاه لتتمكن من الحصول على براءة الذمة.', 50, 700, { size: 10, align: 'center', width: 500 });
    }
    doc.end();
  } catch (e) { res.status(500).json({ error: 'خطأ' }); }
};
