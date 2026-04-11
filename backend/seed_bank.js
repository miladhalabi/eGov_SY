import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing
  await prisma.bankTransaction.deleteMany();
  
  // Create a valid transaction for testing
  // Ahmad (1234567890) is seller, Buyer is whoever
  // Let's create one that matches a potential price
  await prisma.bankTransaction.create({
    data: {
      referenceNumber: 'BANK-SYR-998877',
      senderNationalId: '4444444444', // Hoda (Buyer)
      receiverNationalId: '1234567890', // Ahmad (Seller)
      amount: 15000000,
    }
  });

  console.log('Bank seed complete. Valid Test ID: BANK-SYR-998877');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
