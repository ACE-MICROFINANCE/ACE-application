import { Type } from 'class-transformer';

// CHANGED: create event DTO for staff RBAC
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EventTargetGroupDto } from './event-target-group.dto';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  eventType!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsIn(['BRANCH_ALL', 'GROUPS'])
  audienceType!: 'BRANCH_ALL' | 'GROUPS';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EventTargetGroupDto)
  targetGroups?: EventTargetGroupDto[];
}
