import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mã khách hàng chỉ gồm chữ số' })
  memberNo!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mật khẩu phải là số và tối thiểu 6 ký tự' })
  password!: string;
}
