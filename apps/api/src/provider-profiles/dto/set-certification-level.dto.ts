import { IsEnum, IsOptional } from 'class-validator';
import { ProviderCertificationLevel } from '@repo/database';

export class SetCertificationLevelDto {
  @IsOptional()
  @IsEnum(ProviderCertificationLevel)
  level?: ProviderCertificationLevel | null;
}
