import { IsBoolean } from 'class-validator';

export class UpdateCustomerAccessibilityDto {
  @IsBoolean()
  enabled!: boolean;
}
