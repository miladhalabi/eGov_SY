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
  await prisma.user.upsert({
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

  // 7. Seed a vehicle for Ahmad
  await prisma.vehicle.upsert({
    where: { plateNumber: 'دمشق-123456' },
    update: {
      ownerId: userAhmad.id
    },
    create: {
      plateNumber: 'دمشق-123456',
      model: 'كيا سيراتو',
      year: 2020,
      ownerId: userAhmad.id
    }
  });

  console.log('Registry and Users seeded successfully with Hashed PINs!');
 }

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
