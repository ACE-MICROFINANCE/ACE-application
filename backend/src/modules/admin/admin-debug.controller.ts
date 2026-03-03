import {
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
// import { ForbiddenException, UseGuards } from '@nestjs/common'; // TODO: replaced by ACE Farmer implementation
// import { ConfigService } from '@nestjs/config'; // TODO: replaced by ACE Farmer implementation
// import { JwtAccessGuard } from '../../common/guards/jwt-access.guard'; // TODO: replaced by ACE Farmer implementation
// import { RolesGuard } from '../../common/guards/roles.guard'; // TODO: replaced by ACE Farmer implementation
// import { Roles } from '../../common/decorators/roles.decorator'; // TODO: replaced by ACE Farmer implementation
import { MemberDebugSyncService } from './member-debug-sync.service';
import { CustomerBootstrapSyncService } from '../customers/customer-bootstrap-sync.service';

@Controller('admin/debug')
// @UseGuards(JwtAccessGuard, RolesGuard) // TODO: replaced by ACE Farmer implementation
// @Roles('ADMIN') // TODO: replaced by ACE Farmer implementation
export class AdminDebugController {
  constructor(
    private readonly memberDebugSyncService: MemberDebugSyncService,
    private readonly customerBootstrapSyncService: CustomerBootstrapSyncService,
    // private readonly configService: ConfigService, // TODO: replaced by ACE Farmer implementation
  ) {}

  // private ensureDebugEnabled() {
  //   const env =
  //     this.configService.get<string>('nodeEnv') ?? process.env.NODE_ENV ?? 'development';
  //   if (env === 'production') {
  //     throw new ForbiddenException('Debug endpoint is disabled in production'); // CHANGED: disable in prod
  //   }
  // } // TODO: replaced by ACE Farmer implementation

  @Post('members/:memberNo/refresh')
  async refreshMember(@Param('memberNo') memberNo: string) {
    // this.ensureDebugEnabled(); // TODO: replaced by ACE Farmer implementation
    return this.memberDebugSyncService.refreshMember(memberNo);
  }

  @Get('members/:memberNo')
  async getMember(@Param('memberNo') memberNo: string) {
    // this.ensureDebugEnabled(); // TODO: replaced by ACE Farmer implementation
    return this.memberDebugSyncService.getMember(memberNo);
  }

  @Get('customers/sync-candidates')
  async getSyncCandidates(
    @Query('staleDays') staleDays?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerBootstrapSyncService.listSyncCandidates({
      staleDays: staleDays ? Number(staleDays) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('customers/sync-now')
  async syncNow(
    @Query('staleDays') staleDays?: string,
    @Query('maxCustomers') maxCustomers?: string,
  ) {
    return this.customerBootstrapSyncService.runManualSync({
      staleDays: staleDays ? Number(staleDays) : undefined,
      maxCustomers: maxCustomers ? Number(maxCustomers) : undefined,
    });
  }
}
