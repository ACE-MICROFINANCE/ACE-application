/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Mật khẩu tạm cho tất cả khách hàng mới nếu chưa có
const TEMP_PASSWORD = '123456';

// ================== TYPES ================== //

type CustomerSeed = {
  memberNo: string;
  fullName?: string;
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

type SavingsSeed = {
  memberNo: string;
  type: 'COMPULSORY' | 'VOLUNTARY';
  principalAmount: number;
  currentBalance: number;
  interestAccrued: number;
  lastDepositAmount?: number | null;
  lastDepositDate?: Date | null;
};

type EventSeed = {
  title: string;
  description?: string | null;
  eventType: 'MEETING' | 'FIELD_SCHOOL' | 'FARMING_TASK';
  startDate: Date;
  endDate?: Date | null;
  scope?: string | null;
  groupCode?: string | null;
  villageName?: string | null;
};

// ================== DATA KHÁCH HÀNG / KHOẢN VAY / KỲ TRẢ ================== //

const customersSeed: CustomerSeed[] = [
  {
    memberNo: '10011851',
    fullName: 'TÒNG THỊ HÉM',
    gender: 'Nữ',
    idCardNumber: '11183002883',
    phoneNumber: '379635954',
    locationType: 'Rural',
    villageName: 'THANH YEN',
    groupCode: '20000021',
    groupName: 'TY-DOI 11- BP1 DK',
  },
  {
    memberNo: '20004454',
    fullName: 'LƯỜNG THỊ Luyến',
    gender: 'Nữ',
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
    gender: 'Nữ',
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
    gender: 'Nữ',
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
    gender: 'Nữ',
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
    gender: 'Nữ',
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
    gender: 'Nữ',
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
    gender: 'Nữ',
    idCardNumber: '11162000395',
    phoneNumber: '392063204',
    locationType: 'Rural',
    villageName: 'THANH XUONG',
    groupCode: '30000025',
    groupName: 'TX-D4B BAN TEN - DK',
  },
  {
    memberNo: '20010346',
  },
  {
    memberNo: '40004791',
  },
  {
    memberNo: '20011728',
    groupCode: '20000018',
  },
];

const loansSeed: LoanSeed[] = [
  {
    memberNo: '10011851',
    loanNo: '001-0044355',
    externalLoanId: '865',
    productName: 'Gói cơ bản - dư nợ giảm dần',
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
    productName: 'Gói cơ bản - dư nợ giảm dần',
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
    productName: 'Gói cơ bản - trả gốc cuối kỳ',
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
    productName: 'Gói tăng dần - dư nợ giảm dần',
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
    productName: 'Gói tăng dần - dư nợ giảm dần',
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
    productName: 'Gói tăng dần - dư nợ giảm dần',
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
    productName: 'Gói cơ bản - trả gốc cuối kỳ',
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
    productName: 'Gói tăng dần - dư nợ giảm dần',
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

  // 001-0044357 (bullet)
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

  // 001-0044362 (1–8)
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

// ================== SEED SAVINGS (BẮT BUỘC / TỰ NGUYỆN) ================== //

const savingsSeed: SavingsSeed[] = [
  // mỗi khách tối đa 2 dòng: COMPULSORY + VOLUNTARY
  {
    memberNo: '10011851',
    type: 'COMPULSORY',
    principalAmount: 2000000,
    currentBalance: 2500000,
    interestAccrued: 80000,
    lastDepositAmount: 500000,
    lastDepositDate: new Date('2025-11-01'),
  },
  {
    memberNo: '10011851',
    type: 'VOLUNTARY',
    principalAmount: 1000000,
    currentBalance: 1200000,
    interestAccrued: 30000,
    lastDepositAmount: 200000,
    lastDepositDate: new Date('2025-10-20'),
  },

  {
    memberNo: '20004454',
    type: 'COMPULSORY',
    principalAmount: 1500000,
    currentBalance: 1750000,
    interestAccrued: 60000,
    lastDepositAmount: 250000,
    lastDepositDate: new Date('2025-11-05'),
  },

  {
    memberNo: '20003438',
    type: 'COMPULSORY',
    principalAmount: 1500000,
    currentBalance: 1800000,
    interestAccrued: 50000,
    lastDepositAmount: 300000,
    lastDepositDate: new Date('2025-11-10'),
  },

  {
    memberNo: '20011201',
    type: 'COMPULSORY',
    principalAmount: 2000000,
    currentBalance: 2200000,
    interestAccrued: 70000,
    lastDepositAmount: 200000,
    lastDepositDate: new Date('2025-11-02'),
  },

  {
    memberNo: '20010673',
    type: 'COMPULSORY',
    principalAmount: 2000000,
    currentBalance: 2300000,
    interestAccrued: 90000,
    lastDepositAmount: 300000,
    lastDepositDate: new Date('2025-11-03'),
  },

  {
    memberNo: '20003501',
    type: 'COMPULSORY',
    principalAmount: 2500000,
    currentBalance: 2800000,
    interestAccrued: 95000,
    lastDepositAmount: 300000,
    lastDepositDate: new Date('2025-11-06'),
  },

  {
    memberNo: '10011774',
    type: 'COMPULSORY',
    principalAmount: 1500000,
    currentBalance: 1700000,
    interestAccrued: 55000,
    lastDepositAmount: 200000,
    lastDepositDate: new Date('2025-11-08'),
  },

  {
    memberNo: '30000172',
    type: 'COMPULSORY',
    principalAmount: 2000000,
    currentBalance: 2300000,
    interestAccrued: 85000,
    lastDepositAmount: 300000,
    lastDepositDate: new Date('2025-11-04'),
  },
];

// ================== SEED EVENTS (LỊCH SỰ KIỆN) ================== //

// Giả định ngày "hiện tại" ~ đầu 12/2025 để FE test "upcoming"
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);
const today = new Date();
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

const eventsSeed: EventSeed[] = [
  {
    title: 'Họp nhóm tín dụng tháng này',
    description:
      'Cuộc họp nhóm định kỳ để nhắc lịch trả nợ và cập nhật tình hình tiết kiệm.',
    eventType: 'MEETING',
    startDate: addDays(todayStart, 7),
    endDate: addHours(addDays(todayStart, 7), 2),
    scope: 'GLOBAL',
  },
  {
    title: 'Tập huấn kỹ thuật canh tác',
    description:
      'Buổi tập huấn về kỹ thuật canh tác và chăm sóc cây trồng tại địa phương.',
    eventType: 'FIELD_SCHOOL',
    startDate: addDays(todayStart, 14),
    endDate: addHours(addDays(todayStart, 14), 4),
    scope: 'GLOBAL',
  },
  {
    title: 'Công việc đồng áng: chăm sóc cây trồng',
    description: 'Nhắc lịch công việc đồng áng theo khuyến cáo kỹ thuật.',
    eventType: 'FARMING_TASK',
    startDate: addDays(todayStart, 21),
    endDate: addHours(addDays(todayStart, 21), 3),
    scope: 'GLOBAL',
  },
];


// ================== MAIN SEED ================== //

async function main() {
  console.log('🔐 Tạo mật khẩu hash tạm...');
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);

  const memberIdMap = new Map<string, bigint>();

  console.log('👤 Upsert customers + credentials (KHÔNG xóa dữ liệu cũ)...');
  for (const c of customersSeed) {
    const customer = await prisma.customer.upsert({
      where: { memberNo: c.memberNo },
      update: {
        fullName: c.fullName,
        gender: c.gender ?? undefined,
        idCardNumber: c.idCardNumber ?? undefined,
        phoneNumber: c.phoneNumber ?? undefined,
        locationType: c.locationType ?? undefined,
        villageName: c.villageName ?? undefined,
        groupCode: c.groupCode ?? undefined,
        groupName: c.groupName ?? undefined,
        // membershipStartDate: giữ nguyên nếu đã có trong DB
      },
      create: {
        memberNo: c.memberNo,
        fullName: c.fullName,
        gender: c.gender ?? undefined,
        idCardNumber: c.idCardNumber ?? undefined,
        phoneNumber: c.phoneNumber ?? undefined,
        locationType: c.locationType ?? undefined,
        villageName: c.villageName ?? undefined,
        groupCode: c.groupCode ?? undefined,
        groupName: c.groupName ?? undefined,
        membershipStartDate: null,
        isActive: true,
      },
    });

    memberIdMap.set(c.memberNo, customer.id);

    await prisma.customerCredential.upsert({
      where: { customerId: customer.id },
      update: {
        // Nếu muốn reset mật khẩu mỗi lần seed, bỏ comment 2 dòng dưới:
        // passwordHash,
        // mustChangePassword: true,
      },
      create: {
        customerId: customer.id,
        passwordHash,
        mustChangePassword: true,
      },
    });
  }

  console.log('💰 Upsert loans + installments...');
  for (const loan of loansSeed) {
    const customerId = memberIdMap.get(loan.memberNo);
    if (!customerId) {
      console.warn(
        `⚠️ Không tìm thấy customer cho memberNo=${loan.memberNo}, bỏ qua loan ${loan.loanNo}`,
      );
      continue;
    }

    const dbLoan = await prisma.loan.upsert({
      where: { loanNo: loan.loanNo },
      update: {
        customerId,
        externalLoanId: loan.externalLoanId ?? undefined,
        productName: loan.productName ?? undefined,
        loanCycle: loan.loanCycle ?? undefined,
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate,
        termInstallments: loan.termInstallments ?? undefined,
        disbursementDate: loan.disbursementDate ?? undefined,
        maturityDate: loan.maturityDate ?? undefined,
        totalPrincipalOutstanding:
          loan.totalPrincipalOutstanding ?? undefined,
        totalInterestOutstanding:
          loan.totalInterestOutstanding ?? undefined,
        status: 'ACTIVE',
      },
      create: {
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
        totalPrincipalOutstanding:
          loan.totalPrincipalOutstanding ?? undefined,
        totalInterestOutstanding:
          loan.totalInterestOutstanding ?? undefined,
        status: 'ACTIVE',
      },
    });

    const instForLoan = installmentsSeed.filter(
      (i) => i.loanNo === loan.loanNo,
    );

    for (const inst of instForLoan) {
      await prisma.loanInstallment.upsert({
        where: {
          loanId_installmentNo: {
            loanId: dbLoan.id,
            installmentNo: inst.installmentNo,
          },
        },
        update: {
          dueDate: inst.dueDate,
          principalDue: inst.principalDue,
          interestDue: inst.interestDue,
          status: 'PENDING',
        },
        create: {
          loanId: dbLoan.id,
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate,
          principalDue: inst.principalDue,
          interestDue: inst.interestDue,
          status: 'PENDING',
        },
      });
    }
  }

  console.log('🏦 Upsert savings (CustomerSavings)...');
  for (const s of savingsSeed) {
    const customerId = memberIdMap.get(s.memberNo);
    if (!customerId) {
      console.warn(
        `⚠️ Không tìm thấy customer cho memberNo=${s.memberNo}, bỏ qua savings ${s.type}`,
      );
      continue;
    }

    await prisma.customerSavings.upsert({
      where: {
        customerId_type: {
          customerId,
          type: s.type,
        },
      },
      update: {
        principalAmount: s.principalAmount,
        currentBalance: s.currentBalance,
        interestAccrued: s.interestAccrued,
        lastDepositAmount: s.lastDepositAmount ?? undefined,
        lastDepositDate: s.lastDepositDate ?? undefined,
      },
      create: {
        customerId,
        type: s.type,
        principalAmount: s.principalAmount,
        currentBalance: s.currentBalance,
        interestAccrued: s.interestAccrued,
        lastDepositAmount: s.lastDepositAmount ?? undefined,
        lastDepositDate: s.lastDepositDate ?? undefined,
      },
    });
  }

  // Shift all seed events to the future so schedule is not empty.
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const minFutureDate = new Date(today.getTime() + 7 * MS_PER_DAY);
  const earliestStart = eventsSeed.reduce(
    (min, event) => (event.startDate < min ? event.startDate : min),
    eventsSeed[0]?.startDate ?? minFutureDate,
  );
  const shiftDays =
    earliestStart < minFutureDate
      ? Math.ceil((minFutureDate.getTime() - earliestStart.getTime()) / MS_PER_DAY)
      : 0;

  console.log('📅 Seed events (schedule)...');
  for (const e of eventsSeed) {
    const shiftedStart = shiftDays > 0 ? new Date(e.startDate.getTime() + shiftDays * MS_PER_DAY) : e.startDate;
    const shiftedEnd = e.endDate ? new Date(e.endDate.getTime() + shiftDays * MS_PER_DAY) : undefined;

    const existing = await prisma.event.findFirst({
      where: {
        title: e.title,
        eventType: e.eventType,
      },
    });

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: e.title,
          description: e.description ?? undefined,
          eventType: e.eventType,
          startDate: shiftedStart,
          endDate: shiftedEnd ?? undefined,
          scope: e.scope ?? 'GLOBAL',
          groupCode: e.groupCode ?? undefined,
          villageName: e.villageName ?? undefined,
        },
      });
      continue;
    }

    await prisma.event.create({
      data: {
        title: e.title,
        description: e.description ?? undefined,
        eventType: e.eventType,
        startDate: shiftedStart,
        endDate: shiftedEnd ?? undefined,
        scope: e.scope ?? 'GLOBAL',
        groupCode: e.groupCode ?? undefined,
        villageName: e.villageName ?? undefined,
      },
    });
  }

  console.log('✅ Seed xong! Temp password mặc định là:', TEMP_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
