import { IsOptional, IsString } from 'class-validator';

export class RejectGroupRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
