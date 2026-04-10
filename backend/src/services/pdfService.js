import PDFDocument from 'pdfkit';
import path from 'path';
import RTLArabic from 'rtl-arabic';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fontPath = path.join(__dirname, '../assets/fonts/GESS.otf');

// Helper to handle Arabic using rtl-arabic and GESS font
const writeArabic = (doc, text, x, y, options = {}) => {
  const processedText = new RTLArabic(text || '').toString();

  doc.font(fontPath)
     .fontSize(options.size || 12)
     .fillColor(options.color || 'black')
     .text(processedText, x, y, { 
       width: options.width, 
       align: options.align || 'right',
       features: ['rtla'] 
     });
};

export const generateIndividualRecord = (data, outStream) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  doc.pipe(outStream);

  // Border
  doc.rect(20, 20, 555, 802).lineWidth(2).stroke('#b9a779');

  // Header
  writeArabic(doc, 'الجمهورية العربية السورية', 50, 40, { size: 16, align: 'center', width: 500 });
  writeArabic(doc, 'وزارة الداخلية - الشؤون المدنية', 50, 65, { size: 14, align: 'center', width: 500 });
  writeArabic(doc, 'بيان قيد فردي', 50, 100, { size: 22, align: 'center', color: '#002623', width: 500 });

  const rows = [
    { label: 'الرقم الوطني:', value: data.nationalId },
    { label: 'الاسم الكامل:', value: data.fullName },
    { label: 'اسم الأب:', value: data.fatherName },
    { label: 'اسم الأم:', value: data.motherName },
    { label: 'محل وتاريخ الولادة:', value: `${data.birthPlace} - ${new Date(data.birthDate).toLocaleDateString('ar-SY')}` },
    { label: 'الجنس:', value: data.gender === 'MALE' ? 'ذكر' : 'أنثى' },
    { label: 'الحالة العائلية:', value: data.maritalStatus },
    { label: 'الوضع الحالي:', value: data.livingStatus },
  ];

  rows.forEach((row, i) => {
    const y = 180 + (i * 35);
    doc.moveTo(50, y + 25).lineTo(545, y + 25).lineWidth(0.5).stroke('#edebe0');
    writeArabic(doc, row.label, 350, y, { size: 14, color: '#b9a779' });
    writeArabic(doc, row.value, 50, y, { size: 14, width: 280, align: 'right', color: '#002623' });
  });

  doc.end();
};

export const generateFamilyRecord = (data, outStream) => {
  const { head, wives, children } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(outStream);

  // Global Border
  doc.rect(20, 20, 555, 802).lineWidth(2).stroke('#b9a779');

  // Header
  writeArabic(doc, 'الجمهورية العربية السورية', 50, 40, { size: 14, align: 'center', width: 500 });
  writeArabic(doc, 'بيان قيد عائلي (خلاصة السجل)', 50, 70, { size: 20, align: 'center', color: '#002623', width: 500 });

  // 1. Head of Family Section
  doc.rect(50, 110, 495, 80).fill('#002623');
  writeArabic(doc, 'بيانات رب الأسرة', 50, 115, { size: 10, color: '#b9a779', align: 'center', width: 495 });
  writeArabic(doc, head.fullName, 50, 135, { size: 18, color: 'white', align: 'center', width: 495 });
  writeArabic(doc, `الرقم الوطني: ${head.nationalId} | محل الولادة: ${head.birthPlace}`, 50, 165, { size: 10, color: '#edebe0', align: 'center', width: 495 });

  // 2. Wives Section
  let currentY = 210;
  writeArabic(doc, 'الزوجات:', 50, currentY, { size: 14, color: '#b9a779' });
  currentY += 25;

  wives.forEach((wife, i) => {
    doc.rect(50, currentY, 495, 30).stroke('#edebe0');
    writeArabic(doc, `${i+1}. ${wife.fullName} (${wife.nationalId})`, 60, currentY + 8, { size: 12, width: 475 });
    currentY += 35;
  });

  if (wives.length === 0) {
    writeArabic(doc, 'لا يوجد زوجات مسجلات', 50, currentY, { size: 10, color: 'gray' });
    currentY += 25;
  }

  // 3. Children Section
  currentY += 20;
  writeArabic(doc, 'الأولاد:', 50, currentY, { size: 14, color: '#b9a779' });
  currentY += 30;

  // Table Header for children
  doc.rect(50, currentY, 495, 25).fill('#edebe0');
  writeArabic(doc, 'الاسم', 400, currentY + 5, { size: 10, width: 100, color: '#002623' });
  writeArabic(doc, 'الرقم الوطني', 250, currentY + 5, { size: 10, width: 100, color: '#002623' });
  writeArabic(doc, 'الجنس', 150, currentY + 5, { size: 10, width: 80, color: '#002623' });
  writeArabic(doc, 'تاريخ الولادة', 50, currentY + 5, { size: 10, width: 100, color: '#002623' });
  currentY += 30;

  children.forEach(child => {
    writeArabic(doc, child.fullName, 400, currentY, { size: 11, width: 100 });
    writeArabic(doc, child.nationalId, 250, currentY, { size: 11, width: 100 });
    writeArabic(doc, child.gender === 'MALE' ? 'ذكر' : 'أنثى', 150, currentY, { size: 11, width: 80 });
    writeArabic(doc, new Date(child.birthDate).toLocaleDateString('ar-SY'), 50, currentY, { size: 11, width: 100 });
    doc.moveTo(50, currentY + 18).lineTo(545, currentY + 18).lineWidth(0.5).stroke('#edebe0');
    currentY += 25;
  });

  // Footer
  writeArabic(doc, 'يعتبر هذا المستند خلاصة رسمية للسجل المدني للعائلة.', 50, 770, { size: 8, align: 'center', width: 500, color: 'gray' });

  doc.end();
};
