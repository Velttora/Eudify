import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const LEARNING_CATEGORY_IDS = [
  'LANGUAGES',
  'NUTRITION',
  'NATURE_CONNECTION',
  'WOODWORKING',
  'ART_CREATIVITY',
  'MOVEMENT_BODY',
] as const;

const PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
const ITEM_SOURCES = ['scientific_template', 'course', 'custom'] as const;

export class PlannerChildSnapshotDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  birthDate!: string;

  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  interests!: string[];

  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  goals!: string[];

  @IsInt()
  @Min(0)
  @Max(7 * 24 * 60)
  weeklyMinutesAvailable!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  learningPreferenceTags?: string[];
}

export class SaveLearningPlanItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  id!: string;

  @IsIn(ITEM_SOURCES)
  source!: (typeof ITEM_SOURCES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  scientificTemplateBlockId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  courseId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsInt()
  @Min(0)
  @Max(500)
  order!: number;

  @IsString()
  @MaxLength(8000)
  rationale!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7 * 24 * 60)
  suggestedWeeklyMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(240, { each: true })
  milestoneLabels?: string[];
}

export class SaveLearningPlanDto {
  @ValidateNested()
  @Type(() => PlannerChildSnapshotDto)
  @IsObject()
  child!: PlannerChildSnapshotDto;

  @IsIn(LEARNING_CATEGORY_IDS)
  categoryId!: (typeof LEARNING_CATEGORY_IDS)[number];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsIn(PLAN_STATUSES)
  status?: (typeof PLAN_STATUSES)[number];

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaveLearningPlanItemDto)
  items!: SaveLearningPlanItemDto[];
}
