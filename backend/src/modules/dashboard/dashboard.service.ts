import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoansService } from '../loans/loans.service';
import { EventsService } from '../events/events.service';
import { SavingsService } from '../savings/savings.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loansService: LoansService,
    private readonly eventsService: EventsService,
    private readonly savingsService: SavingsService,
  ) {}

  async getSummary(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const [loanReminder, events, savings] = await Promise.all([
      this.loansService.getLoanReminder(id),
      this.eventsService.getUpcomingEvents(id),
      this.savingsService.getSavings(id),
    ]);

    return {
      customer: {
        id: Number(customer.id),
        memberNo: customer.memberNo,
        fullName: customer.fullName,
      },
      loanReminder,
      eventReminders: events.slice(0, 3),
      savingsSummary: savings,
    };
  }
}
