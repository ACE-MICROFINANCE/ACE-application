import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

async function main() {
  const tempPassword = '123456';
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // reset demo data
  await prisma.refreshToken.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.loanInstallment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.customerSavings.deleteMany();
  await prisma.customerCredential.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.event.deleteMany();

  const customer = await prisma.customer.create({
    data: {
      memberNo: '100001',
      fullName: 'Hoàng Thị Hoa',
      gender: 'Female',
      idCardNumber: '012345678',
      phoneNumber: '0912345678',
      locationType: 'Rural',
      villageName: 'Bản Noong Nhai',
      groupCode: 'G01',
      groupName: 'Nhóm 1',
      membershipStartDate: new Date('2025-10-01'),
      credential: {
        create: {
          passwordHash,
          mustChangePassword: true,
        },
      },
    },
  });

  const today = new Date();
  const disbursementDate = addDays(today, -7);
  const maturityDate = addDays(today, 270);

  const loan = await prisma.loan.create({
    data: {
      customerId: customer.id,
      loanNo: 'K001',
      productName: 'Khoản vay phát triển nông nghiệp',
      principalAmount: new Prisma.Decimal(30000000),
      interestRate: new Prisma.Decimal(3),
      termInstallments: 10,
      disbursementDate,
      maturityDate,
      totalPrincipalOutstanding: new Prisma.Decimal(27000000),
      totalInterestOutstanding: new Prisma.Decimal(0),
      status: 'ACTIVE',
      installments: {
        createMany: {
          data: [
            {
              installmentNo: 1,
              dueDate: addDays(today, 7),
              principalDue: new Prisma.Decimal(3000000),
              interestDue: new Prisma.Decimal(0),
              status: 'PENDING',
            },
            {
              installmentNo: 2,
              dueDate: addDays(today, 37),
              principalDue: new Prisma.Decimal(3000000),
              interestDue: new Prisma.Decimal(0),
              status: 'PENDING',
            },
            {
              installmentNo: 3,
              dueDate: addDays(today, 67),
              principalDue: new Prisma.Decimal(3000000),
              interestDue: new Prisma.Decimal(0),
              status: 'PENDING',
            },
          ],
        },
      },
    },
  });

  await prisma.customerSavings.createMany({
    data: [
      {
        customerId: customer.id,
        type: 'COMPULSORY',
        principalAmount: new Prisma.Decimal(30000000),
        currentBalance: new Prisma.Decimal(33000000),
        interestAccrued: new Prisma.Decimal(3000000),
        lastDepositAmount: null,
        lastDepositDate: new Date('2025-10-27'),
      },
      {
        customerId: customer.id,
        type: 'VOLUNTARY',
        principalAmount: new Prisma.Decimal(30000000),
        currentBalance: new Prisma.Decimal(33500000),
        interestAccrued: new Prisma.Decimal(3000000),
        lastDepositAmount: new Prisma.Decimal(500000),
        lastDepositDate: new Date('2025-10-27'),
      },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        title: 'Họp nhóm tại Bản Noong Nhai',
        description: 'Buổi họp nhóm định kỳ hằng tháng.',
        eventType: 'MEETING',
        startDate: addDays(today, 5),
        endDate: addHours(addDays(today, 5), 2),
        scope: 'GROUP',
        groupCode: 'G01',
      },
      {
        title: 'Cấy lúa vụ xuân',
        description: 'Hướng dẫn kỹ thuật cấy lúa đầu vụ.',
        eventType: 'FARMING_TASK',
        startDate: addDays(today, 15),
        scope: 'VILLAGE',
        villageName: 'Bản Noong Nhai',
      },
      {
        title: 'Lớp học đồng ruộng: Chăn nuôi gia súc',
        description: 'Buổi tập huấn kỹ thuật chăn nuôi gia súc.',
        eventType: 'FIELD_SCHOOL',
        startDate: addDays(today, 20),
        scope: 'GLOBAL',
      },
    ],
  });

  await prisma.feedback.create({
    data: {
      customerId: customer.id,
      content: 'Ứng dụng rất dễ sử dụng, tôi muốn đề xuất thêm tính năng xem lịch sử nộp tiền.',
      status: 'NEW',
    },
  });

  console.log(
    `Seed hoàn tất. Đăng nhập demo → memberNo: ${customer.memberNo}, password: ${tempPassword}, loan: ${loan.loanNo}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
