import { Body, Controller, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SetCertificationLevelDto } from './dto/set-certification-level.dto';

@ApiTags('Admin Provider Profiles')
@Controller('admin/providers')
@Roles('ADMIN')
@UseGuards(RolesGuard)
export class ProviderProfilesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch(':providerProfileId/certification')
  async setCertificationLevel(
    @Param('providerProfileId') providerProfileId: string,
    @Body() dto: SetCertificationLevelDto,
  ) {
    const existing = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Provider profile not found');
    }
    return this.prisma.providerProfile.update({
      where: { id: providerProfileId },
      data: { certificationLevel: dto.level ?? null },
      select: { id: true, certificationLevel: true, fullName: true },
    });
  }
}
