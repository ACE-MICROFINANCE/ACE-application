import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BijliClientService } from './bijli-client.service';
import { BijliCustomerSyncService } from './bijli-customer-sync.service';
import { TempPasswordCryptoService } from '../../common/services/temp-password-crypto.service';
import { generateNumericPassword, hashPassword } from '../../utils/password.util';

const BIJLI_BATCH_SIZE = 200; // CHANGED: batch size to avoid overload

@Injectable()
export class CustomerBootstrapSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CustomerBootstrapSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bijliClientService: BijliClientService,
    private readonly bijliCustomerSyncService: BijliCustomerSyncService,
    private readonly tempPasswordCryptoService: TempPasswordCryptoService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.syncAllCustomersFromBIJLI(); // CHANGED: bootstrap sync on app start
      await this.ensureCredentialForAllCustomers(); // CHANGED: bootstrap credentials
    } catch (error: any) {
      this.logger.error(
        `Bootstrap sync failed: ${error?.message ?? error}`,
      ); // CHANGED: do not crash app
    }
  }

  private async syncAllCustomersFromBIJLI(): Promise<void> {
    const total = await this.prisma.customer.count();
    let synced = 0;
    let failed = 0;

    this.logger.log(`Bootstrap BIJLI sync start: total=${total}`); // CHANGED: summary log

    for (let skip = 0; skip < total; skip += BIJLI_BATCH_SIZE) {
      const batch: Array<{ memberNo: string | null }> =
        await this.prisma.customer.findMany({
        skip,
        take: BIJLI_BATCH_SIZE,
        orderBy: { id: 'asc' },
        select: { memberNo: true },
      }); // CHANGED: explicit type to satisfy TS

      for (const customer of batch) {
        const memberNo = customer.memberNo?.trim();
        if (!memberNo) continue;

        try {
          const bijliQueryNo = this.getBijliQueryMemberNo(memberNo);
          const payload =
            await this.bijliClientService.fetchMemberInfo(bijliQueryNo);
          if (!payload) {
            failed += 1;
            continue;
          }
          await this.bijliCustomerSyncService.syncMemberNo(
            memberNo,
            payload,
          );
          synced += 1;
        } catch (error: any) {
          failed += 1;
          this.logger.warn(
            `BIJLI sync failed for memberNo=${memberNo}: ${
              error?.message ?? error
            }`,
          ); // CHANGED: log without sensitive data
        }
      }
    }

    this.logger.log(
      `Bootstrap BIJLI sync done: total=${total} synced=${synced} failed=${failed}`,
    ); // CHANGED: summary log
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
        take: BIJLI_BATCH_SIZE,
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
}
