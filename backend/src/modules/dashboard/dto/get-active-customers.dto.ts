import { IsIn, IsOptional } from 'class-validator';

export class GetActiveCustomersDto {
  @IsOptional()
  @IsIn(['weekly', 'monthly', 'yearly'])
  range?: 'weekly' | 'monthly' | 'yearly';
}

