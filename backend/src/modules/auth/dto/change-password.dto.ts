import { IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsOptional()
  oldPassword?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, {
    message: 'Mật khẩu mới phải là số và tối thiểu 6 ký tự',
  })
  newPassword!: string;
}
