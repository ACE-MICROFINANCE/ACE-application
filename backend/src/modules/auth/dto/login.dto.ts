import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, { message: 'Mã khách hàng phải là số' })
  customerId!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6,}$/, { message: 'Mật khẩu phải là số và tối thiểu 6 ký tự' })
  password!: string;
}
