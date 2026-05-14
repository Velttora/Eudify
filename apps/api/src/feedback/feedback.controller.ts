import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/public.decorator';
import { MailService } from '../mail/mail.service';
import { PostFeedbackDto } from './dto/post-feedback.dto';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly mail: MailService) {}

  @Public()
  @Post()
  async post(@Body() dto: PostFeedbackDto) {
    await this.mail.notifyPublicFeedback({
      kind: dto.kind,
      message: dto.message.trim(),
      contactEmail: dto.contactEmail?.trim() || null,
      sourcePath: dto.sourcePath?.trim() || null,
      clerkUserIdHint: dto.clerkUserIdHint?.trim() || null,
    });
    return { ok: true as const };
  }
}
