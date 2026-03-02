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
  @IsIn(['ADMIN', 'BA', 'BM'])
  role?: 'ADMIN' | 'BA' | 'BM';

  @IsString()
  @IsOptional()
  branchCode?: string | null;

  @IsString()
  @IsOptional()
  phoneNumber?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
