import { Controller, Get, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('public')
export class PublicController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('contacts')
  getContacts(@Query('branchCode') branchCode?: string) {
    return this.contactsService.getByBranchCode(branchCode);
  }
}
