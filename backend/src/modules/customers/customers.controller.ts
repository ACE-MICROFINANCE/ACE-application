import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('customers')
export class CustomersController {
  @Get()
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  // TODO: Admin-only customer management endpoints can be implemented here.
  listPlaceholder() {
    return { message: 'Customer admin endpoints are not implemented yet.' };
  }
}
