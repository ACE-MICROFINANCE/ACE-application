import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateStaffUserDto {
  @IsString()
  @IsOptional()
  fullName?: string | null;

  @IsEmail()
  @IsOptional()
  email?: string | null; // CHANGED: allow update email

  @IsString()
  @IsOptional()
  @IsIn(['ADMIN', 'BRANCH_MANAGER'])
  role?: 'ADMIN' | 'BRANCH_MANAGER';

  @IsString()
  @IsOptional()
  branchCode?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
