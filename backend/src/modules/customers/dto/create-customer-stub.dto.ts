import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateCustomerStubDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Ma khach hang chi gom chu so' })
  memberNo!: string;
}
