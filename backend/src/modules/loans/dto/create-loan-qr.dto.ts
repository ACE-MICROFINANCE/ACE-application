import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLoanQrDto {
  @Type(() => Number) // CHANGED: cast to number for validation
  @IsNumber({}, { message: 'Số tiền không hợp lệ' }) // CHANGED: message tiếng Việt
  amount!: number;
}
