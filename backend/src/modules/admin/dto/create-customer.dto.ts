import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'memberNo must contain digits only' })
  memberNo!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  idCardNumber?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  locationType?: string;

  @IsString()
  @IsOptional()
  villageName?: string;

  @IsString()
  @IsOptional()
  groupCode?: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsDateString()
  @IsOptional()
  membershipStartDate?: string;
}
