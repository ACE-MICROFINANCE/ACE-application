import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCustomerStubDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'Mã khách hàng chỉ được chứa chữ số.' })
  memberNo!: string;

  @IsOptional()
  @IsString()
  branchCode?: string | null;
}
