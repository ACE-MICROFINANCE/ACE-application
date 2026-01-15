import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateCustomerAccountDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mã khách hàng chỉ được chứa chữ số.' })
  memberNo!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mật khẩu chỉ được chứa chữ số và tối thiểu 6 ký tự.' })
  initialPassword!: string;
}
