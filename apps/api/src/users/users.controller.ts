import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { SetRoleDto } from './dto/set-role.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Crea o actualiza el usuario interno a partir del JWT de Clerk. */
  @Post('sync')
  async sync(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    const user = await this.users.syncFromClerk(clerk.clerkUserId);
    const bootstrap = await this.users.getBootstrap(clerk.clerkUserId);
    return { user, bootstrap };
  }

  @Get('me')
  async me(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.users.findByClerkOrThrow(clerk.clerkUserId);
  }

  @Get('bootstrap')
  async bootstrap(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.users.getBootstrap(clerk.clerkUserId);
  }

  @Post('role')
  async setRole(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: SetRoleDto,
  ) {
    await this.users.setRole(clerk.clerkUserId, dto.role);
    return this.users.getBootstrap(clerk.clerkUserId);
  }
}
