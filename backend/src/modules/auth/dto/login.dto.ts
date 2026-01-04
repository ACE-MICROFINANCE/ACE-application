import { IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((o) => !o.memberNo)
  @IsString()
  @IsNotEmpty()
  identifier!: string; // CHANGED: email (staff) or memberNo (customer)

  @ValidateIf((o) => !o.identifier)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Ma khach hang chi gom chu so' })
  memberNo?: string; // CHANGED: backward-compatible input

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mat khau chi gom chu so va toi thieu 6 ky tu' })
  password!: string;
}

