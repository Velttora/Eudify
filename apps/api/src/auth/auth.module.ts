import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ClerkAuthGuard } from './clerk-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    RolesGuard,
  ],
  exports: [RolesGuard],
})
export class AuthModule {}
