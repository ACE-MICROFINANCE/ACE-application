import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BijliClientService } from './bijli-client.service';
import { BijliCustomerSyncService } from './bijli-customer-sync.service';
import { TempPasswordCryptoService } from '../../common/services/temp-password-crypto.service';
import { generateNumericPassword, hashPassword } from '../../utils/password.util';

const BOOTSTRAP_BATCH_SIZE = 200;
const DEFAULT_WEEKLY_SYNC_DAY = 6; // 0=Sun ... 6=Sat
const DEFAULT_WEEKLY_SYNC_HOUR = 22;
const DEFAULT_WEEKLY_SYNC_STALE_DAYS = 7;
const DEFAULT_WEEKLY_SYNC_MAX_CUSTOMERS = 300;
const DEFAULT_WEEKLY_SYNC_BATCH_SIZE = 50;
const DEFAULT_WEEKLY_SYNC_DELAY_MS = 150;
const DEFAULT_WEEKLY_SYNC_TIMEZONE = 'Asia/Bangkok';
const DEFAULT_STARTUP_SYNC_DELAY_SECONDS = 20;

type SyncMode = 'all' | 'unsynced_or_stale';
type SyncRunSummary = {
  mode: SyncMode;
  reason: string;
  totalCandidates: number;
  processed: number;
  synced: number;
  failed: number;
  skippedNoMemberNo: number;
  staleDays: number;
  maxCustomers: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

@Injectable()
export class CustomerBootstrapSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CustomerBootstrapSyncService.name);
  private readonly syncOnStartupEnabled =
    String(process.env.CUSTOMER_BOOTSTRAP_SYNC_ON_STARTUP ?? '').toLowerCase() === 'true';
  private readonly startupSyncMode: SyncMode =
    String(process.env.CUSTOMER_STARTUP_SYNC_MODE ?? 'unsynced_or_stale').toLowerCase() ===
    'all'
      ? 'all'
      : 'unsynced_or_stale';
  private readonly startupSyncDelaySeconds = this.clampInt(
    process.env.CUSTOMER_STARTUP_SYNC_DELAY_SECONDS,
    0,
    3600,
    DEFAULT_STARTUP_SYNC_DELAY_SECONDS,
  );
  private readonly startupSyncMaxCustomers = this.clampInt(
    process.env.CUSTOMER_STARTUP_SYNC_MAX_CUSTOMERS,
    1,
    50000,
    DEFAULT_WEEKLY_SYNC_MAX_CUSTOMERS,
  );
  private readonly weeklySyncEnabled =
    String(process.env.CUSTOMER_WEEKLY_SYNC_ENABLED ?? 'true').toLowerCase() === 'true';
  private readonly weeklySyncDay = this.clampInt(
    process.env.CUSTOMER_WEEKLY_SYNC_DAY,
    0,
    6,
    DEFAULT_WEEKLY_SYNC_DAY,
  );
  private readonly weeklySyncHour = this.clampInt(
    process.env.CUSTOMER_WEEKLY_SYNC_HOUR,
    0,
    23,
    DEFAULT_WEEKLY_SYNC_HOUR,
  );
  private readonly weeklySyncStaleDays = this.clampInt(
    process.env.CUSTOMER_WEEKLY_SYNC_STALE_DAYS,
    1,
    3650,
    DEFAULT_WEEKLY_SYNC_STALE_DAYS,
  );
  private readonly weeklySyncMaxCustomers = this.clampInt(
    process.env.CUSTOMER_WEEKLY_SYNC_MAX_CUSTOMERS,
    1,
    50000,
    DEFAULT_WEEKLY_SYNC_MAX_CUSTOMERS,
  );
  private readonly weeklySyncBatchSize = this.clampInt(
    process.env.CUSTOMER_WEEKLY_SYNC_BATCH_SIZE,
    1,
    1000,
    DEFAULT_WEEKLY_SYNC_BATCH_SIZE,
  );
  private readonly weeklySyncDelayMs = this.clampInt(
    process.env.CUSTOMER_WEEKLY_SYNC_BATCH_DELAY_MS,
    0,
    60000,
    DEFAULT_WEEKLY_SYNC_DELAY_MS,
  );
  private readonly weeklySyncTimezone =
    process.env.CUSTOMER_WEEKLY_SYNC_TIMEZONE?.trim() || DEFAULT_WEEKLY_SYNC_TIMEZONE;
  private isSyncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bijliClientService: BijliClientService,
    private readonly bijliCustomerSyncService: BijliCustomerSyncService,
    private readonly tempPasswordCryptoService: TempPasswordCryptoService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log(
      `Weekly sync config: enabled=${this.weeklySyncEnabled} day=${this.weeklySyncDay} hour=${this.weeklySyncHour} timezone=${this.weeklySyncTimezone} staleDays=${this.weeklySyncStaleDays} maxCustomers=${this.weeklySyncMaxCustomers} batchSize=${this.weeklySyncBatchSize} delayMs=${this.weeklySyncDelayMs}`,
    );
    if (!this.syncOnStartupEnabled) {
      this.logger.log(
        'Skip bootstrap customer sync (set CUSTOMER_BOOTSTRAP_SYNC_ON_STARTUP=true to enable).',
      );
      return;
    }
    this.logger.log(
      `Startup sync scheduled in background (mode=${this.startupSyncMode}, delay=${this.startupSyncDelaySeconds}s, maxCustomers=${this.startupSyncMaxCustomers}).`,
    );
    setTimeout(() => {
      void this.runStartupSyncInBackground();
    }, this.startupSyncDelaySeconds * 1000);
  }

  @Cron('0 * * * *')
  async handleWeeklySync(): Promise<void> {
    if (!this.weeklySyncEnabled) return;
    if (this.isSyncRunning) return;
    if (!this.shouldRunNow()) return;

    this.isSyncRunning = true;
    try {
      await this.runCustomerSync({
        mode: 'unsynced_or_stale',
        reason: 'weekly-cron',
        staleDays: this.weeklySyncStaleDays,
        maxCustomers: this.weeklySyncMaxCustomers,
        batchSize: this.weeklySyncBatchSize,
        delayMs: this.weeklySyncDelayMs,
      });
    } catch (error: any) {
      this.logger.error(`Weekly customer sync failed: ${error?.message ?? error}`);
    } finally {
      this.isSyncRunning = false;
    }
  }

  async listSyncCandidates(input?: { staleDays?: number; limit?: number }) {
    const staleDays = this.clampInt(
      input?.staleDays,
      1,
      3650,
      this.weeklySyncStaleDays,
    );
    const limit = this.clampInt(input?.limit, 1, 1000, 100);
    const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.customer.findMany({
      where: {
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }],
      },
      orderBy: [{ lastSyncedAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true,
        memberNo: true,
        fullName: true,
        branchCode: true,
        lastSyncedAt: true,
      },
    });

    const totalCandidates = await this.prisma.customer.count({
      where: {
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }],
      },
    });

    return {
      staleDays,
      staleBefore: staleBefore.toISOString(),
      totalCandidates,
      items: rows.map((r) => ({
        id: r.id.toString(),
        memberNo: r.memberNo,
        fullName: r.fullName,
        branchCode: r.branchCode,
        lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      })),
    };
  }

  async runManualSync(input?: { staleDays?: number; maxCustomers?: number }) {
    return this.runCustomerSync({
      mode: 'unsynced_or_stale',
      reason: 'manual',
      staleDays: this.clampInt(input?.staleDays, 1, 3650, this.weeklySyncStaleDays),
      maxCustomers: this.clampInt(
        input?.maxCustomers,
        1,
        50000,
        this.weeklySyncMaxCustomers,
      ),
      batchSize: this.weeklySyncBatchSize,
      delayMs: this.weeklySyncDelayMs,
    });
  }

  private async runCustomerSync(input: {
    mode: SyncMode;
    reason: string;
    staleDays: number;
    maxCustomers: number;
    batchSize: number;
    delayMs: number;
  }): Promise<SyncRunSummary> {
    const startedAt = new Date();
    const staleBefore = new Date(Date.now() - input.staleDays * 24 * 60 * 60 * 1000);

    const baseWhere =
      input.mode === 'all'
        ? {}
        : {
            OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }],
          };

    const totalCandidates = await this.prisma.customer.count({ where: baseWhere });
    let processed = 0;
    let synced = 0;
    let failed = 0;
    let skippedNoMemberNo = 0;
    let lastId: bigint | null = null;

    this.logger.log(
      `Customer sync start reason=${input.reason} mode=${input.mode} candidates=${totalCandidates} staleDays=${input.staleDays} maxCustomers=${input.maxCustomers}`,
    );

    while (processed < input.maxCustomers) {
      const remaining = input.maxCustomers - processed;
      const take = Math.min(input.batchSize, remaining);
      const rows: Array<{ id: bigint; memberNo: string | null }> =
        await this.prisma.customer.findMany({
          where: {
            ...baseWhere,
            ...(lastId ? { id: { gt: lastId } } : {}),
          },
          orderBy: { id: 'asc' },
          take,
          select: { id: true, memberNo: true },
        });

      if (!rows.length) break;
      lastId = rows[rows.length - 1].id;

      for (const row of rows) {
        processed += 1;
        const memberNo = row.memberNo?.trim();
        if (!memberNo) {
          skippedNoMemberNo += 1;
          continue;
        }
        try {
          const bijliQueryNo = this.getBijliQueryMemberNo(memberNo);
          const payload = await this.bijliClientService.fetchMemberInfo(bijliQueryNo);
          if (!payload) {
            failed += 1;
            continue;
          }
          await this.bijliCustomerSyncService.syncMemberNo(memberNo, payload);
          synced += 1;
        } catch (error: any) {
          failed += 1;
          this.logger.warn(
            `Customer sync failed for memberNo=${memberNo}: ${error?.message ?? error}`,
          );
        }
      }

      if (input.delayMs > 0 && processed < input.maxCustomers) {
        await this.sleep(input.delayMs);
      }
    }

    const finishedAt = new Date();
    const summary: SyncRunSummary = {
      mode: input.mode,
      reason: input.reason,
      totalCandidates,
      processed,
      synced,
      failed,
      skippedNoMemberNo,
      staleDays: input.staleDays,
      maxCustomers: input.maxCustomers,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };

    this.logger.log(`Customer sync done: ${JSON.stringify(summary)}`);
    return summary;
  }

  private async ensureCredentialForAllCustomers(): Promise<void> {
    let created = 0;
    let skipped = 0;
    let lastId: bigint | null = null;

    this.logger.log('Bootstrap credential ensure start'); // CHANGED: summary log

    while (true) {
      const batch: Array<{ id: bigint }> = await this.prisma.customer.findMany({
        where: {
          credential: null,
          ...(lastId ? { id: { gt: lastId } } : {}),
        },
        orderBy: { id: 'asc' },
        take: BOOTSTRAP_BATCH_SIZE,
        select: { id: true },
      }); // CHANGED: explicit type to satisfy TS

      if (!batch.length) break;
      lastId = batch[batch.length - 1].id;

      for (const customer of batch) {
        try {
          const tempPassword = generateNumericPassword(6, 6); // CHANGED: fixed 6-digit temp password
          const passwordHash = await hashPassword(tempPassword);
          const tempPasswordEncrypted =
            this.tempPasswordCryptoService.encrypt(tempPassword);

          await this.prisma.customerCredential.create({
            data: {
              customerId: customer.id,
              passwordHash,
              isActive: true,
              mustChangePassword: true,
              tempPasswordEncrypted,
              tempPasswordIssuedAt: new Date(),
            },
          });
          created += 1;
        } catch (error: any) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            skipped += 1;
            continue;
          }
          this.logger.warn(
            `Credential bootstrap failed for customerId=${customer.id.toString()}: ${
              error?.message ?? error
            }`,
          ); // CHANGED: log without sensitive data
        }
      }
    }

    this.logger.log(
      `Bootstrap credential ensure done: created=${created} skipped=${skipped}`,
    ); // CHANGED: summary log
  }

  private getBijliQueryMemberNo(memberNo: string): string {
    const normalized = memberNo.trim();
    if (!normalized) return normalized;
    const padded = normalized.padStart(10, '0');
    return padded.startsWith('00') ? padded.slice(2) : normalized;
  }

  private async runStartupSyncInBackground() {
    if (this.isSyncRunning) {
      this.logger.log('Skip startup sync because another sync is in progress.');
      return;
    }
    this.isSyncRunning = true;
    try {
      await this.runCustomerSync({
        mode: this.startupSyncMode,
        reason: 'startup-background',
        staleDays: this.weeklySyncStaleDays,
        maxCustomers:
          this.startupSyncMode === 'all'
            ? Number.MAX_SAFE_INTEGER
            : this.startupSyncMaxCustomers,
        batchSize:
          this.startupSyncMode === 'all'
            ? BOOTSTRAP_BATCH_SIZE
            : this.weeklySyncBatchSize,
        delayMs:
          this.startupSyncMode === 'all'
            ? 0
            : this.weeklySyncDelayMs,
      });
      if (this.startupSyncMode === 'all') {
        await this.ensureCredentialForAllCustomers();
      }
    } catch (error: any) {
      this.logger.error(`Startup sync failed: ${error?.message ?? error}`);
    } finally {
      this.isSyncRunning = false;
    }
  }

  private shouldRunNow() {
    const localNow = this.toDateInTz(new Date(), this.weeklySyncTimezone);
    return (
      localNow.getDay() === this.weeklySyncDay &&
      localNow.getHours() === this.weeklySyncHour
    );
  }

  private toDateInTz(date: Date, timeZone: string) {
    return new Date(date.toLocaleString('en-US', { timeZone }));
  }

  private clampInt(
    value: unknown,
    min: number,
    max: number,
    fallback: number,
  ) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
