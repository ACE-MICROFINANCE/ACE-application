import { Controller, Get, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('public')
export class PublicController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('contacts')
  async getContacts(@Query('branchCode') branchCode?: string, @Query('groupName') groupName?: string) {
    return this.contactsService.getByBranchCode(branchCode, groupName);
  }
}
