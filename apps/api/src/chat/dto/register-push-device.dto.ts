import { PushDevicePlatform } from '@repo/database';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushDeviceDto {
  @IsEnum(PushDevicePlatform)
  platform!: PushDevicePlatform;

  @IsString()
  @MinLength(12)
  @MaxLength(1024)
  token!: string;
}
