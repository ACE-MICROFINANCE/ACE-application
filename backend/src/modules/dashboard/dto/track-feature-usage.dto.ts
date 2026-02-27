import { IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class TrackFeatureUsageDto {
  @IsString()
  @MaxLength(80)
  featureKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  eventType?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientEventId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  durationSeconds?: number;
}
