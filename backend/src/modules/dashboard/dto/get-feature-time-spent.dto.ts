import { IsIn, IsOptional } from 'class-validator';

export class GetFeatureTimeSpentDto {
  @IsOptional()
  @IsIn(['weekly', 'monthly', 'yearly'])
  range?: 'weekly' | 'monthly' | 'yearly';

  @IsOptional()
  features?: string;
}

