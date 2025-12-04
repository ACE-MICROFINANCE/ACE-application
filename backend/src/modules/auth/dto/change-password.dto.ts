import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mật khẩu hiện tại phải là số và tối thiểu 6 ký tự' })
  oldPassword?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mật khẩu mới phải là số và tối thiểu 6 ký tự' })
  newPassword!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mật khẩu xác nhận phải là số và tối thiểu 6 ký tự' })
  confirmPassword?: string;
}
