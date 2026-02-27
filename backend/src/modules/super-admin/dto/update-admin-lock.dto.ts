import { IsBoolean } from 'class-validator';

export class UpdateAdminLockDto {
  @IsBoolean()
  locked!: boolean;
}

