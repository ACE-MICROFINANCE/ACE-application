/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const STAFF_DEFAULT_PASSWORD = '123456';

// ================== TYPES ================== //

type CustomerSeed = { memberNo: string };

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
  role: 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM' | 'SSO';
  branchCode?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
};

type BranchGroupMapRecord = {
  Branch: string;
  GroupCode: string;
  GroupName: string;
};

// ================== DATA: CUSTOMERS ================== //

const customersSeed: CustomerSeed[] = [
  { memberNo: '40003498' }, { memberNo: '40001839' }, { memberNo: '40005198' },
  { memberNo: '40000361' }, { memberNo: '10005387' }, { memberNo: '10000428' },
  { memberNo: '10009908' }, { memberNo: '10001231' }, { memberNo: '20006096' },
  { memberNo: '20009471' }, { memberNo: '20011641' }, { memberNo: '20006210' },
  { memberNo: '20003072' }, { memberNo: '20003773' }, { memberNo: '20004104' },
  { memberNo: '20009130' }, { memberNo: '10011765' },
];

// ================== DATA: STAFF ================== //

const staffSeed: StaffSeed[] = [
  { email: 'admin@anhchiem.org', role: 'ADMIN', branchCode: null, fullName: 'ACE Admin' },
  { email: 'hiennguyen@anhchiem.org', role: 'ADMIN', branchCode: null, fullName: 'Nguyễn Thị Hiên' },
  { email: 'vjet-nam@live.com', role: 'ADMIN', branchCode: null, fullName: 'Nguyễn Viết Nam' },
  { email: 'superadmin@anhchiem.org', role: 'SUPER_ADMIN', branchCode: null, fullName: 'ACE Super Admin' },
  
// BA
{ email: 'ba.area1@anhchiem.org', role: 'BA', branchCode: '001', fullName: 'BA Dien Bien 1' },
{ email: 'ba.area2@anhchiem.org', role: 'BA', branchCode: '002', fullName: 'BA Dien Bien 2' },
{ email: 'ba.area3@anhchiem.org', role: 'BA', branchCode: '003', fullName: 'BA Dien Bien 3' },
{ email: 'ba.area4@anhchiem.org', role: 'BA', branchCode: '004', fullName: 'BA Muong Ang' },

// BM
{ email: 'staff.area1@anhchiem.org', role: 'BM', branchCode: '001', fullName: 'BM Dien Bien 1' },
{ email: 'staff.area2@anhchiem.org', role: 'BM', branchCode: '002', fullName: 'BM Dien Bien 2' },
{ email: 'staff.area3@anhchiem.org', role: 'BM', branchCode: '003', fullName: 'BM Dien Bien 3' },
{ email: 'staff.area4@anhchiem.org', role: 'BM', branchCode: '004', fullName: 'BM Muong Ang' },

// SSO/CCO
{ email: 'thuylo.db1@anhchiem.org', role: 'SSO', branchCode: '001', phoneNumber: '0981100060', fullName: 'Lò Thị Thủy' },
{ email: 'huongtran.db1@anhchiem.org', role: 'SSO', branchCode: '001', phoneNumber: '0981100061', fullName: 'Trần Thị Lan Hương' },
{ email: 'chunglo.db1@anhchiem.org', role: 'SSO', branchCode: '001', phoneNumber: '0981100062', fullName: 'Lò Thị Chung' },
  { email: 'giangbui.db2@anhchiem.org', role: 'SSO', branchCode: '002', phoneNumber: '0981016109', fullName: 'Bùi Thị Giang' },
  { email: 'duongca.db2@anhchiem.org', role: 'SSO', branchCode: '002', phoneNumber: '0981107211', fullName: 'Cà Thị Dường' },
  { email: 'thuyquang.db2@anhchiem.org', role: 'SSO', branchCode: '002', phoneNumber: '0981107210', fullName: 'Quàng Thị Bích Thủy' },
  { email: 'thaovi.db3@anhchiem.org', role: 'SSO', branchCode: '003', phoneNumber: '0981100065', fullName: 'Vì Thị Thảo' },
  { email: 'tuongtong.db3@anhchiem.org', role: 'SSO', branchCode: '003', phoneNumber: '0981100070', fullName: 'Tòng Thị Tương' },
  { email: 'phuonglu.ma@anhchiem.org', role: 'SSO', branchCode: '004', phoneNumber: '0981100072', fullName: 'Lù Thị Phương' },
  { email: 'thuylo.ma@anhchiem.org', role: 'SSO', branchCode: '004', phoneNumber: '0981100075', fullName: 'Lò Văn Thủy' },
  { email: 'thaolo.ma@anhchiem.org', role: 'SSO', branchCode: '004', phoneNumber: '0981100073', fullName: 'Lò Thị Thao' },
  { email: 'damca.ma@anhchiem.org', role: 'SSO', branchCode: '004', phoneNumber: '0981100076', fullName: 'Cà Thị Đảm' },
];

// ================== DATA: EVENTS ================== //

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);
const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

const eventsSeed: EventSeed[] = ['001', '002', '003', '004'].flatMap((branchCode, idx) => {
  const baseShift = idx * 2;
  return [
    { title: `Họp nhóm tín dụng (Branch ${branchCode})`, eventType: 'MEETING', startDate: addDays(todayStart, 7 + baseShift), endDate: addHours(addDays(todayStart, 7 + baseShift), 2), branchCode, audienceType: 'BRANCH_ALL' },
    { title: `Tập huấn kỹ thuật canh tác (Branch ${branchCode})`, eventType: 'FIELD_SCHOOL', startDate: addDays(todayStart, 14 + baseShift), endDate: addHours(addDays(todayStart, 14 + baseShift), 4), branchCode, audienceType: 'BRANCH_ALL' },
    { title: `Công việc đồng áng (Branch ${branchCode})`, eventType: 'FARMING_TASK', startDate: addDays(todayStart, 21 + baseShift), endDate: addHours(addDays(todayStart, 21 + baseShift), 3), branchCode, audienceType: 'BRANCH_ALL' },
  ];
});

// ================== LOGIC: LINK GROUPS TO SSO ================== //

async function linkGroupsToSso() {
  console.log('🔗 Đang ánh xạ Staff phụ trách (SSO) cho từng Group...');
  const ssoMapping = [
    { email: 'thuylo.db1@anhchiem.org', patterns: ['TA-NOONG UNG 1', 'TA-TEN LUONG 2', 'TX-D15 PA CAU', 'TA-CHIENG CHUNG 1', 'TA-SANG2', 'TA-DOI CAO', 'TA-TEN LUONG(TL1A)', 'TX-D6-CE CHAN NUOI', 'TX-D4B BAN TEN', 'TX-THON C17', 'TA-CO CHAI(BCC1)', 'TX-DOI 13 - ACE', 'TX-D14 HI VONG', 'TA-PHIENG BAN1', 'TX- ĐOI 3 HOA HONG', 'TX-D17 TEN BUA'] },
    { email: 'huongtran.db1@anhchiem.org', patterns: ['TN - PHIENG BAN', 'TN - CO PAO', 'TL- BAN HUA PE 1', 'TL- BAN PE NOI(D10B1)', 'TN - CO KE', 'TL- BAN PE (D8A)', 'TL- BAN LO(D6A1)', 'TL- BAN BANH(D12A1)', 'TN - ON', 'TL- BAN NGUU', 'TL- BAN LONG TONG', 'TL- BAN NOONG', 'TN - HA- KHOAI LANG'] },
    { email: 'chunglo.db1@anhchiem.org', patterns: ['TY-DOI 6- H1', 'TY-DOI 3- PP1', 'TY-DOI 13- NT2', 'TY-DOI 1A- NV-D1B2', 'TY-DOI 11- BP1', 'TY-YEN TRUONG', 'TY-BANH 1', 'TC - NA KHUA', 'TY-BOI 2', 'TY-DOI 14_CD2', 'TY-DOI 1A- NV-D1A1', 'TY-DOI 13- NT1', 'TY-PHU YEN', 'TC- PA LECH', 'TY-DOI 6- H2'] },
    { email: 'giangbui.db2@anhchiem.org', patterns: ['NN-NA NGAM 1', 'NT- NA TAU 1', 'NT-CANG 1', 'NT-HONG LIU', 'NT-LAN YEN', 'NT-NA CAI 1', 'NT-NA LAO', 'NT-NA LUONG 2', 'NT-NA LUONG 3', 'NT-NA TAU 1+2', 'NT-NA TAU 5', 'NT-TA CANG 1', 'NT-TA CANG 3', 'NT-XOM 2', 'NT-XOM1'] },
    { email: 'duongca.db2@anhchiem.org', patterns: ['MP-BANH', 'MP-CHE CAN 1', 'MP-CO KHO', 'MP-TAN BINH', 'PK - KEO A', 'PK- PA TRA', 'PK- SANG', 'PK-CO THON', 'PK-DONG MET 1', 'PK-HA', 'PK-KEO', 'PK-NGUU 1', 'PK-PU SUNG', 'PK-TEN', 'PK-VANG 1', 'PK-VANG 2', 'PK-XOM 2', 'PK-XOM1A'] },
    { email: 'thuyquang.db2@anhchiem.org', patterns: ['MP-BUA', 'MP-CANG 1', 'MP-CANG 3', 'MP-CO MAN 1', 'MP-CO MAN 2', 'MP-KHA', 'MP-PHANG1', 'MP-YEN 3', 'NN- TAU PUNG 1', 'NN-HUOI HE', 'NN-NA NGAM 2', 'NN-NA NGAM 2A', 'NN-NA NHAN 1', 'NN-NA NOI 1', 'NN-TAU PUNG'] },
    { email: 'thaovi.db3@anhchiem.org', patterns: ['NH- NOONG HET A', 'NH-BAN LE', 'NH-BAN PHU', 'NH-BONG A', 'NH-BONG B', 'NH-HOANG CONG CHAT', 'NH-HUOI LE', 'NH-PHIENG CA', 'NH-PUNG KHAU', 'NL-BAN CO LUONG', 'NL-BAN ON B', 'NL-DOI 06 -THANH XUAN', 'NL-DOI 07 - NA MEN', 'NL-DOI 08 - LIENG', 'NL-DOI 09B - BAN LUN', 'NL-DOI 15 - NOONG LUONG', 'NL-DOI 16 - PHIENG QUAI', 'NL-DOI 17- U VA', 'NL-DOI 1A -BAN NOM', 'NL-DOI 21 -BAN ON A', 'SM-LOONG BON', 'SM-LOONG DOM', 'SM-LOONG QUAN'] },
    { email: 'tuongtong.db3@anhchiem.org', patterns: ['HM - BAN HE MUONG', 'HM - CONG BINH', 'HM - HE 2', 'HM - LONG SOT', 'HM - NA DON', 'HM -TA LET', 'NN- NA SANG 1B', 'NN-NA SANG 1A', 'NN-PA BONG B', 'NN-PA BONG DK', 'NN-PA NGAM 1', 'NN-PA NGAM 2A', 'NN-PA NGAM 2B', 'NN-PHU NGAM', 'NN-TEN NUA A', 'NN-TEN NUA B', 'SM-CHIENG XOM', 'SM-YEN BINH', 'SM-YEN CANG 2'] },
    { email: 'phuonglu.ma@anhchiem.org', patterns: ['AN-CANG 3', 'AN-CU', 'AN-HAN 2', 'AN-LE', 'AN-MOI', 'AN-CO HAM 1', 'AN-BO MAY', 'AN-CANG 1', 'AN-NA LUONG', 'AN-CO SANG 2', 'AN-TIN TOC 2'] },
    { email: 'thuylo.ma@anhchiem.org', patterns: ['BL-XUAN TRE 1', 'BL-XUAN TRE 2', 'BL-BUNG 2', 'BL-XUAN MON', 'BL-XUAN TRE 3', 'BL-HONG SOT BL', 'BL-PA TONG', 'BL-HUOI CAM 2', 'XL-CO HON 1', 'BL-QUYET TIEN 1', 'XL-MON HA', 'XL-KEOXL', 'XL-PHAY', 'XL-KHEN'] },
    { email: 'thaolo.ma@anhchiem.org', patterns: ['NL-TEN 1', 'AC-HONG SOT', 'AC-GIANG', 'NL-LICH NUA 1', 'AC-CO EN', 'NL-LICH CANG 1', 'NL-IT NOI 1', 'AT-HUOI HOM', 'AT-BUA 2', 'AT-CHA CUONG', 'AT-TO CUONG', 'AT-PA CHA'] },
    { email: 'damca.ma@anhchiem.org', patterns: ['AC-NOONG HANG', 'AC-HUOI SUA 2', 'AC-HUOI SUA', 'AC-KEO 1', 'AC-COI', 'AC-BANH 1', 'AC-SANG', 'AC-HUA NGUONG 1', 'AC-BANH 2', 'AC-HUA NA', 'AC-CO SAN', 'AC-KEO 2', 'AC-HUA NGUONG 2'] },
  ];

  for (const item of ssoMapping) {
    const staff = await prisma.staffUser.findUnique({ where: { email: item.email } });
    if (!staff) continue;
    for (const p of item.patterns) {
      await prisma.group.updateMany({
        where: { groupName: { contains: p }, branchCode: staff.branchCode || undefined },
        data: { ssoId: staff.id },
      });
    }
  }
}

// ================== MAIN SEED ================== //

async function main() {
  const staffHash = await bcrypt.hash(STAFF_DEFAULT_PASSWORD, 10);

  console.log('👤 Seed Customers...');
  for (const c of customersSeed) {
    await prisma.customer.upsert({ where: { memberNo: c.memberNo }, update: {}, create: { memberNo: c.memberNo, isActive: true } });
  }

  console.log('👥 Seed Staff Users...');
  for (const s of staffSeed) {
    await prisma.staffUser.upsert({
      where: { email: s.email },
      update: { role: s.role, branchCode: s.branchCode ?? null, fullName: s.fullName ?? null, phoneNumber: s.phoneNumber ?? null },
      create: { email: s.email, role: s.role, branchCode: s.branchCode ?? null, fullName: s.fullName ?? null, phoneNumber: s.phoneNumber ?? null, passwordHash: staffHash },
    });
  }

  console.log('📅 Seed Events...');
  for (const e of eventsSeed) {
    const data = {
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
    };
    await prisma.event.create({ data });
  }

  await linkGroupsToSso();
  console.log('✅ Seed hoàn tất!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
