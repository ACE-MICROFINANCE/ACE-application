import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [{ emit: 'event', level: 'query' }],
    });

    this.$on('query' as never, (event: any) => {
      if (event.duration < 150) return;

      const compactQuery = event.query.replace(/\s+/g, ' ').trim();
      this.logger.warn(
        `slow-query durationMs=${event.duration} query="${compactQuery.slice(0, 400)}"`,
      );
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma's typings don't currently expose the 'beforeExit' event, but it is emitted at runtime.
    this.$on('beforeExit' as never, async () => {
      await app.close();
    });
  }
}
