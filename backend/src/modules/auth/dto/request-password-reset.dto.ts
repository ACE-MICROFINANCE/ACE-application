import { IsNotEmpty, Matches, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mã khách hàng chỉ gồm chữ số' })
  memberNo!: string;
}
