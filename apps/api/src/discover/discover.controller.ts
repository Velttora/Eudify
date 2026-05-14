import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/public.decorator';
import { parseDiscoverListQuery } from './discover-list-filters';
import { DiscoverService } from './discover.service';

@ApiTags('Discovery')
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  /** Listado público para el inicio (familias exploran sin sesión). */
  @Public()
  @Get('providers')
  list(
    @Query('kind') kind?: string,
    @Query('serviceMode') serviceMode?: string,
    @Query('city') city?: string,
    @Query('minYearsExperience') minYearsExperience?: string,
    @Query('minRating') minRating?: string,
    @Query('minReviewCount') minReviewCount?: string,
    @Query('focus') focus?: string,
    @Query('q') q?: string,
  ) {
    const filters = parseDiscoverListQuery({
      kind,
      serviceMode,
      city,
      minYearsExperience,
      minRating,
      minReviewCount,
      focus,
      q,
    });
    return this.discover.listAvailable(filters);
  }

  /** Perfil público del educador (página de ficha). */
  @Public()
  @Get('providers/:providerProfileId')
  getOne(@Param('providerProfileId') providerProfileId: string) {
    return this.discover.getPublicProfile(providerProfileId);
  }
}
