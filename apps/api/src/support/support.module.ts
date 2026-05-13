import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { SupportAdminController } from './support-admin.controller';
import { SupportResolutionService } from './support-resolution.service';
import { SupportService } from './support.service';
import { SupportTicketsController } from './tickets.controller';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [SupportTicketsController, SupportAdminController],
  providers: [SupportService, SupportResolutionService],
  exports: [SupportService],
})
export class SupportModule {}
