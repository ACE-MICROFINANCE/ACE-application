import { IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((o) => !o.memberNo)
  @IsString()
  @IsNotEmpty()
  identifier!: string; // email (staff) or memberNo (customer)

  @ValidateIf((o) => !o.identifier)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mã khách hàng chỉ được chứa chữ số.' })
  memberNo?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mật khẩu chỉ được chứa chữ số và tối thiểu 6 ký tự.' })
  password!: string;
}
