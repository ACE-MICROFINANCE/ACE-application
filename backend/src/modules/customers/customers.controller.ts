import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { CustomersService } from './customers.service';
import { RolesGuard } from '../../common/guards/roles.guard'; // CHANGED: staff RBAC
import { Roles } from '../../common/decorators/roles.decorator'; // CHANGED: staff RBAC
import { CreateCustomerStubDto } from './dto/create-customer-stub.dto'; // CHANGED: add stub endpoint
import { CreateCustomerAccountDto } from './dto/create-customer-account.dto'; // CHANGED: staff create account
import { ResetCustomerPasswordDto } from './dto/reset-customer-password.dto'; // CHANGED: staff reset password
import { UpdateCustomerLockDto } from './dto/update-customer-lock.dto'; // CHANGED: lock/unlock customer
import { UpdateCustomerAccessibilityDto } from './dto/update-customer-accessibility.dto'; // CHANGED: toggle accessibility
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateGroupRequestDto, UpdateGroupRequestDto } from './dto/create-group-request.dto';
import { RejectGroupRequestDto } from './dto/reject-group-request.dto';

@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.customersService.getActorProfile(req.user); // CHANGED: return profile by actorKind
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN') // CHANGED: /customers/stub chỉ dùng nội bộ, không cho FE gọi
  @Post('customers/stub')
  async createStub(@Req() req: any, @Body() dto: CreateCustomerStubDto) {
    const branchCode = req.user?.branchCode ?? dto.branchCode ?? null; // CHANGED: admin có thể truyền branchCode nếu cần
    return this.customersService.createCustomerStub(dto.memberNo, branchCode);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BA', 'BM')
  @Get('staff/groups')
  async listStaffGroups(@Req() req: any, @Query('branchCode') branchCode?: string) {
    return this.customersService.listStaffGroupsWithCounts(
      { role: req.user?.role, branchCode: req.user?.branchCode },
      branchCode,
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Post('staff/groups')
  async createGroup(@Req() req: any, @Body() dto: CreateGroupDto) {
    return this.customersService.createGroup(
      { role: req.user?.role, branchCode: req.user?.branchCode },
      dto,
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Patch('staff/groups/:id')
  async updateGroup(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.customersService.updateGroup(
      { role: req.user?.role, branchCode: req.user?.branchCode },
      Number(id),
      dto,
    );
  }

  // BA propose create group
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BA')
  @Post('staff/group-requests')
  async proposeCreate(@Req() req: any, @Body() dto: CreateGroupRequestDto) {
    const staffCtx: { id?: string | null; role?: string | null; branchCode?: string | null } = {
      id: req.user?.userId,
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    };
    return this.customersService.proposeCreateGroupRequest(
      staffCtx,
      dto,
    );
  }

  // BA propose update group
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BA')
  @Post('staff/group-requests/update')
  async proposeUpdate(@Req() req: any, @Body() dto: UpdateGroupRequestDto & { targetGroupId: number }) {
    const staffCtx: { id?: string | null; role?: string | null; branchCode?: string | null } = {
      id: req.user?.userId,
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    };
    return this.customersService.proposeUpdateGroupRequest(
      staffCtx,
      dto,
    );
  }

  // BA view own requests
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BA')
  @Get('staff/group-requests/mine')
  async myRequests(@Req() req: any) {
    const staffCtx: { id?: string | null; role?: string | null; branchCode?: string | null } = {
      id: req.user?.userId,
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    };
    return this.customersService.listMyGroupRequests(
      staffCtx,
    );
  }

  // BM list requests
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Get('staff/group-requests')
  async listRequests(@Req() req: any, @Query('status') status?: string, @Query('branchCode') branchCode?: string) {
    const staffCtx: { id?: string | null; role?: string | null; branchCode?: string | null } = {
      id: req.user?.userId,
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    };
    return this.customersService.listGroupRequestsForBranch(
      staffCtx,
      status,
      branchCode,
    );
  }

  // BM approve
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Post('staff/group-requests/:id/approve')
  async approveRequest(@Req() req: any, @Param('id') id: string) {
    const staffCtx: { id?: string | null; role?: string | null; branchCode?: string | null } = {
      id: req.user?.userId,
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    };
    return this.customersService.approveGroupRequest(
      staffCtx,
      Number(id),
    );
  }

  // BM reject
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Post('staff/group-requests/:id/reject')
  async rejectRequest(@Req() req: any, @Param('id') id: string, @Body() dto: RejectGroupRequestDto) {
    const staffCtx: { id?: string | null; role?: string | null; branchCode?: string | null } = {
      id: req.user?.userId,
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    };
    return this.customersService.rejectGroupRequest(
      staffCtx,
      Number(id),
      dto?.reason,
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BA', 'BM')
  @Get('staff/unmapped-groups')
  async listUnmapped(@Req() req: any, @Query() query: any) {
    return this.customersService.listUnmappedGroups(
      { role: req.user?.role, branchCode: req.user?.branchCode },
      { q: query.q, limit: query.limit ? Number(query.limit) : undefined, offset: query.offset ? Number(query.offset) : undefined },
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Post('staff/groups/:id/backfill')
  async backfillGroup(@Req() req: any, @Param('id') id: string) {
    return this.customersService.backfillGroup(
      { role: req.user?.role, branchCode: req.user?.branchCode },
      Number(id),
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'BM', 'BA') // allow BA manage/view customers
  @Get('staff/customers')
  async listStaffCustomers(@Req() req: any, @Query('q') q?: string) {
    return this.customersService.listCustomersForStaff(
      { role: req.user?.role, branchCode: req.user?.branchCode },
      q,
    ); // CHANGED: list/search customers for staff/admin
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'BM', 'BA') // allow BA view customer detail
  @Get('staff/customers/:memberNo')
  async getCustomerDetail(@Req() req: any, @Param('memberNo') memberNo: string) {
    return this.customersService.getCustomerDetailForStaff(memberNo, {
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    }); // CHANGED: return customer detail + temp password if pending
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'BM', 'BA') // allow BA create account
  @Post('staff/customers/accounts')
  async createCustomerAccount(@Req() req: any, @Body() dto: CreateCustomerAccountDto) {
    return this.customersService.createCustomerAccountForStaff(
      dto.memberNo,
      dto.initialPassword,
      { role: req.user?.role, branchCode: req.user?.branchCode },
    );
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'BM', 'BA') // allow BA reset password
  @Post('staff/customers/:memberNo/reset-password')
  async resetCustomerPassword(
    @Req() req: any,
    @Param('memberNo') memberNo: string,
    @Body() dto: ResetCustomerPasswordDto,
  ) {
    return this.customersService.resetCustomerPasswordForStaff(memberNo, dto.newPassword, {
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    });
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'BM', 'BA') // allow BA lock/unlock
  @Patch('staff/customers/:memberNo/lock')
  async lockCustomer(
    @Req() req: any,
    @Param('memberNo') memberNo: string,
    @Body() dto: UpdateCustomerLockDto,
  ) {
    return this.customersService.setCustomerLockForStaff(memberNo, dto.locked, {
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    });
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'BM', 'BA') // allow BA toggle accessibility
  @Patch('staff/customers/:memberNo/accessibility')
  async toggleAccessibility(
    @Req() req: any,
    @Param('memberNo') memberNo: string,
    @Body() dto: UpdateCustomerAccessibilityDto,
  ) {
    return this.customersService.setCustomerAccessibilityForStaff(memberNo, dto.enabled, {
      role: req.user?.role,
      branchCode: req.user?.branchCode,
    });
  }
}
