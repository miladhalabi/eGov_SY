import PDFDocument from 'pdfkit';
import path from 'path';
import RTLArabic from 'rtl-arabic';

export const generateIndividualRecord = (data, outStream) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const fontPath = path.resolve('src/assets/fonts/Amiri-Regular.ttf');

  // Register font
  doc.font(fontPath);
  doc.pipe(outStream);

  // Helper to handle Arabic using rtl-arabic
  const writeArabic = (text, x, y, options = {}) => {
    // rtl-arabic handles BOTH reshaping and bidi ordering internally
    const processedText = new RTLArabic(text || '').toString();
    
    doc.fontSize(options.size || 12)
       .fillColor(options.color || 'black')
       .text(processedText, x, y, { 
         width: options.width, 
         align: options.align || 'right',
         features: ['rtla'] // Enable OpenType right-to-left features in pdfkit
       });
  };

  // Border
  doc.rect(20, 20, 555, 802).lineWidth(2).stroke('#b9a779');
  doc.rect(25, 25, 545, 792).lineWidth(1).stroke('#002623');

  // Header
  writeArabic('الجمهورية العربية السورية', 50, 40, { size: 16, align: 'center', width: 500 });
  writeArabic('وزارة الداخلية - الشؤون المدنية', 50, 65, { size: 14, align: 'center', width: 500 });
  writeArabic('بيان قيد فردي', 50, 100, { size: 22, align: 'center', color: '#002623', width: 500 });

  doc.moveDown(4);

  // Content Table
  const startY = 160;

  const rows = [
    { label: 'الرقم الوطني:', value: data.nationalId },
    { label: 'الاسم الكامل:', value: data.fullName },
    { label: 'اسم الأب:', value: data.fatherName },
    { label: 'اسم الأم:', value: data.motherName },
    { label: 'محل وتاريخ الولادة:', value: `${data.birthPlace} - ${new Date(data.birthDate).toLocaleDateString('ar-SY')}` },
    { label: 'الجنس:', value: data.gender },
    { label: 'الحالة العائلية:', value: data.maritalStatus },
  ];

  rows.forEach((row, i) => {
    const y = startY + (i * 35);
    doc.moveTo(50, y + 25).lineTo(545, y + 25).lineWidth(0.5).stroke('#edebe0');
    
    // The label is on the right side
    writeArabic(row.label, 350, y, { size: 14, color: '#b9a779' });
    
    // The value is to the left of the label
    writeArabic(row.value, 50, y, { size: 14, width: 280, align: 'right', color: '#002623' });
  });

  // Footer / Verification
  writeArabic('هذا المستند صادر إلكترونياً ويعتبر رسمياً من بوابة الحكومة الإلكترونية.', 50, 750, { size: 10, align: 'center', color: 'gray', width: 500 });
  
  // Simulated QR Code Placeholder
  doc.rect(450, 700, 70, 70).fill('#002623');
  writeArabic('رمز التحقق', 450, 775, { size: 8, align: 'center', width: 70, color: '#b9a779' });

  doc.end();
};
