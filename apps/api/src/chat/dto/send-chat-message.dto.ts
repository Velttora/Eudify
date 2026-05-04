import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientMessageId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;
}
