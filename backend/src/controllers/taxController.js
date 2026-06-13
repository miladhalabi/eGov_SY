import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';
import RTLArabic from 'rtl-arabic';
import path from 'path';
import { drawQRCode } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fontPath = path.join(__dirname, '../assets/fonts/GESS.otf');

const prisma = new PrismaClient();

const writeArabic = (doc, text, x, y, options = {}) => {
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  let processedText = text || '';

  if (hasArabic) {
    processedText = new RTLArabic(text).toString();
    // Swap parenthesis characters to fix double-reversal layout bug in PDFKit RTLA
    processedText = processedText
      .replace(/\(/g, '___OPEN___')
      .replace(/\)/g, '(')
      .replace(/___OPEN___/g, ')');

    doc.font(fontPath).fontSize(options.size || 12).fillColor(options.color || 'black').text(processedText, x, y, { 
      width: options.width, align: options.align || 'right', features: ['rtla'] 
    });
  } else {
    // Pure English/Numeric text: draw LTR using built-in Helvetica to prevent layout/inversion bugs!
    doc.font('Helvetica').fontSize(options.size || 12).fillColor(options.color || 'black').text(processedText, x, y, { 
      width: options.width, align: options.align || 'right'
    });
  }
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

    // If this is a mortgage payoff loan, release the mortgage on the user's properties
    if (record.type === 'MORTGAGE_LOAN') {
      await prisma.property.updateMany({
        where: { owner: { nationalId }, isMortgaged: true },
        data: { isMortgaged: false }
      });
    }

    res.json({ message: 'تم تسديد الذمة المالية بنجاح وتحديث السجل' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطأ في معالجة الدفع البنكي' });
  }
};

export const downloadClearance = async (req, res) => {
  const { nationalId } = req.user;
  try {
    const user = await prisma.user.findFirst({
      where: { nationalId },
      include: { civilRecord: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود في السجلات' });
    }

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
      writeArabic(doc, 'وثيقة براءة ذمة مالية', 50, 120, { size: 24, color: '#007A33', align: 'center', width: 500 });
      
      const rows = [
        { label: 'اسم المكلف:', value: user.fullName },
        { label: 'اسم الأب:', value: user.civilRecord?.fatherName || '' },
        { label: 'اسم الأم:', value: user.civilRecord?.motherName || '' },
        { label: 'الرقم الوطني للمكلف:', value: nationalId },
        { label: 'حالة براءة الذمة:', value: 'مستوفاة - لا يوجد أي ذمم مالية مستحقة' }
      ];

      rows.forEach((row, i) => {
        const y = 180 + (i * 35);
        doc.moveTo(80, y + 25).lineTo(515, y + 25).lineWidth(0.5).stroke('#edebe0');
        writeArabic(doc, row.label, 320, y, { size: 12, color: '#007A33' });
        writeArabic(doc, row.value, 80, y, { size: 12, width: 230, align: 'right', color: '#002623' });
      });

      writeArabic(doc, 'تشهد مديرية الضرائب العامة بأن المكلف المذكور أعلاه قد سدد كافة التكاليف والالتزامات المترتبة عليه تجاه الدولة حتى تاريخه، وبناءً عليه مُنح هذه الوثيقة للاستخدام الرسمي.', 80, 375, { size: 12, align: 'right', width: 435 });

      doc.rect(100, 520, 150, 150).stroke('#007A33');
      drawQRCode(doc, 100, 520, 150);
      writeArabic(doc, 'خاتم المديرية الرقمي', 100, 680, { size: 10, align: 'center', width: 150, color: '#007A33' });
    } else {
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${nationalId}.pdf`);
      doc.pipe(res);
      doc.rect(20, 20, 555, 802).lineWidth(4).stroke('#CE1126'); // Red border for debt
      writeArabic(doc, 'كشف بالذمم المالية المستحقة', 50, 100, { size: 24, color: '#CE1126', align: 'center', width: 500 });
      
      const rows = [
        { label: 'اسم المكلف:', value: user.fullName },
        { label: 'الرقم الوطني للمكلف:', value: nationalId }
      ];

      rows.forEach((row, i) => {
        const y = 150 + (i * 30);
        doc.moveTo(80, y + 22).lineTo(515, y + 22).lineWidth(0.5).stroke('#edebe0');
        writeArabic(doc, row.label, 320, y, { size: 12, color: '#CE1126' });
        writeArabic(doc, row.value, 80, y, { size: 12, width: 230, align: 'right', color: '#002623' });
      });

      writeArabic(doc, 'تفاصيل المبالغ والذمم غير المسددة:', 80, 220, { size: 12, color: '#CE1126' });

      let y = 250;
      unpaid.forEach(r => {
         doc.moveTo(80, y + 25).lineTo(515, y + 25).lineWidth(0.5).stroke('#edebe0');
         writeArabic(doc, r.description, 250, y, { size: 12, color: '#002623' });
         writeArabic(doc, String(r.amount), 80, y, { size: 12, width: 160, align: 'right', color: '#CE1126' });
         y += 35;
      });

      doc.moveTo(80, y).lineTo(515, y).lineWidth(1.5).stroke('#CE1126');
      writeArabic(doc, 'الإجمالي المطلوب دفعه (ل.س):', 250, y + 15, { size: 14, color: '#CE1126' });
      writeArabic(doc, String(totalDebt), 80, y + 15, { size: 14, width: 160, align: 'right', color: '#CE1126' });
      
      writeArabic(doc, 'يرجى مراجعة أقرب كوة دفع لتسديد المبالغ أعلاه لتتمكن من الحصول على براءة الذمة.', 50, 720, { size: 10, align: 'center', width: 500 });
    }
    doc.end();
  } catch (e) { res.status(500).json({ error: 'خطأ' }); }
};
