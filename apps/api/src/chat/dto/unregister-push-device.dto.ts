import { IsString, MaxLength, MinLength } from 'class-validator';

export class UnregisterPushDeviceDto {
  @IsString()
  @MinLength(12)
  @MaxLength(1024)
  token!: string;
}
