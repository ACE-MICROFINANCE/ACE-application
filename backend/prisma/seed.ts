/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Mật khẩu tạm cho tất cả khách hàng
const TEMP_PASSWORD = '123456';

type CustomerSeed = {
  memberNo: string;
  fullName: string;
  gender?: string | null;
  idCardNumber?: string | null;
  phoneNumber?: string | null;
  locationType?: string | null;
  villageName?: string | null;
  groupCode?: string | null;
  groupName?: string | null;
};

type LoanSeed = {
  memberNo: string;
  loanNo: string;
  externalLoanId?: string | null;
  productName?: string | null;
  loanCycle?: number | null;
  principalAmount: number;
  interestRate: number;
  termInstallments?: number | null;
  disbursementDate?: Date | null;
  maturityDate?: Date | null;
  totalPrincipalOutstanding?: number | null;
  totalInterestOutstanding?: number | null;
};

type InstallmentSeed = {
  memberNo: string;
  loanNo: string;
  installmentNo: number;
  principalDue: number;
  interestDue: number;
  dueDate: Date;
};

// -------------------- DATA LẤY TỪ EXCEL -------------------- //

const customersSeed: CustomerSeed[] = [
  {
    memberNo: '10011851',
    fullName: 'TÒNG THỊ HÉM',
    gender: 'Female',
    idCardNumber: '11183002883',
    phoneNumber: '379635954',
    locationType: 'Rural',
    villageName: 'THANH YEN',
    groupCode: '20000021',
    groupName: 'TY-DOI 11- BP1 DK',
  },
  {
    memberNo: '20004454',
    fullName: 'LƯỜNG THỊ luyến',
    gender: 'Female',
    idCardNumber: '11178003951',
    phoneNumber: '335367335',
    locationType: 'Rural',
    villageName: 'THANH YEN',
    groupCode: '20000018',
    groupName: 'TY-DOI 1A- NV-D1B2 DK',
  },
  {
    memberNo: '20003438',
    fullName: 'VÌ THỊ LÚN',
    gender: 'Female',
    idCardNumber: '11164004300',
    phoneNumber: '386683112',
    locationType: 'Rural',
    villageName: 'THANH YEN',
    groupCode: '20000025',
    groupName: 'TY-DOI 1A- NV-D1A1 DK',
  },
  {
    memberNo: '20011201',
    fullName: 'LƯỜNG THỊ Nhung',
    gender: 'Female',
    idCardNumber: '11186006738',
    phoneNumber: '383629966',
    locationType: 'Rural',
    villageName: 'THANH YEN',
    groupCode: '20000025',
    groupName: 'TY-DOI 1A- NV-D1A1 DK',
  },
  {
    memberNo: '20010673',
    fullName: 'CÀ THỊ Phong',
    gender: 'Female',
    idCardNumber: '11182006740',
    phoneNumber: '393380578',
    locationType: 'Rural',
    villageName: 'THANH YEN',
    groupCode: '20000025',
    groupName: 'TY-DOI 1A- NV-D1A1 DK',
  },
  {
    memberNo: '20003501',
    fullName: 'TRẦN THỊ Anh',
    gender: 'Female',
    idCardNumber: '34169019591',
    phoneNumber: '906188335',
    locationType: 'Rural',
    villageName: 'THANH YEN',
    groupCode: '20000028',
    groupName: 'TY-PHU YEN(10A) DK',
  },
  {
    memberNo: '10011774',
    fullName: 'LÒ THỊ PHÁNG',
    gender: 'Female',
    idCardNumber: '11172001603',
    phoneNumber: '398310135',
    locationType: 'Rural',
    villageName: 'THANH CHAN',
    groupCode: '10000140',
    groupName: 'TC- PA LECH',
  },
  {
    memberNo: '30000172',
    fullName: 'HOÀNG THỊ Thịnh',
    gender: 'Female',
    idCardNumber: '11162000395',
    phoneNumber: '392063204',
    locationType: 'Rural',
    villageName: 'THANH XUONG',
    groupCode: '30000025',
    groupName: 'TX-D4B BAN TEN - DK',
  },
];

const loansSeed: LoanSeed[] = [
  {
    memberNo: '10011851',
    loanNo: '001-0044355',
    externalLoanId: '865',
    productName: 'BASIC - DEGRESSIVE',
    loanCycle: 3,
    principalAmount: 15000000,
    interestRate: 16.8,
    termInstallments: 2,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2026-09-29'),
    totalPrincipalOutstanding: 15000000,
    totalInterestOutstanding: 1839000,
  },
  {
    memberNo: '20004454',
    loanNo: '001-0044356',
    externalLoanId: '866',
    productName: 'BASIC - DEGRESSIVE',
    loanCycle: 12,
    principalAmount: 15000000,
    interestRate: 16.8,
    termInstallments: 3,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2027-03-22'),
    totalPrincipalOutstanding: 15000000,
    totalInterestOutstanding: 2500000,
  },
  {
    memberNo: '20003438',
    loanNo: '001-0044357',
    externalLoanId: '867',
    productName: 'BASIC - BULLET',
    loanCycle: 13,
    principalAmount: 10000000,
    interestRate: 16.8,
    termInstallments: 13,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2026-10-26'),
    totalPrincipalOutstanding: 10000000,
    totalInterestOutstanding: 1723000,
  },
  {
    memberNo: '20011201',
    loanNo: '001-0044358',
    externalLoanId: '868',
    productName: 'SCALE-UP - DEGRESSIVE',
    loanCycle: 6,
    principalAmount: 20000000,
    interestRate: 16.8,
    termInstallments: 4,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2027-05-10'),
    totalPrincipalOutstanding: 20000000,
    totalInterestOutstanding: 3421000,
  },
  {
    memberNo: '20010673',
    loanNo: '001-0044359',
    externalLoanId: '869',
    productName: 'SCALE-UP - DEGRESSIVE',
    loanCycle: 7,
    principalAmount: 20000000,
    interestRate: 16.8,
    termInstallments: 4,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2027-05-10'),
    totalPrincipalOutstanding: 20000000,
    totalInterestOutstanding: 3421000,
  },
  {
    memberNo: '20003501',
    loanNo: '001-0044360',
    externalLoanId: '870',
    productName: 'SCALE-UP - DEGRESSIVE',
    loanCycle: 12,
    principalAmount: 25000000,
    interestRate: 16.8,
    termInstallments: 2,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2026-09-15'),
    totalPrincipalOutstanding: 25000000,
    totalInterestOutstanding: 2901000,
  },
  {
    memberNo: '10011774',
    loanNo: '001-0044361',
    externalLoanId: '871',
    productName: 'BASIC - BULLET',
    loanCycle: 3,
    principalAmount: 15000000,
    interestRate: 16.8,
    termInstallments: 13,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2026-10-29'),
    totalPrincipalOutstanding: 15000000,
    totalInterestOutstanding: 2599000,
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    externalLoanId: '872',
    productName: 'SCALE-UP - DEGRESSIVE',
    loanCycle: 11,
    principalAmount: 20000000,
    interestRate: 16.8,
    termInstallments: 15,
    disbursementDate: new Date('2025-10-17'),
    maturityDate: new Date('2026-12-16'),
    totalPrincipalOutstanding: 20000000,
    totalInterestOutstanding: 2174000,
  },
];

const installmentsSeed: InstallmentSeed[] = [
  // 001-0044355
  {
    memberNo: '10011851',
    loanNo: '001-0044355',
    installmentNo: 6,
    principalDue: 7203000,
    interestDue: 1236000,
    dueDate: new Date('2026-04-01'),
  },
  {
    memberNo: '10011851',
    loanNo: '001-0044355',
    installmentNo: 8,
    principalDue: 7797000,
    interestDue: 603000,
    dueDate: new Date('2026-06-01'),
  },

  // 001-0044356
  {
    memberNo: '20004454',
    loanNo: '001-0044356',
    installmentNo: 6,
    principalDue: 4598000,
    interestDue: 1277000,
    dueDate: new Date('2026-04-01'),
  },
  {
    memberNo: '20004454',
    loanNo: '001-0044356',
    installmentNo: 8,
    principalDue: 10402000,
    interestDue: 1223000,
    dueDate: new Date('2026-06-01'),
  },

  // 001-0044357 (bullet, chỉ kỳ >7 có principal)
  {
    memberNo: '20003438',
    loanNo: '001-0044357',
    installmentNo: 8,
    principalDue: 10000000,
    interestDue: 774000,
    dueDate: new Date('2026-06-01'),
  },

  // 001-0044358
  {
    memberNo: '20011201',
    loanNo: '001-0044358',
    installmentNo: 5,
    principalDue: 4511000,
    interestDue: 1381000,
    dueDate: new Date('2026-03-01'),
  },
  {
    memberNo: '20011201',
    loanNo: '001-0044358',
    installmentNo: 8,
    principalDue: 15489000,
    interestDue: 2040000,
    dueDate: new Date('2026-06-01'),
  },

  // 001-0044359
  {
    memberNo: '20010673',
    loanNo: '001-0044359',
    installmentNo: 5,
    principalDue: 4511000,
    interestDue: 1381000,
    dueDate: new Date('2026-03-01'),
  },
  {
    memberNo: '20010673',
    loanNo: '001-0044359',
    installmentNo: 8,
    principalDue: 15489000,
    interestDue: 2040000,
    dueDate: new Date('2026-06-01'),
  },

  // 001-0044360
  {
    memberNo: '20003501',
    loanNo: '001-0044360',
    installmentNo: 5,
    principalDue: 12042000,
    interestDue: 1899000,
    dueDate: new Date('2026-03-01'),
  },
  {
    memberNo: '20003501',
    loanNo: '001-0044360',
    installmentNo: 8,
    principalDue: 12958000,
    interestDue: 1002000,
    dueDate: new Date('2026-06-01'),
  },

  // 001-0044361 (bullet)
  {
    memberNo: '10011774',
    loanNo: '001-0044361',
    installmentNo: 8,
    principalDue: 15000000,
    interestDue: 1158000,
    dueDate: new Date('2026-06-01'),
  },

  // 001-0044362 (đầy đủ 1–7 + >7)
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 1,
    principalDue: 1197000,
    interestDue: 304000,
    dueDate: new Date('2025-11-01'),
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 2,
    principalDue: 1233000,
    interestDue: 242000,
    dueDate: new Date('2025-12-01'),
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 3,
    principalDue: 1249000,
    interestDue: 226000,
    dueDate: new Date('2026-01-01'),
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 4,
    principalDue: 1265000,
    interestDue: 210000,
    dueDate: new Date('2026-02-01'),
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 5,
    principalDue: 1281000,
    interestDue: 194000,
    dueDate: new Date('2026-03-01'),
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 6,
    principalDue: 1297000,
    interestDue: 178000,
    dueDate: new Date('2026-04-01'),
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 7,
    principalDue: 1314000,
    interestDue: 161000,
    dueDate: new Date('2026-05-01'),
  },
  {
    memberNo: '30000172',
    loanNo: '001-0044362',
    installmentNo: 8,
    principalDue: 11164000,
    interestDue: 659000,
    dueDate: new Date('2026-06-01'),
  },
];

// -------------------- CHẠY SEED -------------------- //

async function main() {
  console.log('🧹 Xóa dữ liệu cũ...');
  await prisma.loanInstallment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.customerCredential.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.customer.deleteMany();

  console.log('🔐 Tạo mật khẩu hash...');
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);
  const memberIdMap = new Map<string, bigint>();

  console.log('👤 Seed customers + credentials...');
  for (const c of customersSeed) {
    const created = await prisma.customer.create({
      data: {
        memberNo: c.memberNo,
        fullName: c.fullName,
        gender: c.gender ?? undefined,
        idCardNumber: c.idCardNumber ?? undefined,
        phoneNumber: c.phoneNumber ?? undefined,
        locationType: c.locationType ?? undefined,
        villageName: c.villageName ?? undefined,
        groupCode: c.groupCode ?? undefined,
        groupName: c.groupName ?? undefined,
        // Excel không có membershipStartDate -> để null
        membershipStartDate: null,
        isActive: true,
      },
    });

    memberIdMap.set(c.memberNo, created.id);

    await prisma.customerCredential.create({
      data: {
        customerId: created.id,
        passwordHash,
        mustChangePassword: true,
      },
    });
  }

  console.log('💰 Seed loans + installments...');
  for (const loan of loansSeed) {
    const customerId = memberIdMap.get(loan.memberNo);
    if (!customerId) {
      console.warn(`⚠️ Không tìm thấy customer cho memberNo=${loan.memberNo}, bỏ qua loan ${loan.loanNo}`);
      continue;
    }

    const createdLoan = await prisma.loan.create({
      data: {
        customerId,
        loanNo: loan.loanNo,
        externalLoanId: loan.externalLoanId ?? undefined,
        productName: loan.productName ?? undefined,
        loanCycle: loan.loanCycle ?? undefined,
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate,
        termInstallments: loan.termInstallments ?? undefined,
        disbursementDate: loan.disbursementDate ?? undefined,
        maturityDate: loan.maturityDate ?? undefined,
        totalPrincipalOutstanding: loan.totalPrincipalOutstanding ?? undefined,
        totalInterestOutstanding: loan.totalInterestOutstanding ?? undefined,
        status: 'ACTIVE',
      },
    });

    const instForLoan = installmentsSeed.filter((i) => i.loanNo === loan.loanNo);
    for (const inst of instForLoan) {
      await prisma.loanInstallment.create({
        data: {
          loanId: createdLoan.id,
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate,
          principalDue: inst.principalDue,
          interestDue: inst.interestDue,
          status: 'PENDING',
        },
      });
    }
  }

  console.log('✅ Seed xong! Temp password cho tất cả khách hàng là:', TEMP_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
