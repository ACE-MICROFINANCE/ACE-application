import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { CustomersService } from './customers.service';
import { RolesGuard } from '../../common/guards/roles.guard'; // CHANGED: staff RBAC
import { Roles } from '../../common/decorators/roles.decorator'; // CHANGED: staff RBAC
import { CreateCustomerStubDto } from './dto/create-customer-stub.dto'; // CHANGED: add stub endpoint

@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(JwtAccessGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.customersService.getActorProfile(req.user); // CHANGED: return profile by actorKind
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @Post('customers/stub')
  async createStub(@Req() req: any, @Body() dto: CreateCustomerStubDto) {
    const branchCode = req.user?.branchCode;
    return this.customersService.createCustomerStub(dto.memberNo, branchCode);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @Get('staff/groups')
  async listStaffGroups(@Req() req: any) {
    return this.customersService.getGroupsForBranch(req.user?.branchCode); // CHANGED: list groups by staff branch
  }
}
