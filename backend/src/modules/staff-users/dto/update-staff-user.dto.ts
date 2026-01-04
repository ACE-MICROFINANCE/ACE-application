import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateStaffUserDto {
  @IsString()
  @IsOptional()
  fullName?: string | null;

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
