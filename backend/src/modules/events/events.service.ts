import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDays, addMinutes, differenceInMinutes } from 'date-fns';
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
};

type ActorContext = {
  userId: string;
  actorKind?: 'CUSTOMER' | 'STAFF' | string; // CHANGED: support schedule by actorKind
  branchCode?: string | null;
  groupCode?: string | null;
  role?: 'ADMIN' | 'BRANCH_MANAGER' | string | null; // CHANGED: allow admin schedule
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
    const effectiveDates = this.getEffectiveEventDates(event, now); // CHANGED: normalize meeting dates
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
      targetGroups: this.mapTargetGroups(event.targetGroups ?? []),
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
    await this.dispatchScheduleNotification(scheduleTemplates.created, mapped);
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
      orderBy: { startDate: 'desc' },
    });

    const now = new Date();
    const mapped = events.map((event) => this.mapStaffEvent(event, now)); // CHANGED: normalize meeting dates
    return mapped.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()); // CHANGED: sort by effective startDate
  }

  private async resolveRecipients(event: any): Promise<Array<{ actorKind: 'CUSTOMER' | 'STAFF'; actorId: string }>> {
    const recipients: Array<{ actorKind: 'CUSTOMER' | 'STAFF'; actorId: string }> = [];
    const branchCode = event.branchCode;
    const audienceType = event.audienceType;
    const targetGroupCodes = (event.targetGroups ?? [])
      .map((g: { groupCode?: string | null }) => g.groupCode)
      .filter(Boolean) as string[];

    if (branchCode) {
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

    if (event.createdByStaffId) {
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
    extra?: Partial<{ reminderDays: number; changedFieldsShort: string }>,
  ) {
    const recipients = await this.resolveRecipients(event);
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
      notificationKey: template.notificationKey,
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
    await this.dispatchScheduleNotification(scheduleTemplates.updated, mapped, { changedFieldsShort });
    return mapped;
  }

  async deleteStaffEvent(staff: StaffContext, id: string) {
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

    const eventToDelete = this.mapStaffEvent(existing);
    await this.prisma.$transaction(async (tx) => {
      await tx.eventTargetGroup.deleteMany({ where: { eventId } });
      await tx.event.delete({ where: { id: eventId } });
    });

    await this.dispatchScheduleNotification(scheduleTemplates.canceled, eventToDelete);
    return { success: true };
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
      if (actor.role === 'ADMIN') {
        return this.getUpcomingEventsForAdmin(); // CHANGED: admin sees all upcoming events
      }
      return this.getUpcomingEventsForBranch(actor.branchCode); // CHANGED: staff sees branch schedule
    }
    return this.getUpcomingEvents(actor.userId); // CHANGED: customer schedule
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
      targetGroups: this.mapTargetGroups(event.targetGroups ?? []), // CHANGED: expose target groups
    };
  }
}
