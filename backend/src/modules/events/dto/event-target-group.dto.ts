import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// CHANGED: event target group DTO

export class EventTargetGroupDto {
  @IsString()
  @IsNotEmpty()
  groupCode!: string;

  @IsOptional()
  @IsString()
  groupName?: string;
}
