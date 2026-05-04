import { IsString } from 'class-validator';

export class MarkChatReadDto {
  @IsString()
  messageId!: string;
}
