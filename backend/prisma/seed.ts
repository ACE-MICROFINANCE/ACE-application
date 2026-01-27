/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEMP_PASSWORD = '123456'; // (không dùng để tạo customer credential nữa)
const STAFF_DEFAULT_PASSWORD = '123456';

// ================== TYPES ================== //

type CustomerSeed = {
  memberNo: string;
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
  branchCode?: string | null;
  audienceType?: 'BRANCH_ALL' | 'GROUPS' | null;
};

type StaffSeed = {
  email: string;
  role: 'ADMIN' | 'BRANCH_MANAGER' | 'SUPER_ADMIN';
  branchCode?: string | null;
  fullName?: string | null;
};

// ================== CUSTOMERS: CHỈ CÓ memberNo ================== //

const customersSeed: CustomerSeed[] = [
  { memberNo: '40003498' },
  { memberNo: '40001839' },
  { memberNo: '40005198' },
  { memberNo: '40000361' },
  { memberNo: '10005387' },
  { memberNo: '10000428' },
  { memberNo: '10009908' },
  { memberNo: '10001231' },
  { memberNo: '20006096' },
  { memberNo: '20009471' },
  { memberNo: '20011641' },
  { memberNo: '20006210' },
  { memberNo: '20003072' },
  { memberNo: '20003773' },
  { memberNo: '20004104' },
  { memberNo: '20009130' },
  { memberNo: '10011765' },
];

// ================== STAFF USERS (GIỮ NGUYÊN + THÊM 2 ADMIN) ================== //

const staffSeed: StaffSeed[] = [
  // existing
  {
    email: 'admin@anhchiem.org',
    role: 'ADMIN',
    branchCode: null,
    fullName: 'ACE Admin',
  },
  {
    email: 'staff.area1@anhchiem.org',
    role: 'BRANCH_MANAGER',
    branchCode: '001',
    fullName: 'Staff Dien Bien 1',
  },
  {
    email: 'staff.area2@anhchiem.org',
    role: 'BRANCH_MANAGER',
    branchCode: '002',
    fullName: 'Staff Dien Bien 2',
  },
  {
    email: 'staff.area3@anhchiem.org',
    role: 'BRANCH_MANAGER',
    branchCode: '003',
    fullName: 'Staff Dien Bien 3',
  },
  {
    email: 'staff.area4@anhchiem.org',
    role: 'BRANCH_MANAGER',
    branchCode: '004',
    fullName: 'Staff Muong Ang',
  },

  // new admins
  {
    email: 'hiennguyen@anhchiem.org',
    role: 'ADMIN',
    branchCode: null,
    fullName: 'Nguyễn Thị Hiên',
  },
  {
    email: 'vjet-nam@live.com',
    role: 'ADMIN',
    branchCode: null,
    fullName: 'Nguyễn Viết Nam',
  },
  {
    email: 'superadmin@anhchiem.org',
    role: 'SUPER_ADMIN',
    branchCode: null,
    fullName: 'ACE Super Admin',
  },
];

// ================== EVENTS: MỖI BRANCH 3 LOẠI LỊCH (TRONG THỜI GIAN TỚI) ================== //

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

const branches = ['001', '002', '003', '004'] as const;

const eventsSeed: EventSeed[] = branches.flatMap((branchCode, idx) => {
  // giãn lịch theo branch để không trùng quá nhiều
  const baseShift = idx * 2; // branch 001: +0 ngày, 002: +2, 003: +4, 004: +6

  const meetingStart = addDays(todayStart, 7 + baseShift);
  const fieldSchoolStart = addDays(todayStart, 14 + baseShift);
  const farmingTaskStart = addDays(todayStart, 21 + baseShift);

  return [
    {
      title: `Họp nhóm tín dụng (Branch ${branchCode})`,
      description:
        'Cuộc họp định kỳ để nhắc lịch trả nợ và cập nhật tình hình tiết kiệm.',
      eventType: 'MEETING',
      startDate: meetingStart,
      endDate: addHours(meetingStart, 2),
      scope: 'GLOBAL',
      branchCode,
      audienceType: 'BRANCH_ALL',
    },
    {
      title: `Tập huấn kỹ thuật canh tác `,
      description:
        'Buổi tập huấn về kỹ thuật canh tác và chăm sóc cây trồng tại địa phương.',
      eventType: 'FIELD_SCHOOL',
      startDate: fieldSchoolStart,
      endDate: addHours(fieldSchoolStart, 4),
      scope: 'GLOBAL',
      branchCode,
      audienceType: 'BRANCH_ALL',
    },
    {
      title: `Công việc đồng áng: chăm sóc cây trồng)`,
      description: 'Nhắc lịch công việc đồng áng theo khuyến cáo kỹ thuật.',
      eventType: 'FARMING_TASK',
      startDate: farmingTaskStart,
      endDate: addHours(farmingTaskStart, 3),
      scope: 'GLOBAL',
      branchCode,
      audienceType: 'BRANCH_ALL',
    },
  ];
});

// ================== MAIN SEED ================== //

async function main() {
  console.log('🔐 Tạo mật khẩu hash cho staff/admin...');
  const staffPasswordHash = await bcrypt.hash(STAFF_DEFAULT_PASSWORD, 10);

  console.log('👤 Upsert customers (CHỈ memberNo, không xóa dữ liệu cũ)...');
  for (const c of customersSeed) {
    await prisma.customer.upsert({
      where: { memberNo: c.memberNo },
      update: {
        // Không update gì ngoài việc đảm bảo record tồn tại
        // (tránh set null/undefined vào các field khác)
      },
      create: {
        memberNo: c.memberNo,
        membershipStartDate: null,
        isActive: true,
      },
    });
  }

  console.log('📅 Seed events (mỗi branch 3 loại)...');
  for (const e of eventsSeed) {
    const existing = await prisma.event.findFirst({
      where: {
        title: e.title,
        eventType: e.eventType,
        branchCode: e.branchCode ?? undefined,
      },
    });

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: e.title,
          description: e.description ?? undefined,
          eventType: e.eventType,
          startDate: e.startDate,
          endDate: e.endDate ?? undefined,
          scope: e.scope ?? 'GLOBAL',
          groupCode: e.groupCode ?? undefined,
          villageName: e.villageName ?? undefined,
          branchCode: e.branchCode ?? '001',
          audienceType: e.audienceType ?? 'BRANCH_ALL',
        },
      });
    } else {
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
          branchCode: e.branchCode ?? '001',
          audienceType: e.audienceType ?? 'BRANCH_ALL',
        },
      });
    }
  }

  console.log('👥 Seed staff users (giữ nguyên + thêm 2 admin)...');
  for (const staff of staffSeed) {
    await prisma.staffUser.upsert({
      where: { email: staff.email },
      update: {
        role: staff.role,
        branchCode: staff.branchCode ?? null,
        fullName: staff.fullName ?? null,
        isActive: true,
        // NOTE: không reset password khi upsert update
      },
      create: {
        email: staff.email,
        role: staff.role,
        branchCode: staff.branchCode ?? null,
        fullName: staff.fullName ?? null,
        isActive: true,
        passwordHash: staffPasswordHash,
      },
    });
  }

  console.log('✅ Seed xong! Staff/Admin password mặc định là:', STAFF_DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
