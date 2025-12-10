/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Mật khẩu tạm cho tất cả khách hàng mới nếu chưa có
const TEMP_PASSWORD = '123456';

// ================== TYPES ================== //

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

// ================== DATA TỪ EXCEL (CUSTOMER/LOAN/INSTALLMENT) ================== //

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

// ================== SEED SAVINGS (COMPULSORY / VOLUNTARY) ================== //

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

// ================== SEED EVENTS (SCHEDULE) ================== //

// Giả định ngày "hiện tại" khoảng cuối 2025 để FE test "upcoming"

// Giả định ngày "hiện tại" khoảng đầu 12/2025 để FE test "upcoming"
const eventsSeed: EventSeed[] = [
  // 10011851 - TÒNG THỊ HÉM - THANH YEN - 20000021
  {
    title: 'Họp nhóm tín dụng tại bản Thanh Yên',
    description:
      'Cuộc họp nhóm định kỳ để nhắc lịch trả nợ, cập nhật tình hình tiết kiệm và trao đổi khó khăn của thành viên nhóm 20000021.',
    eventType: 'MEETING',
    startDate: new Date('2025-12-10T09:00:00'),
    endDate: new Date('2025-12-10T11:00:00'),
    scope: 'GROUP',
    groupCode: '20000021',
    villageName: 'THANH YEN',
  },
  {
    title: 'Lớp học đồng ruộng về kỹ thuật trồng ngô',
    description:
      'Cán bộ kỹ thuật hướng dẫn cách chọn giống, bón phân và phòng trừ sâu bệnh trên ruộng ngô cho hộ vay tại bản Thanh Yên.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2025-12-17T08:30:00'),
    endDate: new Date('2025-12-17T16:30:00'),
    scope: 'GROUP',
    groupCode: '20000021',
    villageName: 'THANH YEN',
  },
  {
    title: 'Ngày công việc đồng áng: làm cỏ và vun gốc ngô',
    description:
      'Các hộ trong nhóm 20000021 cùng hỗ trợ nhau làm cỏ, vun gốc cho ruộng ngô để kịp thời vụ.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-01-05T06:30:00'),
    endDate: new Date('2026-01-05T10:30:00'),
    scope: 'GROUP',
    groupCode: '20000021',
    villageName: 'THANH YEN',
  },

  // 20004454 - LƯỜNG THỊ Luyến - THANH YEN - 20000018
  {
    title: 'Họp nhóm tín dụng – nhóm 20000018',
    description:
      'Họp nhóm để rà soát lịch trả nợ, nhắc nhở thành viên chuẩn bị tiền gốc và lãi đúng hạn.',
    eventType: 'MEETING',
    startDate: new Date('2025-12-11T09:00:00'),
    endDate: new Date('2025-12-11T11:00:00'),
    scope: 'GROUP',
    groupCode: '20000018',
    villageName: 'THANH YEN',
  },
  {
    title: 'Lớp học đồng ruộng: sử dụng phân bón tiết kiệm',
    description:
      'Giới thiệu kỹ thuật bón phân hợp lý cho cây ngô và cây màu, giảm chi phí nhưng vẫn đảm bảo năng suất.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2025-12-19T08:30:00'),
    endDate: new Date('2025-12-19T16:00:00'),
    scope: 'GROUP',
    groupCode: '20000018',
    villageName: 'THANH YEN',
  },
  {
    title: 'Ngày công việc đồng áng: thu gom rơm rạ',
    description:
      'Các hộ hỗ trợ nhau thu gom rơm rạ sau thu hoạch, chuẩn bị đất cho vụ sau.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-01-06T06:30:00'),
    endDate: new Date('2026-01-06T10:30:00'),
    scope: 'GROUP',
    groupCode: '20000018',
    villageName: 'THANH YEN',
  },

  // 20003438 - VÌ THỊ LÚN - THANH YEN - 20000025
  {
    title: 'Họp nhóm tín dụng – bản Thanh Yên (nhóm 20000025)',
    description:
      'Thảo luận tình hình sản xuất, kế hoạch trả nợ và cập nhật các thông tin mới từ dự án.',
    eventType: 'MEETING',
    startDate: new Date('2025-12-12T09:00:00'),
    endDate: new Date('2025-12-12T11:00:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },
  {
    title: 'Lớp học đồng ruộng về kỹ thuật chăm sóc lúa',
    description:
      'Hướng dẫn kỹ thuật chăm sóc lúa nước, quản lý nước và sâu bệnh cho hộ vay trong nhóm 20000025.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2025-12-20T08:30:00'),
    endDate: new Date('2025-12-20T16:00:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },
  {
    title: 'Ngày công việc đồng áng: nạo vét kênh mương nội đồng',
    description:
      'Các hộ trong nhóm cùng làm vệ sinh, nạo vét kênh mương để chuẩn bị nước tưới cho vụ tới.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-01-07T06:30:00'),
    endDate: new Date('2026-01-07T10:30:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },

  // 20011201 - LƯỜNG THỊ Nhung - THANH YEN - 20000025
  {
    title: 'Họp rà soát kế hoạch trả nợ đầu năm',
    description:
      'Nhóm 20000025 họp để lên kế hoạch trả nợ đầu năm, trao đổi khó khăn về dòng tiền và mùa vụ.',
    eventType: 'MEETING',
    startDate: new Date('2026-01-10T09:00:00'),
    endDate: new Date('2026-01-10T11:00:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },
  {
    title: 'Lớp học đồng ruộng: phòng trừ sâu bệnh hại ngô',
    description:
      'Chia sẻ kinh nghiệm nhận biết sâu bệnh sớm và cách sử dụng thuốc bảo vệ thực vật an toàn.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2026-01-15T08:30:00'),
    endDate: new Date('2026-01-15T16:00:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },
  {
    title: 'Ngày công việc đồng áng: gieo trồng vụ mới',
    description:
      'Các hộ hỗ trợ nhau gieo trồng vụ mới, đảm bảo kịp khung thời vụ do cán bộ kỹ thuật khuyến cáo.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-01-18T06:30:00'),
    endDate: new Date('2026-01-18T11:00:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },

  // 20010673 - CÀ THỊ Phong - THANH YEN - 20000025
  {
    title: 'Họp nhóm chia sẻ kinh nghiệm sử dụng vốn vay',
    description:
      'Thành viên nhóm chia sẻ cách sử dụng vốn vay hiệu quả cho chăn nuôi và trồng trọt.',
    eventType: 'MEETING',
    startDate: new Date('2026-01-22T09:00:00'),
    endDate: new Date('2026-01-22T11:00:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },
  {
    title: 'Lớp học đồng ruộng: chăn nuôi gia súc an toàn sinh học',
    description:
      'Hướng dẫn cách vệ sinh chuồng trại, phòng bệnh cho trâu bò, lợn để giảm rủi ro dịch bệnh.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2026-01-25T08:30:00'),
    endDate: new Date('2026-01-25T16:00:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },
  {
    title: 'Ngày công việc đồng áng: sửa chữa chuồng trại chăn nuôi',
    description:
      'Các hộ hỗ trợ nhau gia cố, sửa chữa chuồng trại trước mùa mưa để bảo vệ đàn vật nuôi.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-01-28T06:30:00'),
    endDate: new Date('2026-01-28T10:30:00'),
    scope: 'GROUP',
    groupCode: '20000025',
    villageName: 'THANH YEN',
  },

  // 20003501 - TRẦN THỊ Anh - THANH YEN - 20000028
  {
    title: 'Họp nhóm tín dụng – nhóm 20000028',
    description:
      'Trao đổi về tình hình kinh doanh nhỏ lẻ, buôn bán và cách xoay vòng vốn vay trong nhóm.',
    eventType: 'MEETING',
    startDate: new Date('2026-02-02T09:00:00'),
    endDate: new Date('2026-02-02T11:00:00'),
    scope: 'GROUP',
    groupCode: '20000028',
    villageName: 'THANH YEN',
  },
  {
    title: 'Lớp học đồng ruộng: đa dạng hóa cây trồng',
    description:
      'Giới thiệu mô hình trồng xen canh rau màu cùng cây ngô để tăng thu nhập cho hộ vay.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2026-02-05T08:30:00'),
    endDate: new Date('2026-02-05T16:00:00'),
    scope: 'GROUP',
    groupCode: '20000028',
    villageName: 'THANH YEN',
  },
  {
    title: 'Ngày công việc đồng áng: thu hoạch rau màu',
    description:
      'Các hộ hỗ trợ nhau thu hoạch rau màu, phân loại và chuẩn bị bán ra chợ.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-02-08T06:30:00'),
    endDate: new Date('2026-02-08T10:30:00'),
    scope: 'GROUP',
    groupCode: '20000028',
    villageName: 'THANH YEN',
  },

  // 10011774 - LÒ THỊ PHÁNG - THANH CHAN - 10000140
  {
    title: 'Họp nhóm tín dụng bản Thanh Chăn',
    description:
      'Nhắc lịch trả nợ, rà soát các khoản tiết kiệm bắt buộc và tự nguyện của thành viên.',
    eventType: 'MEETING',
    startDate: new Date('2025-12-13T09:00:00'),
    endDate: new Date('2025-12-13T11:00:00'),
    scope: 'GROUP',
    groupCode: '10000140',
    villageName: 'THANH CHAN',
  },
  {
    title: 'Lớp học đồng ruộng: cải tạo đất trồng sau nhiều vụ',
    description:
      'Hướng dẫn bón phân hữu cơ, luân canh cây trồng để giữ độ màu mỡ của đất.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2025-12-21T08:30:00'),
    endDate: new Date('2025-12-21T16:00:00'),
    scope: 'GROUP',
    groupCode: '10000140',
    villageName: 'THANH CHAN',
  },
  {
    title: 'Ngày công việc đồng áng: dọn vệ sinh bờ ruộng, đường nội đồng',
    description:
      'Các hộ cùng phát quang cỏ dại, dọn vệ sinh bờ ruộng và đường nội đồng để đi lại thuận tiện.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-01-09T06:30:00'),
    endDate: new Date('2026-01-09T10:30:00'),
    scope: 'GROUP',
    groupCode: '10000140',
    villageName: 'THANH CHAN',
  },

  // 30000172 - HOÀNG THỊ Thịnh - THANH XUONG - 30000025
  {
    title: 'Họp nhóm tín dụng bản Thanh Xuông',
    description:
      'Họp nhóm để đánh giá tình hình sử dụng vốn vay, chuẩn bị cho kỳ trả nợ sắp tới.',
    eventType: 'MEETING',
    startDate: new Date('2025-12-14T09:00:00'),
    endDate: new Date('2025-12-14T11:00:00'),
    scope: 'GROUP',
    groupCode: '30000025',
    villageName: 'THANH XUONG',
  },
  {
    title: 'Lớp học đồng ruộng: kỹ thuật trồng cây ăn quả',
    description:
      'Giới thiệu mô hình trồng cây ăn quả phù hợp với điều kiện khí hậu địa phương, kết hợp với cây lương thực.',
    eventType: 'FIELD_SCHOOL',
    startDate: new Date('2025-12-22T08:30:00'),
    endDate: new Date('2025-12-22T16:00:00'),
    scope: 'GROUP',
    groupCode: '30000025',
    villageName: 'THANH XUONG',
  },
  {
    title: 'Ngày công việc đồng áng: tỉa cành, bón phân cho vườn cây ăn quả',
    description:
      'Các hộ trong nhóm cùng hỗ trợ chăm sóc vườn cây ăn quả, tỉa cành và bón phân đúng kỹ thuật.',
    eventType: 'FARMING_TASK',
    startDate: new Date('2026-01-12T06:30:00'),
    endDate: new Date('2026-01-12T10:30:00'),
    scope: 'GROUP',
    groupCode: '30000025',
    villageName: 'THANH XUONG',
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
        // membershipStartDate: giữ nguyên nếu đã có trong DB, nên không update
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
        // Không bắt buộc ghi đè password; nếu muốn reset, có thể set lại:
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

  console.log('📅 Seed events (schedule)...');
  for (const e of eventsSeed) {
    // tránh trùng bằng cách check theo title + eventType + startDate
    const existing = await prisma.event.findFirst({
      where: {
        title: e.title,
        eventType: e.eventType,
        startDate: e.startDate,
      },
    });

    if (existing) {
      continue;
    }

    await prisma.event.create({
      data: {
        title: e.title,
        description: e.description ?? undefined,
        eventType: e.eventType,
        startDate: e.startDate,
        endDate: e.endDate ?? undefined,
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
