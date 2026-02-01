import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDays, addMinutes, differenceInMinutes, isBefore } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { getNextMeetingStart } from './utils/meeting-recurrence';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationToSend } from '../notifications/types';
import { scheduleTemplates } from '../notifications/notification-templates';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type StaffContext = {
  userId: string;
  branchCode?: string | null;
  role?: string | null;
};

type ActorContext = {
  userId: string;
  actorKind?: 'CUSTOMER' | 'STAFF' | string; // CHANGED: support schedule by actorKind
  branchCode?: string | null;
  groupCode?: string | null;
  role?: 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM' | string | null; // CHANGED: allow staff roles
};

type StaffEventFilters = {
  from?: string;
  to?: string;
  eventType?: string;
};

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private daysUntil(date: Date) {
    const today = this.startOfToday();
    return Math.ceil((date.getTime() - today.getTime()) / MS_PER_DAY);
  }

  private ensureBranchCode(staff: StaffContext) {
    if (!staff?.branchCode) {
      throw new BadRequestException('Branch code is required'); // CHANGED: enforce staff branch
    }
    return staff.branchCode;
  }

  private parseIsoDate(input: string) {
    const date = new Date(input);
    if (Number.isNaN(date.valueOf())) {
      throw new BadRequestException('Invalid date'); // CHANGED: validate date input
    }
    return date;
  }

  private mapTargetGroups(groups: Array<{ groupCode: string; groupName: string | null }>) {
    return groups.map((group) => ({
      groupCode: group.groupCode,
      groupName: group.groupName ?? null,
    }));
  }

  private normalizeTarget(event: any) {
    // audienceType: BRANCH_ALL | GROUPS
    if (event.audienceType === 'GROUPS') {
      const groups = this.mapTargetGroups(event.targetGroups ?? []);
      const names = groups.map((g) => g.groupName || g.groupCode).filter(Boolean);
      let targetText = 'Nhóm';
      if (names.length > 0) {
        const shown = names.slice(0, 2).join(', ');
        const extra = names.length > 2 ? ` +${names.length - 2}` : '';
        targetText = `Nhóm: ${shown}${extra}`;
      }
      return {
        targetType: 'GROUPS' as const,
        groups,
        targetText,
      };
    }

    const branchCode = event.branchCode ?? '---';
    const branchName = event.branchName ?? '';
    const targetText = branchName
      ? `Toàn chi nhánh: ${branchCode}-${branchName}`
      : `Toàn chi nhánh: ${branchCode}`;

    return {
      targetType: 'BRANCH_ALL' as const,
      branchCode,
      branchName: branchName || null,
      targetText,
    };
  }

  private computeDisplayStatus(event: any, now: Date = new Date()) {
    const { startDate, endDate } = this.getEffectiveEventDates(event, now);
    const effectiveEnd = endDate ?? startDate;
    const isExpired = isBefore(effectiveEnd, now);

    if (event.hidden) return 'HIDDEN';
    if (isExpired) return 'EXPIRED';
    if (event.status === 'UPDATED') return 'UPDATED';
    if (event.status === 'REJECTED') return 'REJECTED';
    if (event.status === 'APPROVED') return 'APPROVED';
    return 'PENDING_APPROVAL';
  }

  private getEffectiveEventDates(
    event: { eventType: string; startDate: Date; endDate?: Date | null; durationMinutes?: number | null },
    now: Date = new Date(),
  ) {
    const effectiveStart =
      event.eventType === 'MEETING'
        ? getNextMeetingStart(event.startDate, now) // CHANGED: normalize meeting start by 28-day recurrence
        : event.startDate;

    const durationMinutes = event.durationMinutes ?? null;
    let effectiveEnd = event.endDate ?? null;

    if (durationMinutes !== null) {
      effectiveEnd = addMinutes(effectiveStart, durationMinutes); // CHANGED: recompute endDate from duration
    } else if (effectiveEnd) {
      const diffMinutes = differenceInMinutes(effectiveEnd, event.startDate);
      if (diffMinutes > 0) {
        effectiveEnd = addMinutes(effectiveStart, diffMinutes); // CHANGED: shift endDate by same duration
      }
    }

    return { startDate: effectiveStart, endDate: effectiveEnd };
  }

  private mapStaffEvent(event: any, now: Date = new Date()) {
    const effectiveDates = this.getEffectiveEventDates(event, now); // normalize meeting dates
    const displayStatus = this.computeDisplayStatus(event, now);
    const isExpired = displayStatus === 'EXPIRED';
    return {
      id: Number(event.id),
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      startDate: effectiveDates.startDate,
      endDate: effectiveDates.endDate,
      durationMinutes: event.durationMinutes,
      locationName: event.locationName,
      audienceType: event.audienceType,
      branchCode: event.branchCode,
      status: event.status,
      hidden: event.hidden,
      approvedAt: event.approvedAt,
      rejectedAt: event.rejectedAt,
      updatedAt: event.updatedAt ?? null,
      displayStatus,
      isExpired,
      target: this.normalizeTarget(event),
      targetGroups: this.mapTargetGroups(event.targetGroups ?? []),
      daysUntilEvent: this.daysUntil(effectiveDates.startDate),
      createdByStaffId: event.createdByStaffId ? Number(event.createdByStaffId) : null,
    };
  }

  async createStaffEvent(staff: StaffContext, dto: CreateEventDto) {
    const branchCode = this.ensureBranchCode(staff);
    if (dto.audienceType === 'GROUPS' && (!dto.targetGroups || dto.targetGroups.length === 0)) {
      throw new BadRequestException('Target groups are required'); // CHANGED: validate groups
    }

    const startDate = this.parseIsoDate(dto.startDate);
    const durationMinutes = dto.durationMinutes ?? null;
    const endDate = durationMinutes ? addMinutes(startDate, durationMinutes) : null;

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          title: dto.title,
          description: dto.description ?? null,
          eventType: dto.eventType,
          startDate,
          endDate,
          durationMinutes,
          locationName: dto.locationName ?? null,
          audienceType: dto.audienceType,
          branchCode, // CHANGED: branch from staff token
          createdByStaffId: BigInt(staff.userId), // CHANGED: staff creator
          status: 'PENDING_APPROVAL',
          hidden: false,
          approvedAt: null,
          rejectedAt: null,
        },
      });

      if (dto.audienceType === 'GROUPS' && dto.targetGroups?.length) {
        await tx.eventTargetGroup.createMany({
          data: dto.targetGroups.map((group) => ({
            eventId: created.id,
            groupCode: group.groupCode,
            groupName: group.groupName ?? null,
          })),
          // CHANGED: skipDuplicates not supported for SQL Server
        });
      }

      return created;
    });

    const createdEvent = await this.prisma.event.findUnique({
      where: { id: event.id },
      include: { targetGroups: true },
    });

    if (!createdEvent) {
      throw new NotFoundException('Event not found');
    }

    const mapped = this.mapStaffEvent(createdEvent);
    const managers = await this.getBranchManagers(branchCode);
    await this.dispatchScheduleNotification(scheduleTemplates.created, mapped, {
      recipients: managers.map((m) => ({ actorKind: 'STAFF' as const, actorId: m.id.toString() })),
    });
    return mapped;
  }

  async listStaffEvents(staff: StaffContext, filters: StaffEventFilters) {
    const branchCode = this.ensureBranchCode(staff);
    const where: any = { branchCode };

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.from || filters.to) {
      where.startDate = {};
      if (filters.from) {
        where.startDate.gte = this.parseIsoDate(filters.from);
      }
      if (filters.to) {
        where.startDate.lte = this.parseIsoDate(filters.to);
      }
    }

    const events = await this.prisma.event.findMany({
      where,
      include: { targetGroups: true },
      orderBy: { startDate: 'asc' }, // initial sort; will re-sort with status priority
    });

    const now = new Date();
    const mapped = events.map((event) => this.mapStaffEvent(event, now)); // CHANGED: normalize meeting dates

    const priority: Record<string, number> = {
      PENDING_APPROVAL: 0,
      APPROVED: 1,
      UPDATED: 2,
      HIDDEN: 3,
      EXPIRED: 4,
      REJECTED: 5,
    };

    const getEffectiveStatus = (ev: any) => {
      const raw = ev.displayStatus || ev.status || 'PENDING_APPROVAL';
      if (staff.role === 'BM' && ev.hidden === true) return 'HIDDEN';
      if (staff.role === 'BA' && raw === 'UPDATED') return 'PENDING_APPROVAL';
      return raw;
    };

    // Role-based filtering
    let filtered = mapped;
    if (staff.role === 'BA') {
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = mapped.filter((ev) => {
        const eff = getEffectiveStatus(ev);
        if (ev.hidden) return false;
        if (eff === 'HIDDEN' || eff === 'EXPIRED') return false;
        if (eff === 'REJECTED') {
          if (!ev.rejectedAt) return false;
          return ev.rejectedAt >= cutoff;
        }
        return (
          eff === 'PENDING_APPROVAL' ||
          ev.status === 'PENDING' || // legacy fallback
          eff === 'APPROVED' ||
          eff === 'UPDATED'
        );
      });
    }

    // Sorting: by status priority (role-aware), then startDate asc, then id asc
    return filtered.sort((a, b) => {
      const sa = getEffectiveStatus(a);
      const sb = getEffectiveStatus(b);
      const pa = priority[sa] ?? 99;
      const pb = priority[sb] ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.startDate.getTime();
      const db = b.startDate.getTime();
      if (da !== db) return da - db;
      return (a.id ?? 0) - (b.id ?? 0);
    });
  }

  private async getBranchManagers(branchCode: string) {
    return this.prisma.staffUser.findMany({
      where: {
        isActive: true,
        branchCode,
        role: { in: ['BM', 'BRANCH_MANAGER', 'Branch Manager'] },
      },
      select: { id: true },
    });
  }

  private async resolveRecipients(
    event: any,
    opts?: { includeCustomers?: boolean; includeCreator?: boolean },
  ): Promise<Array<{ actorKind: 'CUSTOMER' | 'STAFF'; actorId: string }>> {
    const recipients: Array<{ actorKind: 'CUSTOMER' | 'STAFF'; actorId: string }> = [];
    const includeCustomers = opts?.includeCustomers !== false;
    const includeCreator = opts?.includeCreator !== false;

    const branchCode = event.branchCode;
    const audienceType = event.audienceType;
    const targetGroupCodes = (event.targetGroups ?? [])
      .map((g: { groupCode?: string | null }) => g.groupCode)
      .filter(Boolean) as string[];

    if (includeCustomers && branchCode) {
      const customerWhere: any = { branchCode };
      if (audienceType === 'GROUPS' && targetGroupCodes.length) {
        customerWhere.groupCode = { in: targetGroupCodes };
      }
      const customers = await this.prisma.customer.findMany({
        where: customerWhere,
        select: { id: true },
      });
      recipients.push(
        ...customers.map((c) => ({
          actorKind: 'CUSTOMER' as const,
          actorId: c.id.toString(),
        })),
      );
    }

    if (includeCreator && event.createdByStaffId) {
      recipients.push({
        actorKind: 'STAFF',
        actorId: event.createdByStaffId.toString(),
      });
    }

    return recipients;
  }

  private getChangedFieldsShort(
    existing: any,
    next: { title?: string; startDate?: Date; endDate?: Date | null; locationName?: string | null; description?: string | null },
  ) {
    const changes: string[] = [];
    if (next.title && next.title !== existing.title) changes.push('tieu de');
    if (next.startDate && next.startDate.getTime() !== existing.startDate.getTime()) changes.push('thoi gian');
    if (
      (next.endDate && existing.endDate && next.endDate.getTime() !== existing.endDate.getTime()) ||
      (next.endDate && !existing.endDate) ||
      (!next.endDate && existing.endDate)
    ) {
      changes.push('thoi gian');
    }
    if (next.locationName !== undefined && next.locationName !== existing.locationName) changes.push('dia diem');
    if (next.description !== undefined && next.description !== existing.description) changes.push('noi dung');
    return changes.join(', ');
  }

  private async dispatchScheduleNotification(
    templateBuilder: (input: any) => { type: any; title: string; body: string; notificationKey: string; data: any },
    event: any,
    extra?: Partial<{ reminderDays: number; changedFieldsShort: string; recipients?: Array<{ actorKind: 'CUSTOMER' | 'STAFF'; actorId: string }> }>,
  ) {
    const recipients = extra?.recipients ?? (await this.resolveRecipients(event));
    if (!recipients.length) return;
    const template = templateBuilder({
      scheduleId: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      locationName: event.locationName,
      groupName: event.targetGroups?.[0]?.groupName,
      branchCode: event.branchCode,
      groupCode: event.targetGroups?.[0]?.groupCode,
      reminderDays: extra?.reminderDays,
      changedFieldsShort: extra?.changedFieldsShort,
      updatedAt: event.updatedAt ?? new Date(),
    });

    const payloads: NotificationToSend[] = recipients.map((rec) => ({
      recipientActorKind: rec.actorKind,
      recipientId: rec.actorId,
      type: template.type,
      title: template.title,
      body: template.body,
      data: template.data,
      notificationKey: `${template.notificationKey}:to:${rec.actorKind}:${rec.actorId}`,
    }));

    await this.notificationsService.persistAndDispatch(payloads);
  }

  async updateStaffEvent(staff: StaffContext, id: string, dto: UpdateEventDto) {
    const branchCode = this.ensureBranchCode(staff);
    const eventId = BigInt(id);
    const existing = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { targetGroups: true },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.branchCode !== branchCode) {
      throw new ForbiddenException('Event does not belong to your branch'); // CHANGED: branch guard
    }
    if (staff.role === 'BA' && existing.hidden) {
      throw new ForbiddenException('Cannot update hidden event');
    }

    const nextAudienceType =
      dto.audienceType ?? (dto.targetGroups ? 'GROUPS' : existing.audienceType); // CHANGED: allow groups update
    const audienceTypeUpdate =
      dto.audienceType ?? (dto.targetGroups ? 'GROUPS' : undefined); // CHANGED: set GROUPS when targetGroups provided
    if (dto.audienceType === 'GROUPS' && (!dto.targetGroups || dto.targetGroups.length === 0)) {
      throw new BadRequestException('Target groups are required'); // CHANGED: validate groups
    }

    const updateData: any = {
      title: dto.title ?? undefined,
      description: dto.description ?? undefined,
      eventType: dto.eventType ?? undefined,
      locationName: dto.locationName ?? undefined,
      audienceType: audienceTypeUpdate,
      // status/approval fields will be set below based on role
    };

    const startDate = dto.startDate ? this.parseIsoDate(dto.startDate) : existing.startDate;
    if (dto.startDate) {
      updateData.startDate = startDate;
    }

    const durationMinutes =
      dto.durationMinutes !== undefined ? dto.durationMinutes : existing.durationMinutes ?? null;
    if (dto.durationMinutes !== undefined) {
      updateData.durationMinutes = durationMinutes;
    }

    if (dto.startDate || dto.durationMinutes !== undefined) {
      updateData.endDate = durationMinutes ? addMinutes(startDate, durationMinutes) : null;
    }

    const shouldUpdateTargets = dto.audienceType !== undefined || dto.targetGroups !== undefined;

    // BA updates: manage status transitions
    if (staff.role === 'BA') {
      if (existing.hidden) {
        throw new ForbiddenException('Cannot update hidden event');
      }
      if (existing.status === 'APPROVED') {
        updateData.status = 'UPDATED';
        updateData.approvedAt = null;
        updateData.rejectedAt = null;
      } else if (existing.status === 'PENDING_APPROVAL' || existing.status === 'UPDATED') {
        updateData.status = existing.status; // keep as is (PENDING_APPROVAL or UPDATED)
        updateData.rejectedAt = null; // allow resubmission
      } else {
        // for other statuses (e.g., REJECTED) default to PENDING_APPROVAL on edit
        updateData.status = 'PENDING_APPROVAL';
        updateData.approvedAt = null;
        updateData.rejectedAt = null;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.update({
        where: { id: eventId },
        data: updateData,
      });

      if (shouldUpdateTargets) {
        await tx.eventTargetGroup.deleteMany({ where: { eventId } });
        if (nextAudienceType === 'GROUPS' && dto.targetGroups?.length) {
          await tx.eventTargetGroup.createMany({
            data: dto.targetGroups.map((group) => ({
              eventId,
              groupCode: group.groupCode,
              groupName: group.groupName ?? null,
            })),
            // CHANGED: skipDuplicates not supported for SQL Server
          });
        }
      }

      return event;
    });

    const refreshed = await this.prisma.event.findUnique({
      where: { id: updated.id },
      include: { targetGroups: true },
    });

    if (!refreshed) {
      throw new NotFoundException('Event not found');
    }

    const mapped = this.mapStaffEvent(refreshed);
    const changedFieldsShort = this.getChangedFieldsShort(existing, {
      title: mapped.title,
      startDate: mapped.startDate,
      endDate: mapped.endDate,
      locationName: mapped.locationName,
      description: mapped.description,
    });
    // Nếu BA cập nhật sau approved -> gửi BM, không gửi customer
    if (staff.role === 'BA') {
      const managers = await this.getBranchManagers(branchCode);
      await this.dispatchScheduleNotification(scheduleTemplates.updated, mapped, {
        changedFieldsShort,
        recipients: managers.map((m) => ({ actorKind: 'STAFF' as const, actorId: m.id.toString() })),
      });
    } else {
      await this.dispatchScheduleNotification(scheduleTemplates.updated, mapped, { changedFieldsShort });
    }
    return mapped;
  }

  async approveEvent(staff: StaffContext, id: string) {
    const branchCode = this.ensureBranchCode(staff);
    const eventId = BigInt(id);
    const existing = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.branchCode !== branchCode) throw new ForbiddenException('Event does not belong to your branch');

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: existing.status === 'UPDATED' ? 'UPDATED' : 'APPROVED',
        approvedAt: new Date(),
        rejectedAt: null,
        hidden: false,
      },
      include: { targetGroups: true },
    });
    const mapped = this.mapStaffEvent(updated);
    // gửi BA creator + customers (sau khi duyệt)
    const recipientsCreator =
      updated.createdByStaffId != null
        ? [{ actorKind: 'STAFF' as const, actorId: updated.createdByStaffId.toString() }]
        : [];
    const customerRecipients = await this.resolveRecipients(mapped, { includeCustomers: true, includeCreator: false });
    await this.dispatchScheduleNotification(scheduleTemplates.updated, mapped, {
      changedFieldsShort: 'Đã được duyệt',
      recipients: [...recipientsCreator, ...customerRecipients],
    });
    return mapped;
  }

  async rejectEvent(staff: StaffContext, id: string) {
    const branchCode = this.ensureBranchCode(staff);
    const eventId = BigInt(id);
    const existing = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.branchCode !== branchCode) throw new ForbiddenException('Event does not belong to your branch');

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        approvedAt: null,
        hidden: false,
      },
      include: { targetGroups: true },
    });
    const mapped = this.mapStaffEvent(updated);
    // gửi BA creator, không gửi customer
    if (updated.createdByStaffId) {
      await this.dispatchScheduleNotification(scheduleTemplates.updated, mapped, {
        changedFieldsShort: 'Đã bị từ chối',
        recipients: [{ actorKind: 'STAFF', actorId: updated.createdByStaffId.toString() }],
      });
    }
    return mapped;
  }

  async hideEvent(staff: StaffContext, id: string, hidden: boolean) {
    const branchCode = this.ensureBranchCode(staff);
    const eventId = BigInt(id);
    const existing = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) throw new NotFoundException('Event not found');
    if (existing.branchCode !== branchCode) throw new ForbiddenException('Event does not belong to your branch');

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { hidden },
      include: { targetGroups: true },
    });
    return this.mapStaffEvent(updated);
  }

  async deleteStaffEvent(staff: StaffContext, id: string) {
    // Soft-hide instead of hard delete; BM only should call this (controller already restricts)
    const branchCode = this.ensureBranchCode(staff);
    const eventId = BigInt(id);
    const existing = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { targetGroups: true },
    });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.branchCode !== branchCode) {
      throw new ForbiddenException('Event does not belong to your branch'); // CHANGED: branch guard
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: { hidden: true },
      include: { targetGroups: true },
    });
    return this.mapStaffEvent(updated);
  }

  async getCustomerEvents(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (!customer.branchCode) {
      return [];
    }

    const orFilters: any[] = [{ audienceType: 'BRANCH_ALL' }];
    if (customer.groupCode) {
      orFilters.push({
        audienceType: 'GROUPS',
        targetGroups: { some: { groupCode: customer.groupCode } },
      });
    }

    const events = await this.prisma.event.findMany({
      where: {
        branchCode: customer.branchCode,
        OR: orFilters,
        AND: [
          {
            OR: [
              { startDate: { gte: this.startOfToday() } },
              { eventType: 'MEETING' }, // CHANGED: always include meeting for next occurrence
            ],
          },
        ],
      },
      orderBy: { startDate: 'asc' },
    });

    const now = new Date();
    const mapped = events.map((event) => {
      const effectiveDates = this.getEffectiveEventDates(event, now); // CHANGED: normalize meeting dates
      return {
        id: Number(event.id),
        title: event.title,
        eventType: event.eventType,
        startDate: effectiveDates.startDate,
        endDate: effectiveDates.endDate,
        description: event.description,
        locationName: event.locationName,
        durationMinutes: event.durationMinutes,
        audienceType: event.audienceType,
      };
    });
    return mapped.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()); // CHANGED: sort by effective startDate
  }

  async getUpcomingEvents(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (!customer.branchCode) {
      return [];
    }

    const orFilters: any[] = [{ audienceType: 'BRANCH_ALL' }];
    if (customer.groupCode) {
      orFilters.push({
        audienceType: 'GROUPS',
        targetGroups: { some: { groupCode: customer.groupCode } },
      });
    }

    const events = await this.prisma.event.findMany({
      where: {
        branchCode: customer.branchCode, // CHANGED: branch filter for customer
        OR: orFilters, // CHANGED: branch all or group targeting
        AND: [
          {
            OR: [
              { startDate: { gte: this.startOfToday() } },
              { eventType: 'MEETING' }, // CHANGED: always include meeting for next occurrence
            ],
          },
        ],
      },
      orderBy: { startDate: 'asc' },
    });

    const now = new Date();
    const mapped = events.map((event) => {
      const effectiveDates = this.getEffectiveEventDates(event, now); // CHANGED: normalize meeting dates
      return {
        id: Number(event.id),
        title: event.title,
        eventType: event.eventType,
        startDate: effectiveDates.startDate,
        daysUntilEvent: this.daysUntil(effectiveDates.startDate),
      };
    });
    return mapped.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()); // CHANGED: sort by effective startDate
  }

  async getUpcomingEventsForBranch(branchCode?: string | null) {
    if (!branchCode) {
      return [];
    }

    const events = await this.prisma.event.findMany({
      where: {
        branchCode,
        OR: [
          { startDate: { gte: this.startOfToday() } },
          { eventType: 'MEETING' }, // CHANGED: always include meeting for next occurrence
        ],
      },
      orderBy: { startDate: 'asc' },
    });

    const now = new Date();
    const mapped = events.map((event) => {
      const effectiveDates = this.getEffectiveEventDates(event, now); // CHANGED: normalize meeting dates
      return {
        id: Number(event.id),
        title: event.title,
        eventType: event.eventType,
        startDate: effectiveDates.startDate,
        daysUntilEvent: this.daysUntil(effectiveDates.startDate),
      };
    });
    return mapped.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()); // CHANGED: sort by effective startDate
  } // CHANGED: staff schedule by branch

  async getUpcomingEventsForAdmin() {
    const events = await this.prisma.event.findMany({
      where: {
        OR: [
          { startDate: { gte: this.startOfToday() } },
          { eventType: 'MEETING' }, // CHANGED: always include meeting for next occurrence
        ],
      },
      orderBy: { startDate: 'asc' },
    });

    const now = new Date();
    const mapped = events.map((event) => {
      const effectiveDates = this.getEffectiveEventDates(event, now); // CHANGED: normalize meeting dates
      return {
        id: Number(event.id),
        title: event.title,
        eventType: event.eventType,
        startDate: effectiveDates.startDate,
        daysUntilEvent: this.daysUntil(effectiveDates.startDate),
      };
    });
    return mapped.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()); // CHANGED: sort by effective startDate
  } // CHANGED: admin schedule sees all branches

  async getScheduleForActor(actor: ActorContext) {
    if (actor?.actorKind === 'STAFF') {
      if (actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN') {
        return this.getUpcomingEventsForAdmin(); // admin-level views everything
      }
      // BA/BM use the same staff list rules (status/hidden filtering, sorting)
      return this.listStaffEvents(
        { userId: actor.userId, branchCode: actor.branchCode, role: actor.role },
        {},
      );
    }
    return this.getUpcomingEvents(actor.userId); // customer schedule
  }

  async getEventDetail(id: string | number) {
    const eventId = typeof id === 'number' ? BigInt(id) : BigInt(id);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { targetGroups: true }, // CHANGED: include target groups for detail
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const effectiveDates = this.getEffectiveEventDates(event); // CHANGED: normalize meeting dates
    const displayStatus = this.computeDisplayStatus(event);
    return {
      id: Number(event.id),
      title: event.title,
      eventType: event.eventType,
      startDate: effectiveDates.startDate,
      endDate: effectiveDates.endDate,
      description: event.description,
      locationName: event.locationName,
      durationMinutes: event.durationMinutes,
      audienceType: event.audienceType, // CHANGED: expose audience type
      status: event.status,
      hidden: event.hidden,
      approvedAt: event.approvedAt,
      rejectedAt: event.rejectedAt,
      updatedAt: event.updatedAt ?? null,
      displayStatus,
      targetGroups: this.mapTargetGroups(event.targetGroups ?? []), // CHANGED: expose target groups
      target: this.normalizeTarget(event),
    };
  }
}
