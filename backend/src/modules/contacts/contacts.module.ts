import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PublicController } from './public.controller';

@Module({
  providers: [ContactsService],
  controllers: [PublicController],
  exports: [ContactsService],
})
export class ContactsModule {}
