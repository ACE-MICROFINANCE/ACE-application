import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type StaffContext = {
  userId: string;
  branchCode?: string | null;
};

type StaffEventFilters = {
  from?: string;
  to?: string;
  eventType?: string;
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private mapStaffEvent(event: any) {
    return {
      id: Number(event.id),
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
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

    return this.mapStaffEvent(createdEvent);
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

    return events.map((event) => this.mapStaffEvent(event));
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

    return this.mapStaffEvent(refreshed);
  }

  async deleteStaffEvent(staff: StaffContext, id: string) {
    const branchCode = this.ensureBranchCode(staff);
    const eventId = BigInt(id);
    const existing = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) {
      throw new NotFoundException('Event not found');
    }
    if (existing.branchCode !== branchCode) {
      throw new ForbiddenException('Event does not belong to your branch'); // CHANGED: branch guard
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.eventTargetGroup.deleteMany({ where: { eventId } });
      await tx.event.delete({ where: { id: eventId } });
    });

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
        startDate: { gte: this.startOfToday() },
        OR: orFilters,
      },
      orderBy: { startDate: 'asc' },
    });

    return events.map((event) => ({
      id: Number(event.id),
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      description: event.description,
      locationName: event.locationName,
      durationMinutes: event.durationMinutes,
      audienceType: event.audienceType,
    }));
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
        startDate: { gte: this.startOfToday() },
        OR: orFilters, // CHANGED: branch all or group targeting
      },
      orderBy: { startDate: 'asc' },
    });

    return events.map((event) => ({
      id: Number(event.id),
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate,
      daysUntilEvent: this.daysUntil(event.startDate),
    }));
  }

  async getEventDetail(id: string | number) {
    const eventId = typeof id === 'number' ? BigInt(id) : BigInt(id);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      id: Number(event.id),
      title: event.title,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      description: event.description,
      locationName: event.locationName,
      durationMinutes: event.durationMinutes,
    };
  }
}
