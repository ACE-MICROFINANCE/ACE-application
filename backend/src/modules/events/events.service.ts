import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

  async getUpcomingEvents(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    //  const filters = [
    //   { scope: 'GLOBAL' },
    //   customer.groupCode
    //     ? { scope: 'GROUP', groupCode: customer.groupCode }
    //     : undefined,
    //   customer.villageName
    //     ? { scope: 'VILLAGE', villageName: customer.villageName }
    //     : undefined,
    // ].filter(Boolean) as any[];

    const events = await this.prisma.event.findMany({
      where: {
        startDate: { gte: this.startOfToday() },
        // TODO: replaced by ACE Farmer implementation
        // OR: filters, // CHANGED: tạm bỏ lọc theo group/village để ai cũng thấy event
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
    };
  }
}
