import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed the Civil Registry (Master Data)
  // These are people who exist in the government records but don't have portal accounts yet.
  const registry = [
    { nationalId: '1234567890', fullName: 'أحمد السوري', fatherName: 'محمود', motherName: 'فاطمة', gender: 'MALE', birthPlace: 'دمشق', birthDate: new Date('1990-05-15') },
    { nationalId: '2222222222', fullName: 'ليلى الشامي', fatherName: 'عصام', motherName: 'سعاد', gender: 'FEMALE', birthPlace: 'حلب', birthDate: new Date('1992-08-20') },
    { nationalId: '3333333333', fullName: 'ياسين الحلبي', fatherName: 'عبد القادر', motherName: 'خديجة', gender: 'MALE', birthPlace: 'حمص', birthDate: new Date('1985-03-10') },
    { nationalId: '4444444444', fullName: 'هدى الحمصي', fatherName: 'منير', motherName: 'نوال', gender: 'FEMALE', birthPlace: 'حماة', birthDate: new Date('1994-11-25') },
    { nationalId: '0000000001', fullName: 'سارة الموظفة', fatherName: 'حكومة', motherName: 'نظام', gender: 'FEMALE', birthPlace: 'دمشق', birthDate: new Date('1980-01-01') },
  ];

  for (const person of registry) {
    await prisma.civilRecord.upsert({
      where: { nationalId: person.nationalId },
      update: {},
      create: person
    });
  }

  // 2. Create an Active Portal User (Citizen Ahmad)
  const userAhmad = await prisma.user.upsert({
    where: { nationalId: '1234567890' },
    update: {},
    create: {
      nationalId: '1234567890',
      fullName: 'أحمد السوري',
      password: passwordHash,
      role: 'CITIZEN'
    }
  });

  // 3. Create a Government Employee
  await prisma.user.upsert({
    where: { nationalId: '0000000001' },
    update: {},
    create: {
      nationalId: '0000000001',
      fullName: 'سارة الموظفة',
      password: passwordHash,
      role: 'EMPLOYEE'
    }
  });

  // 4. Seed some financial data for Ahmad
  await prisma.financialRecord.createMany({
    data: [
      { nationalId: '1234567890', type: 'TRAFFIC_FINE', description: 'مخالفة سرعة في المزة', amount: 50000, isPaid: false },
      { nationalId: '1234567890', type: 'INCOME_TAX', description: 'ضريبة دخل 2025', amount: 120000, isPaid: true },
    ]
  });

  // 5. Seed a vehicle for Ahmad
  await prisma.vehicle.create({
    data: {
      plateNumber: 'دمشق-123456',
      model: 'كيا سيراتو',
      year: 2020,
      ownerId: userAhmad.id
    }
  });

  console.log('Robust Citizen Registry seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
