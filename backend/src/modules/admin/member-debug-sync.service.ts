import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BijliClientService } from '../customers/bijli-client.service';
import { BijliCustomerSyncService } from '../customers/bijli-customer-sync.service';
import { BranchGroupMapService } from '../customers/branch-group-map.service';
import { LoansService } from '../loans/loans.service';
import { EventsService } from '../events/events.service';
import { CustomersService } from '../customers/customers.service';

type SyncSummary = {
  source: 'bijli' | 'db_fallback';
  saved: boolean;
  fetchedAt: string;
  durationMs: number;
  missingModules: string[];
  warnings: string[];
  errors: string[];
};

@Injectable()
export class MemberDebugSyncService {
  private readonly logger = new Logger(MemberDebugSyncService.name);
  private readonly lastCallByMember = new Map<string, number>();
  private readonly rateLimitMs = 4000; // CHANGED: basic rate limit window

  constructor(
    private readonly prisma: PrismaService,
    private readonly bijliClientService: BijliClientService,
    private readonly bijliCustomerSyncService: BijliCustomerSyncService,
    private readonly branchGroupMapService: BranchGroupMapService,
    private readonly loansService: LoansService,
    private readonly eventsService: EventsService,
    private readonly customersService: CustomersService,
  ) {}

  private checkRateLimit(memberNo: string) {
    const now = Date.now();
    const last = this.lastCallByMember.get(memberNo) ?? 0;
    if (now - last < this.rateLimitMs) {
      throw new HttpException('Please retry later', HttpStatus.TOO_MANY_REQUESTS); // CHANGED: rate limit
    }
    this.lastCallByMember.set(memberNo, now);
  }

  private normalizeMemberNo(memberNo: string) {
    return memberNo.trim();
  }

  private async loadSnapshot(memberNo: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { memberNo },
    });

    if (!customer) return null;

    const profile = await this.customersService.getProfile(customer.id);

    const loans = await this.prisma.loan.findMany({
      where: { customerId: customer.id },
      include: { installments: true },
      orderBy: { disbursementDate: 'desc' },
    });

    const savings = await this.prisma.customerSavings.findMany({
      where: { customerId: customer.id },
      orderBy: { type: 'asc' },
    });

    const events = await this.eventsService.getCustomerEvents(customer.id);

    return {
      memberNo: customer.memberNo,
      customer: profile,
      loans: loans.map((loan) => ({
        id: Number(loan.id),
        customerId: Number(loan.customerId),
        loanNo: loan.loanNo,
        externalLoanId: loan.externalLoanId,
        productName: loan.productName,
        loanCycle: loan.loanCycle,
        principalAmount: Number(loan.principalAmount),
        interestRate: Number(loan.interestRate),
        termInstallments: loan.termInstallments,
        disbursementDate: loan.disbursementDate,
        maturityDate: loan.maturityDate,
        totalPrincipalOutstanding: loan.totalPrincipalOutstanding
          ? Number(loan.totalPrincipalOutstanding)
          : null,
        totalInterestOutstanding: loan.totalInterestOutstanding
          ? Number(loan.totalInterestOutstanding)
          : null,
        status: loan.status,
        loanType: loan.loanType,
        lastSyncedAt: loan.lastSyncedAt,
        installments: loan.installments.map((inst) => ({
          id: Number(inst.id),
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate,
          principalDue: Number(inst.principalDue),
          interestDue: Number(inst.interestDue),
          status: inst.status,
          createdAt: inst.createdAt,
        })),
      })),
      savings: savings.map((item) => ({
        id: Number(item.id),
        customerId: Number(item.customerId),
        type: item.type,
        principalAmount: Number(item.principalAmount),
        currentBalance: Number(item.currentBalance),
        interestAccrued: Number(item.interestAccrued),
        lastDepositAmount: item.lastDepositAmount ? Number(item.lastDepositAmount) : null,
        lastDepositDate: item.lastDepositDate,
        importedAt: item.importedAt,
      })),
      events,
    };
  }

  async getMember(memberNo: string) {
    const normalized = this.normalizeMemberNo(memberNo);
    const snapshot = await this.loadSnapshot(normalized);
    if (!snapshot) {
      throw new NotFoundException('Member not found'); // CHANGED: 404 when missing
    }
    return snapshot;
  }

  async refreshMember(memberNo: string) {
    const normalized = this.normalizeMemberNo(memberNo);
    this.checkRateLimit(normalized);

    const startedAt = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    const missingModules: string[] = [];
    let source: SyncSummary['source'] = 'bijli';
    let saved = false;

    let bijliData: Record<string, unknown> | null = null;
    try {
      bijliData = await this.bijliClientService.fetchMemberInfo(normalized);
    } catch (error: any) {
      errors.push(`Bijli fetch failed: ${error?.message ?? 'unknown error'}`);
    }

    if (!bijliData) {
      source = 'db_fallback';
      const fallback = await this.loadSnapshot(normalized);
      if (!fallback) {
        throw new NotFoundException('Member not found'); // CHANGED: no BIJLI + no DB
      }

      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `[DEBUG-SYNC] memberNo=${normalized} source=${source} durationMs=${durationMs}`,
      ); // CHANGED: debug log

      return {
        ...fallback,
        syncSummary: {
          source,
          saved: false,
          fetchedAt: new Date().toISOString(),
          durationMs,
          missingModules,
          warnings,
          errors,
        },
      };
    }

    const rawGroupName = String(bijliData.GroupName ?? '').trim();
    if (rawGroupName) {
      const resolved = this.branchGroupMapService.resolveGroupName(rawGroupName, {
        memberNo: normalized,
      });
      if (!resolved.found && resolved.reason === 'CONFLICT') {
        errors.push(`GroupName conflict: ${rawGroupName}`);
      } else if (!resolved.found) {
        warnings.push(`GroupName not mapped: ${rawGroupName}`);
      }
    }

    try {
      await this.bijliCustomerSyncService.syncMemberNo(normalized, bijliData); // CHANGED: sync customer + savings
      saved = true;
    } catch (error: any) {
      errors.push(`Customer sync failed: ${error?.message ?? 'unknown error'}`);
      missingModules.push('customers', 'savings'); // CHANGED: mark missing when sync fails
    }

    try {
      const synced = await this.loansService.syncLoanByMemberNo(normalized, bijliData); // CHANGED: sync loan
      if (!synced) {
        warnings.push('Loan sync skipped: customer not found');
        missingModules.push('loans'); // CHANGED: mark missing when no customer
      }
    } catch (error: any) {
      errors.push(`Loan sync failed: ${error?.message ?? 'unknown error'}`);
      missingModules.push('loans'); // CHANGED: mark missing when sync fails
    }

    missingModules.push('events'); // CHANGED: events are not provided by BIJLI

    const snapshot = await this.loadSnapshot(normalized);
    if (!snapshot) {
      throw new NotFoundException('Member not found after sync'); // CHANGED: safety check
    }

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `[DEBUG-SYNC] memberNo=${normalized} source=${source} saved=${saved} durationMs=${durationMs} loans=${snapshot.loans.length} savings=${snapshot.savings.length} events=${snapshot.events.length}`,
    ); // CHANGED: debug log summary

    return {
      ...snapshot,
      syncSummary: {
        source,
        saved,
        fetchedAt: new Date().toISOString(),
        durationMs,
        missingModules,
        warnings,
        errors,
      },
    };
  }
}
