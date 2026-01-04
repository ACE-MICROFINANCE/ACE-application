import { Type } from 'class-transformer';

// CHANGED: update event DTO for staff RBAC
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EventTargetGroupDto } from './event-target-group.dto';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsIn(['BRANCH_ALL', 'GROUPS'])
  audienceType?: 'BRANCH_ALL' | 'GROUPS';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EventTargetGroupDto)
  targetGroups?: EventTargetGroupDto[];
}
