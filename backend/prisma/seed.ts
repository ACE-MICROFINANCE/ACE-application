import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tempPassword = '123456';
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const customers = [
    {
      customerId: '0123456789',
      fullName: 'Nguyen Van A',
      phone: '+84123456789',
    },
    {
      customerId: '0987654321',
      fullName: 'Tran Thi B',
      phone: '+84987654321',
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { customerId: customer.customerId },
      update: {},
      create: {
        ...customer,
        passwordHash,
        mustChangePassword: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete. Temporary password for demo accounts: ${tempPassword}`,
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
