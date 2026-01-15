import { IsBoolean } from 'class-validator';

export class UpdateCustomerLockDto {
  @IsBoolean()
  locked!: boolean;
}
