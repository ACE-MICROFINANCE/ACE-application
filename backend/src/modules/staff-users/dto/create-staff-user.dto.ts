import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateStaffUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mat khau chi gom chu so va toi thieu 6 ky tu' })
  password?: string;

  @IsString()
  @IsIn(['ADMIN', 'BA', 'BM', 'SSO'])
  role!: 'ADMIN' | 'BA' | 'BM' | 'SSO';

  @IsString()
  @IsOptional()
  branchCode?: string | null;

  @IsString()
  @IsOptional()
  fullName?: string | null;

  @IsString()
  @IsOptional()
  phoneNumber?: string | null;
}
