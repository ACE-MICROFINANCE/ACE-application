import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateGroupRequestDto {
  @IsString()
  @IsNotEmpty()
  groupName!: string;

  @IsOptional()
  @IsString()
  groupCode?: string;
}

export class UpdateGroupRequestDto {
  @IsNumber()
  @IsNotEmpty()
  targetGroupId!: number;

  @IsString()
  @IsNotEmpty()
  groupName!: string;

  @IsOptional()
  @IsString()
  groupCode?: string;
}
