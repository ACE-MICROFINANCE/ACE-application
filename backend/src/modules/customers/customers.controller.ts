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
  async listStaffGroups(@Req() req: any) {
    return this.customersService.getGroupsForBranch(req.user?.branchCode); // CHANGED: list groups by staff branch
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
