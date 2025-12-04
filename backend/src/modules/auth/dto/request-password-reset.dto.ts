import { IsNotEmpty, Matches, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsNotEmpty()
  @MinLength(6)
  @Matches(/^[0-9]+$/, { message: 'memberNo must be numeric' })
  memberNo!: string;
}
