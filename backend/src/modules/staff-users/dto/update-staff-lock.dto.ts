import { IsBoolean } from 'class-validator';

export class UpdateStaffLockDto {
  @IsBoolean()
  locked!: boolean;
}
