import { IsOptional, IsString } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  branchCode?: string;

  @IsOptional()
  @IsString()
  groupCode?: string;

  @IsOptional()
  @IsString()
  groupName?: string;
}
