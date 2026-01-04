import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateStaffUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mat khau chi gom chu so va toi thieu 6 ky tu' })
  password!: string;

  @IsString()
  @IsIn(['ADMIN', 'BRANCH_MANAGER'])
  role!: 'ADMIN' | 'BRANCH_MANAGER';

  @IsString()
  @IsOptional()
  branchCode?: string | null;

  @IsString()
  @IsOptional()
  fullName?: string | null;
}
