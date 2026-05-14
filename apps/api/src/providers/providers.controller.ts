import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { ProvidersService } from './providers.service';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get(':providerProfileId')
  detail(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('providerProfileId') providerProfileId: string,
  ) {
    return this.providers.getAuthenticatedDetail(
      clerk.clerkUserId,
      providerProfileId,
    );
  }
}
