import { IsEnum } from 'class-validator';
import { ConsumerPlan } from '@repo/database';

export class SubscribeDto {
  @IsEnum(ConsumerPlan)
  plan!: ConsumerPlan;
}
