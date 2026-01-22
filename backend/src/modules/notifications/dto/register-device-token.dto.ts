import { IsIn, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  token!: string;

  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';
}
