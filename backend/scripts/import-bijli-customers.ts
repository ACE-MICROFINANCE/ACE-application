import axios from 'axios';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BijliCustomerSyncService } from '../src/modules/customers/bijli-customer-sync.service';

type ImportStats = {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  processed: number;
};

const DEFAULT_MEMBER_NOS: string[] = [];

function parseArgs() {
  const args = process.argv.slice(2);
  const fileIndex = args.findIndex((arg) => arg === '--file');
  if (fileIndex >= 0 && args[fileIndex + 1]) {
    return { filePath: args[fileIndex + 1] };
  }

  const fileArg = args.find((arg) => arg.startsWith('--file='));
  if (fileArg) {
    return { filePath: fileArg.split('=')[1] };
  }

  return { filePath: undefined };
}

function parseMemberNosFromCsv(content: string) {
  const cleaned = content.replace(/^\uFEFF/, '');
  return cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[;,]/)[0].trim())
    .filter(Boolean)
    .filter((value) => !value.toLowerCase().includes('member'))
    .map((value) => value.replace(/"/g, '').trim());
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>,
) {
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await handler(items[currentIndex]);
    }
  });
  await Promise.all(workers);
}

function isTimeoutError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
  }
  return false;
}

async function syncWithRetry(
  service: BijliCustomerSyncService,
  memberNo: string,
  retryLeft = 1,
): Promise<boolean> {
  try {
    return await service.syncMemberNo(memberNo);
  } catch (error) {
    if (retryLeft > 0 && isTimeoutError(error)) {
      return syncWithRetry(service, memberNo, retryLeft - 1);
    }
    throw error;
  }
}

async function main() {
  const { filePath } = parseArgs();
  let memberNos = DEFAULT_MEMBER_NOS;

  if (filePath) {
    const resolvedPath = resolve(process.cwd(), filePath);
    const content = readFileSync(resolvedPath, 'utf-8');
    memberNos = parseMemberNosFromCsv(content);
  }

  memberNos = Array.from(new Set(memberNos.map((value) => value.trim()).filter(Boolean)));
  if (memberNos.length === 0) {
    console.log('[BIJLI-CUSTOMER] No memberNo provided. Use --file=path/to/list.csv');
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(BijliCustomerSyncService);
  const stats: ImportStats = {
    total: memberNos.length,
    success: 0,
    failed: 0,
    skipped: 0,
    processed: 0,
  };

  console.log(`[BIJLI-CUSTOMER] Starting sync for ${stats.total} members...`);

  await runWithConcurrency(memberNos, 4, async (memberNo) => {
    try {
      const synced = await syncWithRetry(syncService, memberNo);
      if (synced) {
        stats.success += 1;
      } else {
        stats.skipped += 1;
      }
    } catch (error: any) {
      stats.failed += 1;
      console.log(`[BIJLI-CUSTOMER] Failed ${memberNo}: ${error?.message ?? error}`);
    } finally {
      stats.processed += 1;
      if (stats.processed % 10 === 0 || stats.processed === stats.total) {
        console.log(
          `[BIJLI-CUSTOMER] Progress ${stats.processed}/${stats.total} | ok=${stats.success} | skipped=${stats.skipped} | failed=${stats.failed}`,
        );
      }
    }
  });

  console.log(
    `[BIJLI-CUSTOMER] Done. ok=${stats.success}, skipped=${stats.skipped}, failed=${stats.failed}`,
  );
  await app.close();
}

main().catch((error) => {
  console.error('[BIJLI-CUSTOMER] Import failed:', error);
  process.exit(1);
});
