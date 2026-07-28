import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CompleteModuleDto {
  @IsString()
  @MinLength(1)
  childProfileId!: string;

  @IsInt()
  @Min(1)
  @Max(26)
  moduleNumber!: number;
}
