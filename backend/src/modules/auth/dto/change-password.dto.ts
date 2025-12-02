import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'oldPassword must be numeric and at least 6 digits' })
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'newPassword must be numeric and at least 6 digits' })
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'confirmPassword must be numeric and at least 6 digits' })
  confirmPassword!: string;
}
