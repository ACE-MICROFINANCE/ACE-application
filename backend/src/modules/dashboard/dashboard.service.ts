import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoansService } from '../loans/loans.service';
import { EventsService } from '../events/events.service';
import { SavingsService } from '../savings/savings.service';
import { TrackFeatureUsageDto } from './dto/track-feature-usage.dto';

type UsageRange = 'daily' | 'weekly' | 'monthly' | 'year';
type ActiveCustomersRange = 'weekly' | 'monthly' | 'yearly';

type Bucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

const FEATURE_LABELS: Record<string, string> = {
  DASHBOARD: 'Dashboard',
  ADMIN_DASHBOARD: 'Admin Dashboard',
  LOANS: 'Loans',
  SAVINGS: 'Savings',
  SCHEDULE: 'Schedule',
  INFO: 'Information',
  ACCOUNT: 'Account',
  STAFF_CUSTOMERS: 'Partner Management',
  STAFF_MANAGE: 'Staff Management',
  GROUP: 'Group Management',
  ADMIN_MANAGER: 'Admin Manager',
};

const DEFAULT_FEATURES = ['LOANS', 'SAVINGS', 'SCHEDULE', 'INFO'];
const DEFAULT_TIME_SPENT_FEATURES = ['LOANS', 'SAVINGS', 'SCHEDULE'];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loansService: LoansService,
    private readonly eventsService: EventsService,
    private readonly savingsService: SavingsService,
  ) {}

  private normalizeFeatureKey(value?: string | null) {
    if (!value) return null;
    return value
      .trim()
      .toUpperCase()
      .replace(/[^\w]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  }

  private safeDate(value?: string | Date | null) {
    if (!value) return new Date();
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  }

  private startOfUtcDay(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  private startOfUtcWeek(d: Date) {
    const dayStart = this.startOfUtcDay(d);
    const day = dayStart.getUTCDay(); // 0..6, Sunday=0
    const diff = day === 0 ? -6 : 1 - day; // week starts Monday
    return new Date(dayStart.getTime() + diff * 24 * 60 * 60 * 1000);
  }

  private startOfUtcMonth(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private startOfUtcYear(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  }

  private addDays(d: Date, days: number) {
    return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private addMonths(d: Date, months: number) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  }

  private addYears(d: Date, years: number) {
    return new Date(Date.UTC(d.getUTCFullYear() + years, 0, 1));
  }

  private toBucketKey(d: Date) {
    return d.toISOString();
  }

  private formatLabel(range: UsageRange, start: Date) {
    const dd = String(start.getUTCDate()).padStart(2, '0');
    const mm = String(start.getUTCMonth() + 1).padStart(2, '0');
    const yy = String(start.getUTCFullYear()).slice(-2);
    const yyyy = String(start.getUTCFullYear());

    if (range === 'daily' || range === 'weekly') return `${dd}/${mm}`;
    if (range === 'monthly') return `${mm}/${yy}`;
    return yyyy;
  }

  private buildBuckets(range: UsageRange): Bucket[] {
    const now = new Date();
    const buckets: Bucket[] = [];

    if (range === 'daily') {
      const count = 14;
      const current = this.startOfUtcDay(now);
      for (let i = count - 1; i >= 0; i--) {
        const start = this.addDays(current, -i);
        const end = this.addDays(start, 1);
        buckets.push({
          key: this.toBucketKey(start),
          label: this.formatLabel(range, start),
          start,
          end,
        });
      }
      return buckets;
    }

    if (range === 'weekly') {
      const count = 12;
      const current = this.startOfUtcWeek(now);
      for (let i = count - 1; i >= 0; i--) {
        const start = this.addDays(current, -7 * i);
        const end = this.addDays(start, 7);
        buckets.push({
          key: this.toBucketKey(start),
          label: this.formatLabel(range, start),
          start,
          end,
        });
      }
      return buckets;
    }

    if (range === 'monthly') {
      const count = 12;
      const current = this.startOfUtcMonth(now);
      for (let i = count - 1; i >= 0; i--) {
        const start = this.addMonths(current, -i);
        const end = this.addMonths(start, 1);
        buckets.push({
          key: this.toBucketKey(start),
          label: this.formatLabel(range, start),
          start,
          end,
        });
      }
      return buckets;
    }

    const count = 5;
    const current = this.startOfUtcYear(now);
    for (let i = count - 1; i >= 0; i--) {
      const start = this.addYears(current, -i);
      const end = this.addYears(start, 1);
      buckets.push({
        key: this.toBucketKey(start),
        label: this.formatLabel(range, start),
        start,
        end,
      });
    }
    return buckets;
  }

  private getBucketStartForDate(range: UsageRange, d: Date) {
    if (range === 'daily') return this.startOfUtcDay(d);
    if (range === 'weekly') return this.startOfUtcWeek(d);
    if (range === 'monthly') return this.startOfUtcMonth(d);
    return this.startOfUtcYear(d);
  }

  private getFeatureLabel(featureKey: string) {
    return FEATURE_LABELS[featureKey] ?? featureKey.replace(/_/g, ' ');
  }

  private getAnalyticsWindow(range: ActiveCustomersRange) {
    const now = new Date();
    if (range === 'weekly') {
      const from = this.startOfUtcWeek(now);
      return { from, to: this.addDays(from, 7) };
    }
    if (range === 'yearly') {
      const from = this.startOfUtcYear(now);
      return { from, to: this.addYears(from, 1) };
    }
    const from = this.startOfUtcMonth(now);
    return { from, to: this.addMonths(from, 1) };
  }

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

  async trackFeatureUsage(user: any, dto: TrackFeatureUsageDto) {
    if (String(user?.actorKind ?? '').toUpperCase() !== 'CUSTOMER') {
      return { success: true };
    }

    const featureKey = this.normalizeFeatureKey(dto.featureKey);
    if (!featureKey) return { success: true };
    if (featureKey === 'DASHBOARD') return { success: true };

    const occurredAt = this.safeDate(dto.occurredAt);
    const eventType = this.normalizeFeatureKey(dto.eventType) || 'VIEW';
    const source = dto.source?.trim() || 'mobile';
    const clientEventId = dto.clientEventId?.trim() || null;

    const data = {
      actorKind: String(user?.actorKind ?? 'UNKNOWN'),
      actorId: String(user?.userId ?? 'UNKNOWN'),
      role: user?.role ?? null,
      branchCode: user?.branchCode ?? null,
      featureKey,
      eventType,
      durationSeconds: dto.durationSeconds ?? null,
      source,
      clientEventId,
      occurredAt,
    };

    if (clientEventId) {
      try {
        await this.prisma.featureUsageEvent.create({ data });
      } catch (error: any) {
        // Ignore duplicate clientEventId to keep endpoint idempotent.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return { success: true };
        }
        throw error;
      }
      return { success: true };
    }

    await this.prisma.featureUsageEvent.create({ data });
    return { success: true };
  }

  async getFeatureUsageOverTime(input: {
    range?: UsageRange;
    features?: string;
    limit?: number;
  }) {
    const range: UsageRange = input.range ?? 'weekly';
    const limit = Math.max(1, Math.min(Number(input.limit ?? 4), 8));
    const buckets = this.buildBuckets(range);
    const from = buckets[0]?.start ?? this.addDays(this.startOfUtcDay(new Date()), -13);
    const to = buckets[buckets.length - 1]?.end ?? new Date();
    const requested = (input.features ?? '')
      .split(',')
      .map((f) => this.normalizeFeatureKey(f))
      .filter((f): f is string => Boolean(f));

    const events = await this.prisma.featureUsageEvent.findMany({
      where: {
        actorKind: 'CUSTOMER',
        NOT: { featureKey: 'DASHBOARD' },
        eventType: 'VIEW',
        occurredAt: { gte: from, lt: to },
        ...(requested.length ? { featureKey: { in: requested } } : {}),
      },
      select: {
        featureKey: true,
        occurredAt: true,
      },
    });

    const overallCounts = new Map<string, number>();
    for (const ev of events) {
      overallCounts.set(ev.featureKey, (overallCounts.get(ev.featureKey) ?? 0) + 1);
    }

    let selectedFeatures = requested;
    if (!selectedFeatures.length) {
      selectedFeatures = Array.from(overallCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([featureKey]) => featureKey);
    }
    if (!selectedFeatures.length) {
      selectedFeatures = DEFAULT_FEATURES.slice(0, limit);
    }

    const selectedSet = new Set(selectedFeatures);
    const bucketIndexByKey = new Map<string, number>();
    buckets.forEach((b, idx) => bucketIndexByKey.set(b.key, idx));

    const series = new Map<string, number[]>();
    selectedFeatures.forEach((featureKey) => {
      series.set(featureKey, Array(buckets.length).fill(0));
    });

    for (const ev of events) {
      if (!selectedSet.has(ev.featureKey)) continue;
      const bucketStart = this.getBucketStartForDate(range, ev.occurredAt);
      const idx = bucketIndexByKey.get(this.toBucketKey(bucketStart));
      if (idx == null) continue;
      const row = series.get(ev.featureKey);
      if (!row) continue;
      row[idx] += 1;
    }

    const features = selectedFeatures.map((featureKey) => {
      const data = series.get(featureKey) ?? Array(buckets.length).fill(0);
      return {
        featureKey,
        label: this.getFeatureLabel(featureKey),
        total: data.reduce((sum, v) => sum + v, 0),
        data,
      };
    });

    const availableFeatures = Array.from(overallCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([featureKey, count]) => ({
        featureKey,
        label: this.getFeatureLabel(featureKey),
        count,
      }));

    return {
      range,
      buckets: buckets.map((b) => b.label),
      from: from.toISOString(),
      to: to.toISOString(),
      features,
      availableFeatures,
    };
  }

  async getActiveCustomers(inputRange?: ActiveCustomersRange) {
    const range: ActiveCustomersRange = inputRange ?? 'monthly';
    const { from, to } = this.getAnalyticsWindow(range);

    const [totalCustomers, activeActors] = await Promise.all([
      this.prisma.customer.count({
        where: { isActive: true },
      }),
      this.prisma.featureUsageEvent.findMany({
        where: {
          actorKind: 'CUSTOMER',
          occurredAt: { gte: from, lt: to },
        },
        distinct: ['actorId'],
        select: { actorId: true },
      }),
    ]);

    const activeCustomers = activeActors.length;
    const inactiveCustomers = Math.max(totalCustomers - activeCustomers, 0);
    const activeRate = totalCustomers > 0 ? Number(((activeCustomers / totalCustomers) * 100).toFixed(1)) : 0;

    return {
      period: range,
      from: from.toISOString(),
      to: to.toISOString(),
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      activeRate,
    };
  }

  async getFeatureTimeSpent(input: { range?: ActiveCustomersRange; features?: string }) {
    const range: ActiveCustomersRange = input.range ?? 'monthly';
    const { from, to } = this.getAnalyticsWindow(range);
    const requested = (input.features ?? '')
      .split(',')
      .map((f) => this.normalizeFeatureKey(f))
      .filter((f): f is string => Boolean(f));

    const selectedFeatures = requested.length ? requested : DEFAULT_TIME_SPENT_FEATURES;
    const rows = await this.prisma.featureUsageEvent.findMany({
      where: {
        actorKind: 'CUSTOMER',
        eventType: 'DURATION',
        durationSeconds: { gt: 0 },
        occurredAt: { gte: from, lt: to },
        featureKey: { in: selectedFeatures },
      },
      select: {
        featureKey: true,
        actorId: true,
        durationSeconds: true,
      },
    });

    const byFeature = new Map<string, { totalSeconds: number; sessions: number; actors: Set<string> }>();
    for (const f of selectedFeatures) {
      byFeature.set(f, { totalSeconds: 0, sessions: 0, actors: new Set<string>() });
    }

    for (const row of rows) {
      const agg = byFeature.get(row.featureKey);
      if (!agg) continue;
      const sec = Math.max(0, Number(row.durationSeconds ?? 0));
      agg.totalSeconds += sec;
      agg.sessions += 1;
      agg.actors.add(row.actorId);
    }

    const features = selectedFeatures.map((featureKey) => {
      const agg = byFeature.get(featureKey)!;
      const activeUsers = agg.actors.size;
      const avgSeconds = activeUsers > 0 ? agg.totalSeconds / activeUsers : 0;
      return {
        featureKey,
        label: this.getFeatureLabel(featureKey),
        totalMinutes: Number((agg.totalSeconds / 60).toFixed(1)),
        averageMinutes: Number((avgSeconds / 60).toFixed(1)),
        sessions: agg.sessions,
        activeUsers,
      };
    });

    return {
      period: range,
      from: from.toISOString(),
      to: to.toISOString(),
      features,
    };
  }
}
