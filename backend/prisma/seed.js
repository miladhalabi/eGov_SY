import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const pinHash = await bcrypt.hash('123456', 10);
  const adminPinHash = await bcrypt.hash('111111', 10);
  const treasuryPinHash = await bcrypt.hash('000000', 10);

  // 1. Seed the Civil Registry (Master Data)
  const registry = [
    { nationalId: '1234567890', fullName: 'أحمد السوري', fatherName: 'محمود', motherName: 'فاطمة', gender: 'MALE', birthPlace: 'دمشق', birthDate: new Date('1990-05-15') },
    { nationalId: '2222222222', fullName: 'ليلى الشامي', fatherName: 'عصام', motherName: 'سعاد', gender: 'FEMALE', birthPlace: 'حلب', birthDate: new Date('1992-08-20') },
    { nationalId: '3333333333', fullName: 'ياسين الحلبي', fatherName: 'عبد القادر', motherName: 'خديجة', gender: 'MALE', birthPlace: 'حمص', birthDate: new Date('1985-03-10') },
    { nationalId: '4444444444', fullName: 'هدى الحمصي', fatherName: 'منير', motherName: 'نوال', gender: 'FEMALE', birthPlace: 'حماة', birthDate: new Date('1994-11-25') },
    { nationalId: '0000000001', fullName: 'سارة الموظفة', fatherName: 'حكومة', motherName: 'نظام', gender: 'FEMALE', birthPlace: 'دمشق', birthDate: new Date('1980-01-01') },
    { nationalId: '0000000000', fullName: 'الخزينة العامة للجمهورية العربية السورية', fatherName: 'سوريا', motherName: 'الوطن', gender: 'FEMALE', birthPlace: 'دمشق', birthDate: new Date('1946-04-17') },
  ];

  for (const person of registry) {
    await prisma.civilRecord.upsert({
      where: { nationalId: person.nationalId },
      update: person,
      create: person
    });
  }

  // 2. Create the Government Treasury User (National ID: 0000000000)
  await prisma.user.upsert({
    where: { nationalId: '0000000000' },
    update: {
      bankPin: treasuryPinHash,
      bankBalance: 999999999999
    },
    create: {
      nationalId: '0000000000',
      fullName: 'الخزينة العامة',
      password: passwordHash,
      role: 'EMPLOYEE',
      bankPin: treasuryPinHash,
      bankBalance: 999999999999
    }
  });

  // 3. Create an Active Portal User (Citizen Ahmad)
  const userAhmad = await prisma.user.upsert({
    where: { nationalId: '1234567890' },
    update: {
      bankPin: pinHash,
      bankBalance: 50000000
    },
    create: {
      nationalId: '1234567890',
      fullName: 'أحمد السوري',
      password: passwordHash,
      role: 'CITIZEN',
      bankPin: pinHash,
      bankBalance: 50000000
    }
  });

  // 4. Create a Government Employee
  await prisma.user.upsert({
    where: { nationalId: '0000000001' },
    update: {
      bankPin: adminPinHash,
      bankBalance: 1000000
    },
    create: {
      nationalId: '0000000001',
      fullName: 'سارة الموظفة',
      password: passwordHash,
      role: 'EMPLOYEE',
      bankPin: adminPinHash,
      bankBalance: 1000000
    }
  });

  // 5. Create another Citizen (Hoda - the Buyer)
  const userHoda = await prisma.user.upsert({
    where: { nationalId: '4444444444' },
    update: {
      bankPin: pinHash,
      bankBalance: 100000000
    },
    create: {
      nationalId: '4444444444',
      fullName: 'هدى الحمصي',
      password: passwordHash,
      role: 'CITIZEN',
      bankPin: pinHash,
      bankBalance: 100000000
    }
  });

  // 6. Seed some financial data for Ahmad
  const existingFine = await prisma.financialRecord.findFirst({
    where: { nationalId: '1234567890', description: 'مخالفة سرعة في المزة' }
  });
  
  if (!existingFine) {
    await prisma.financialRecord.createMany({
      data: [
        { nationalId: '1234567890', type: 'TRAFFIC_FINE', description: 'مخالفة سرعة في المزة', amount: 50000, isPaid: false },
        { nationalId: '1234567890', type: 'INCOME_TAX', description: 'ضريبة دخل 2025', amount: 120000, isPaid: true },
      ]
    });
  }

  const existingPropTax = await prisma.financialRecord.findFirst({
    where: { nationalId: '1234567890', type: 'PROPERTY_TAX' }
  });
  if (!existingPropTax) {
    await prisma.financialRecord.create({
      data: { nationalId: '1234567890', type: 'PROPERTY_TAX', description: 'رسوم ريع عقاري - محضر المزة 540/3', amount: 75000, isPaid: false }
    });
  }

  const existingMortgageLoan = await prisma.financialRecord.findFirst({
    where: { nationalId: '1234567890', type: 'MORTGAGE_LOAN' }
  });
  if (!existingMortgageLoan) {
    await prisma.financialRecord.create({
      data: { nationalId: '1234567890', type: 'MORTGAGE_LOAN', description: 'تسديد القرض العقاري - فك رهن محضر المزة 540/3', amount: 2000000, isPaid: false }
    });
  }

  // 7. Seed a vehicle for Ahmad
  await prisma.vehicle.upsert({
    where: { plateNumber: 'دمشق-123456' },
    update: {
      ownerId: userAhmad.id,
      year: 2022
    },
    create: {
      plateNumber: 'دمشق-123456',
      model: 'كيا سيراتو',
      year: 2022,
      ownerId: userAhmad.id
    }
  });

  // 8. Seed Properties
  const prop1 = await prisma.property.upsert({
    where: { titleDeedNumber: 'DEED-ABU-104' },
    update: { ownerId: userAhmad.id },
    create: {
      titleDeedNumber: 'DEED-ABU-104',
      cadastralZone: 'أبو رمانة',
      parcelNumber: '104/2',
      sizeSqm: 180,
      shares: 2400,
      ownerId: userAhmad.id,
      isMortgaged: false,
      isSeized: false
    }
  });

  const prop2 = await prisma.property.upsert({
    where: { titleDeedNumber: 'DEED-MEZ-540' },
    update: { ownerId: userAhmad.id },
    create: {
      titleDeedNumber: 'DEED-MEZ-540',
      cadastralZone: 'المزة',
      parcelNumber: '540/3',
      sizeSqm: 45,
      shares: 1200,
      ownerId: userAhmad.id,
      isMortgaged: true,
      isSeized: false
    }
  });

  const prop3 = await prisma.property.upsert({
    where: { titleDeedNumber: 'DEED-MAL-980' },
    update: { ownerId: userHoda.id },
    create: {
      titleDeedNumber: 'DEED-MAL-980',
      cadastralZone: 'المالكي',
      parcelNumber: '980/1',
      sizeSqm: 350,
      shares: 2400,
      ownerId: userHoda.id,
      isMortgaged: false,
      isSeized: true
    }
  });

  // 9. Seed Criminal Records
  await prisma.criminalRecord.upsert({
    where: { nationalId: '1234567890' },
    update: { hasCriminalRecord: false, convictions: "" },
    create: { nationalId: '1234567890', hasCriminalRecord: false, convictions: "" }
  });

  await prisma.criminalRecord.upsert({
    where: { nationalId: '4444444444' },
    update: { hasCriminalRecord: false, convictions: "" },
    create: { nationalId: '4444444444', hasCriminalRecord: false, convictions: "" }
  });

  await prisma.criminalRecord.upsert({
    where: { nationalId: '3333333333' },
    update: { hasCriminalRecord: true, convictions: "حكم قضائي بجرم السرقة الموصوفة لعام 2022" },
    create: { nationalId: '3333333333', hasCriminalRecord: true, convictions: "حكم قضائي بجرم السرقة الموصوفة لعام 2022" }
  });

  console.log('Registry, Users, Properties and Criminal Records seeded successfully!');
 }

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
