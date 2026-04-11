import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const transfers = await prisma.vehicleTransfer.findMany({
    include: { seller: true, buyer: true, vehicle: true }
  });
  console.log('--- Transfers ---');
  console.log(JSON.stringify(transfers, null, 2));

  const bankTxs = await prisma.bankTransaction.findMany();
  console.log('--- Bank Transactions ---');
  console.log(JSON.stringify(bankTxs, null, 2));
}

main().finally(() => prisma.$disconnect());
