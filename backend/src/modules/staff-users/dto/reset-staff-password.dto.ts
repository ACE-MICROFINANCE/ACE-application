import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetStaffPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mat khau chi gom chu so va toi thieu 6 ky tu' })
  newPassword!: string;
}
