import { IsEmail, IsNotEmpty } from 'class-validator';

export class StaffForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
