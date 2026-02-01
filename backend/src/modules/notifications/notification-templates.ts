import { NotificationTemplateResult, NotificationType } from './types';

const formatDate = (value?: string | Date | null) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatTime = (value?: string | Date | null) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const buildScheduleBody = (start?: string | Date | null, end?: string | Date | null) => {
  const startDate = formatDate(start);
  const startTime = formatTime(start);
  const endTime = formatTime(end);
  if (startDate && startTime) {
    return `Thoi gian: ${startDate} ${startTime}${endTime ? ` - ${endTime}` : ''}`;
  }
  return '';
};

type ScheduleTemplateInput = {
  scheduleId: string | number;
  title: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  locationName?: string | null;
  groupName?: string | null;
  branchCode?: string | null;
  groupCode?: string | null;
  reminderDays?: number;
  changedFieldsShort?: string | null;
  updatedAt?: string | Date | null;
};

export const scheduleTemplates = {
  created(input: ScheduleTemplateInput): NotificationTemplateResult {
    const timeText = buildScheduleBody(input.startDate, input.endDate);
    const locationText = input.locationName ? ` - Địa điểm: ${input.locationName}` : '';
    const groupText = input.groupName ? ` - Nhóm: ${input.groupName}` : '';
    return {
      type: 'SCHEDULE_CREATED',
      title: `Lịch mới: ${input.title}`,
      body: `${timeText}${locationText}${groupText}`.trim(),
      notificationKey: `SCHEDULE_CREATED:${input.scheduleId}`,
      data: {
        kind: 'SCHEDULE',
        scheduleId: Number(input.scheduleId),
        branchCode: input.branchCode,
        groupCode: input.groupCode,
        startAt: input.startDate ? new Date(input.startDate).toISOString() : null,
        endAt: input.endDate ? new Date(input.endDate).toISOString() : null,
      },
    };
  },

  updated(input: ScheduleTemplateInput): NotificationTemplateResult {
    const timeText = buildScheduleBody(input.startDate, input.endDate);
    const locationText = input.locationName ? ` - Địa điểm: ${input.locationName}` : '';
    const groupText = input.groupName ? ` - Nhóm: ${input.groupName}` : '';
    const changeText = input.changedFieldsShort ? `Nội dung thay đổi: ${input.changedFieldsShort}. ` : '';
    const updatedKey =
      input.updatedAt instanceof Date
        ? input.updatedAt.toISOString()
        : input.updatedAt ?? new Date().toISOString();
    return {
      type: 'SCHEDULE_UPDATED',
      title: `Cập nhật lịch: ${input.title}`,
      body: `${changeText}${timeText}${locationText}${groupText}`.trim(),
      notificationKey: `SCHEDULE_UPDATED:${input.scheduleId}:${updatedKey}`,
      data: {
        kind: 'SCHEDULE',
        scheduleId: Number(input.scheduleId),
        branchCode: input.branchCode,
        groupCode: input.groupCode,
        startAt: input.startDate ? new Date(input.startDate).toISOString() : null,
        endAt: input.endDate ? new Date(input.endDate).toISOString() : null,
      },
    };
  },

  canceled(input: ScheduleTemplateInput): NotificationTemplateResult {
    const timeText = buildScheduleBody(input.startDate, input.endDate);
    return {
      type: 'SCHEDULE_CANCELED',
      title: `Hủy lịch: ${input.title}`,
      body: `Lịch đã bị hủy. ${timeText}`.trim(),
      notificationKey: `SCHEDULE_CANCELED:${input.scheduleId}`,
      data: {
        kind: 'SCHEDULE',
        scheduleId: Number(input.scheduleId),
        branchCode: input.branchCode,
        groupCode: input.groupCode,
        startAt: input.startDate ? new Date(input.startDate).toISOString() : null,
        endAt: input.endDate ? new Date(input.endDate).toISOString() : null,
      },
    };
  },

  reminder(input: ScheduleTemplateInput): NotificationTemplateResult {
    const timeText = buildScheduleBody(input.startDate, input.endDate);
    const days = input.reminderDays ?? 0;
    return {
      type: 'SCHEDULE_REMINDER',
      title: `Nhắc lịch: ${input.title}`,
      body: `Còn ${days} ngày nữa tới lịch. ${timeText}`.trim(),
      notificationKey: `SCHEDULE_REMINDER:${input.scheduleId}:${days}`,
      data: {
        kind: 'SCHEDULE',
        scheduleId: Number(input.scheduleId),
        branchCode: input.branchCode,
        groupCode: input.groupCode,
        startAt: input.startDate ? new Date(input.startDate).toISOString() : null,
        endAt: input.endDate ? new Date(input.endDate).toISOString() : null,
        reminderDays: days,
      },
    };
  },
};

type LoanTemplateInput = {
  loanId?: string | number | null;
  memberNo?: string | null;
  dueDate?: string | Date | null;
  reminderDays?: number;
};

export const loanTemplates = {
  reminder(input: LoanTemplateInput): NotificationTemplateResult {
    const days = input.reminderDays ?? 0;
    const dueDateText = formatDate(input.dueDate);
    return {
      type: 'LOAN_REMINDER',
      title: 'Nhắc khoản vay',
      body: `Còn ${days} ngày nữa đến hạn kỳ thanh toán. Vui lòng kiểm tra trong mục Khoản vay.${dueDateText ? ` Hạn: ${dueDateText}` : ''}`,
      notificationKey: `LOAN_REMINDER:${input.loanId ?? input.memberNo}:${input.dueDate ? new Date(input.dueDate).toISOString() : 'unknown'}:${days}`,
      data: {
        kind: 'LOAN',
        loanId: input.loanId,
        memberNo: input.memberNo,
        dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null,
        reminderDays: days,
      },
    };
  },
};

export type TemplateBuilder = {
  type: NotificationType;
  build: (input: any) => NotificationTemplateResult;
};
