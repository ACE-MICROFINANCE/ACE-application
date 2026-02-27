import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetFeatureUsageOverTimeDto {
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'year'])
  range?: 'daily' | 'weekly' | 'monthly' | 'year';

  @IsOptional()
  features?: string;

  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(8)
  limit?: number;
}

